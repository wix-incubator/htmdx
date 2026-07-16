// React-only htmdx runtime. HTMDX source renders through React everywhere:
// built-ins are React components, the shadcn/ui pack is included, and
// compile() produces a static HTML snapshot of the same tree.
import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { shadcnComponents } from './components/shadcn';
import { escapeHtml } from './react/rendering';
import {
  builtInReactComponents,
  compileDocument,
  tokenizeSource,
  type HtmdxReactComponent,
  type HtmdxReactComponents,
} from './react';
import { THEME_CSS } from './themes';
import { VERSION } from './version';

export { THEME_IDS, type HtmdxThemeId } from './themes';
export { VERSION } from './version';
export { injectShadcnTheme, shadcnComponents } from './components/shadcn';
export {
  builtInReactComponents,
  compileDocument,
  compileToReact,
  Htmdx,
  listComponents,
  type HtmdxReactComponent,
  type HtmdxReactComponents,
} from './react';

export type HtmdxToken =
  | { type: 'markdown'; value: string }
  | { type: 'component'; name: string; body: string };

export type HtmdxCompileResult =
  | { ok: true; html: string; components: string[] }
  | { ok: false; error: string };

export type HtmdxThemeDefinition = {
  id?: string;
  css: string;
};

export type HtmdxCompileOptions = {
  components?: HtmdxReactComponents;
};

export type HtmdxExtensionOptions = {
  rerender?: boolean;
};

export type HtmdxSourceResult =
  | { ok: true; kind: 'embedded' | 'src'; source: string }
  | { ok: false; error: string; source?: string };

export type HtmdxRegisterOptions = {
  tagName?: string;
  sourceSelector?: string;
  theme?: HtmdxThemeDefinition;
  tailwind?: boolean | { src?: string };
  automount?: boolean;
} & HtmdxCompileOptions;

const STYLE_ID = 'htmdx-runtime-v1-styles';
const FONTS_LINK_ID = 'htmdx-fonts';
const TAILWIND_SCRIPT_ID = 'htmdx-tailwind-browser';
export const DEFAULT_TAG_NAME = 'htmdx-code';
export const DEFAULT_TAILWIND_BROWSER_SRC = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
const DEFAULT_SOURCE_SELECTOR = 'script[type="text/htmdx"], template[type="text/htmdx"]';

const globalReactComponents: HtmdxReactComponents = {};
const registeredTagNames = new Set([DEFAULT_TAG_NAME]);
const sourceCache = new WeakMap<Element, HtmdxSourceResult & { ok: true }>();

type HostRoot = { root: Root; renderError: { current: unknown } };
const reactRoots = new WeakMap<Element, HostRoot>();
const stickyObservers = new WeakMap<Element, IntersectionObserver>();

function componentsFor(options: HtmdxCompileOptions): HtmdxReactComponents {
  return {
    ...builtInReactComponents,
    ...shadcnComponents,
    ...globalReactComponents,
    ...options.components,
  };
}

export function compile(source: string, options: HtmdxCompileOptions = {}): HtmdxCompileResult {
  try {
    const doc = compileDocument(source, { components: componentsFor(options) });
    return {
      ok: true,
      html: renderStaticHtml(doc.element),
      components: doc.components,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Static snapshot through the client renderer on a detached container.
// react-dom/server is deliberately not used: the client path keeps ~57KB
// gzip out of the browser bundle and shares one render pipeline with
// renderHost (including onUncaughtError-based error capture).
function renderStaticHtml(element: ReactElement): string {
  if (!globalThis.document) {
    throw new Error('compile requires a DOM (browser or jsdom)');
  }

  const container = document.createElement('div');
  let caught: unknown = null;
  const root = createRoot(container, {
    onUncaughtError: (error) => {
      caught = error;
    },
  });
  try {
    flushSync(() => root.render(element));
    if (caught) {
      throw caught;
    }
    return container.innerHTML;
  } finally {
    root.unmount();
  }
}

// Extension API: register React components globally. Host-owned code only;
// the HTMDX source itself stays declarative data.
export function registerComponent(
  name: string,
  component: HtmdxReactComponent,
  options: HtmdxExtensionOptions = {},
) {
  assertComponentName(name);
  globalReactComponents[name] = component;
  if (options.rerender !== false) {
    return rerender();
  }
  return Promise.resolve();
}

export function registerComponents(
  components: HtmdxReactComponents,
  options: HtmdxExtensionOptions = {},
) {
  for (const [name, component] of Object.entries(components)) {
    assertComponentName(name);
    globalReactComponents[name] = component;
  }
  if (options.rerender !== false) {
    return rerender();
  }
  return Promise.resolve();
}

export function registerTheme(theme: HtmdxThemeDefinition, options: HtmdxExtensionOptions = {}) {
  injectThemeStyle(theme);
  if (options.rerender === true) {
    return rerender();
  }
  return Promise.resolve();
}

export function rerender(options: Pick<HtmdxRegisterOptions, 'tagName' | 'sourceSelector'> = {}) {
  if (!globalThis.document) {
    return Promise.resolve([]);
  }

  const tagNames = options.tagName ? [options.tagName] : Array.from(registeredTagNames);
  const hosts = tagNames.flatMap((tagName) => Array.from(document.querySelectorAll(tagName)));
  return Promise.all(hosts.map((host) => renderHost(host, options)));
}

export function register(options: HtmdxRegisterOptions = {}) {
  if (!globalThis.document || !globalThis.customElements) {
    return;
  }

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = RUNTIME_CSS + THEME_CSS;
    document.head.append(style);
  }
  injectFonts();
  injectTailwindBrowser(options.tailwind);
  injectThemeStyle(options.theme);

  const tagName = options.tagName || DEFAULT_TAG_NAME;
  registeredTagNames.add(tagName);
  if (!customElements.get(tagName)) {
    customElements.define(
      tagName,
      class HtmdxElement extends HTMLElement {
        async connectedCallback() {
          await renderHost(this, options);
        }

        disconnectedCallback() {
          const hostRoot = reactRoots.get(this);
          if (hostRoot) {
            reactRoots.delete(this);
            hostRoot.root.unmount();
          }
        }
      },
    );
  }

  if (options.automount !== false) {
    mountBareSources(tagName, options);
  }
}

function mountBareSources(tagName: string, options: HtmdxRegisterOptions) {
  // Script ran in <head> without defer; retry once the document is parsed so
  // bare sources still mount instead of failing silently.
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', () => mountBareSources(tagName, options), {
      once: true,
    });
    return;
  }

  const selector = options.sourceSelector || DEFAULT_SOURCE_SELECTOR;
  const sources =
    queryAllSafe(document.body, selector) || queryAllSafe(document.body, DEFAULT_SOURCE_SELECTOR);
  const hostSelector = Array.from(registeredTagNames).join(', ');
  for (const source of sources || []) {
    if (source.closest(hostSelector)) {
      continue;
    }

    const host = document.createElement(tagName);
    const src = source.getAttribute('src');
    if (src) {
      host.setAttribute('src', src);
    }

    // The host is assembled before it enters the document because
    // connectedCallback reads the source synchronously on insertion.
    const marker = document.createComment('htmdx-source');
    source.replaceWith(marker);
    host.append(source);
    marker.replaceWith(host);
  }
}

export async function renderHost(host: Element, options: HtmdxRegisterOptions = {}) {
  const sourceResult = await resolveSource(host, options);

  if (!sourceResult.ok) {
    renderError(host, sourceResult.error, sourceResult.source || '');
    host.dispatchEvent(
      new CustomEvent('htmdx:error', {
        detail: { ok: false, phase: 'source', error: sourceResult.error },
        bubbles: true,
      }),
    );
    return;
  }

  sourceCache.set(host, sourceResult);

  try {
    const doc = compileDocument(sourceResult.source, { components: componentsFor(options) });
    let hostRoot = reactRoots.get(host);
    if (!hostRoot) {
      // The embedded source element is consumed here; the source is cached
      // above, so rerenders keep working.
      host.innerHTML = '';
      const renderErrorBox: HostRoot['renderError'] = { current: null };
      hostRoot = {
        root: createRoot(host, {
          // React roots swallow render errors instead of throwing; capture
          // them so the error fallback below still works.
          onUncaughtError: (error) => {
            renderErrorBox.current = error;
          },
        }),
        renderError: renderErrorBox,
      };
      reactRoots.set(host, hostRoot);
    }
    hostRoot.renderError.current = null;
    flushSync(() => hostRoot.root.render(doc.element));
    if (hostRoot.renderError.current) {
      throw hostRoot.renderError.current;
    }
    activateSectionRail(host);
    activateStickyHeader(host);
    host.dispatchEvent(
      new CustomEvent('htmdx:rendered', {
        detail: { source: sourceResult.kind, components: doc.components, version: VERSION },
        bubbles: true,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hostRoot = reactRoots.get(host);
    if (hostRoot) {
      reactRoots.delete(host);
      hostRoot.root.unmount();
    }
    renderError(host, message, sourceResult.source);
    host.dispatchEvent(
      new CustomEvent('htmdx:error', {
        detail: { ok: false, error: message },
        bubbles: true,
      }),
    );
  }
}

export async function resolveSource(
  host: Element,
  options: HtmdxRegisterOptions = {},
): Promise<HtmdxSourceResult> {
  const src = host.getAttribute('src');
  if (src) {
    try {
      const response = await fetch(src);
      if (!response.ok) {
        return {
          ok: false,
          error: `src returned HTTP ${response.status}`,
          source: fallbackSource(host, options),
        };
      }
      return { ok: true, kind: 'src', source: await response.text() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `src failed: ${message}`, source: fallbackSource(host, options) };
    }
  }

  const sourceElement = querySourceElement(host, options);
  if (!sourceElement) {
    const cached = sourceCache.get(host);
    return cached || { ok: false, error: 'missing HTMDX source' };
  }

  return { ok: true, kind: 'embedded', source: readSourceElement(sourceElement) };
}

function activateSectionRail(root: Element) {
  if (!globalThis.window || !globalThis.document) {
    return;
  }

  const links = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('.htmdx-toc-link[data-htmdx-target]'),
  );
  const heads = links
    .map((link) => root.querySelector<HTMLElement>(idSelector(link.dataset.htmdxTarget || '')))
    .filter((heading): heading is HTMLElement => Boolean(heading));
  if (heads.length < 2) {
    return;
  }

  const setActive = (id: string) => {
    for (const link of links) {
      link.parentElement?.classList.toggle('is-active', link.dataset.htmdxTarget === id);
    }
  };

  // While a click-triggered smooth scroll is in flight, the indicator is
  // locked to the clicked section so scroll-spy doesn't flicker through the
  // sections it passes over on the way there.
  let pending: string | null = null;
  let ticking = false;
  const onScroll = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(() => {
      // The frame can fire after a test environment tears the window down.
      if (!globalThis.window) {
        ticking = false;
        return;
      }
      const threshold = window.innerHeight * 0.25;
      let current = heads[0].id;
      for (const heading of heads) {
        if (heading.getBoundingClientRect().top <= threshold) {
          current = heading.id;
        }
      }
      if (pending) {
        // Release the lock once the scroll reaches the clicked section.
        if (current === pending) {
          pending = null;
        }
      } else {
        setActive(current);
      }
      ticking = false;
    });
  };

  for (const link of links) {
    link.addEventListener('click', (event) => {
      const id = link.dataset.htmdxTarget || '';
      const target = root.querySelector<HTMLElement>(idSelector(id));
      if (target) {
        event.preventDefault();
        pending = id;
        setActive(id);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        setActive(id);
      }
    });
  }

  // `scrollend` isn't guaranteed everywhere; the current === pending check in
  // onScroll is the primary release, this just covers targets that can't reach
  // the threshold (e.g. the last section near the bottom of the page).
  window.addEventListener('scrollend', () => {
    pending = null;
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Reveal the condensed sticky header once the hero has scrolled out of view.
// An IntersectionObserver on the hero is cheaper and jank-free versus a scroll
// handler; falls back to always-hidden where IntersectionObserver is absent.
function activateStickyHeader(root: Element) {
  if (!globalThis.window || !globalThis.document) {
    return;
  }

  const header = root.querySelector<HTMLElement>('.htmdx-sticky-header');
  const hero = root.querySelector<HTMLElement>('.htmdx-hero');
  if (!header || !hero) {
    return;
  }

  if (typeof IntersectionObserver !== 'function') {
    return;
  }

  stickyObservers.get(root)?.disconnect();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        header.classList.toggle('is-visible', !entry.isIntersecting);
      }
    },
    { rootMargin: '-1px 0px 0px 0px' },
  );
  observer.observe(hero);
  stickyObservers.set(root, observer);
}

export function tokenizeBlocks(source: string, options: HtmdxCompileOptions = {}): HtmdxToken[] {
  return tokenizeSource(source, componentsFor(options));
}

export function canonicalComponentName(name: string, options: HtmdxCompileOptions = {}) {
  for (const known of Object.keys(componentsFor(options))) {
    if (known.toLowerCase() === name.toLowerCase()) {
      return known;
    }
  }
  return name;
}

function querySourceElement(host: Element, options: HtmdxRegisterOptions) {
  const selector =
    host.getAttribute('source-selector') || options.sourceSelector || DEFAULT_SOURCE_SELECTOR;
  return querySelectorSafe(host, selector) || querySelectorSafe(host, DEFAULT_SOURCE_SELECTOR);
}

function querySelectorSafe(root: Element, selector: string) {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function queryAllSafe(root: Element, selector: string) {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return null;
  }
}

function fallbackSource(host: Element, options: HtmdxRegisterOptions) {
  const sourceElement = querySourceElement(host, options);
  return sourceElement ? readSourceElement(sourceElement) : '';
}

function readSourceElement(element: Element) {
  return element instanceof HTMLTemplateElement
    ? element.innerHTML.trim()
    : element.textContent?.trim() || '';
}

function renderError(host: Element, error: string, source: string) {
  host.innerHTML = [
    `<div class="htmdx-error">Renderer fallback: ${escapeHtml(error)}</div>`,
    `<pre class="htmdx-raw-source">${escapeHtml(source || 'No HTMDX source was available.')}</pre>`,
  ].join('');
}

function assertComponentName(name: string) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
    throw new Error(`invalid component name "${name}"`);
  }
}

function injectThemeStyle(theme: HtmdxThemeDefinition | undefined) {
  if (!theme || !theme.css) {
    return;
  }

  const id = `htmdx-theme-${theme.id || 'custom'}`;
  if (document.getElementById(id)) {
    return;
  }

  const style = document.createElement('style');
  style.id = id;
  style.textContent = theme.css;
  document.head.append(style);
}

function injectFonts() {
  if (!globalThis.document || document.getElementById(FONTS_LINK_ID)) {
    return;
  }

  const preconnectGstatic = document.createElement('link');
  preconnectGstatic.rel = 'preconnect';
  preconnectGstatic.href = 'https://fonts.gstatic.com';
  preconnectGstatic.crossOrigin = 'anonymous';
  document.head.append(preconnectGstatic);

  const preconnectApis = document.createElement('link');
  preconnectApis.rel = 'preconnect';
  preconnectApis.href = 'https://fonts.googleapis.com';
  document.head.append(preconnectApis);

  const fonts = document.createElement('link');
  fonts.id = FONTS_LINK_ID;
  fonts.rel = 'stylesheet';
  fonts.href =
    'https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap';
  document.head.append(fonts);
}

function injectTailwindBrowser(tailwind: HtmdxRegisterOptions['tailwind'] = true) {
  if (tailwind === false) {
    return;
  }
  if (document.getElementById(TAILWIND_SCRIPT_ID)) {
    return;
  }
  if (document.querySelector('script[src*="@tailwindcss/browser"]')) {
    return;
  }

  const script = document.createElement('script');
  script.id = TAILWIND_SCRIPT_ID;
  script.src =
    typeof tailwind === 'object' && tailwind.src ? tailwind.src : DEFAULT_TAILWIND_BROWSER_SRC;
  script.defer = true;
  document.head.append(script);
}

// Attribute selector instead of #id: slugs can start with a digit
// (`## 1. Overview` -> id "1-overview"), which is invalid in an id selector.
function idSelector(id: string) {
  return `[id="${id.replace(/["\\]/g, '\\$&')}"]`;
}

const RUNTIME_CSS = `
  :root {
    color-scheme: light;

    --md-sys-color-primary: #6D4DE8;
    --md-sys-color-on-primary: #FFFFFF;
    --md-sys-color-primary-container: #E2E0FB;
    --md-sys-color-on-primary-container: #1E0060;
    --md-sys-color-secondary: #625B71;
    --md-sys-color-on-secondary: #FFFFFF;
    --md-sys-color-secondary-container: #E8DEF8;
    --md-sys-color-on-secondary-container: #1D192B;
    --md-sys-color-tertiary: #7D5260;
    --md-sys-color-on-tertiary: #FFFFFF;
    --md-sys-color-tertiary-container: #FFD8E4;
    --md-sys-color-on-tertiary-container: #31111D;
    --md-sys-color-error: #B3261E;
    --md-sys-color-on-error: #FFFFFF;
    --md-sys-color-error-container: #F9DEDC;
    --md-sys-color-on-error-container: #410E0B;
    --md-sys-color-surface: #FDFBFF;
    --md-sys-color-on-surface: #1B1B1F;
    --md-sys-color-surface-variant: #E4E1EC;
    --md-sys-color-on-surface-variant: #47464F;
    --md-sys-color-outline: #78767F;
    --md-sys-color-outline-variant: #E3DFE7;
    --md-sys-color-surface-container-lowest: #FFFFFF;
    --md-sys-color-surface-container-low: #F6F3FB;
    --md-sys-color-surface-container: #F6F1FA;
    --md-sys-color-surface-container-high: #EAE7F0;
    --md-sys-color-surface-container-highest: #E5E1EA;
    --md-sys-color-nav-surface: #F3ECEE;
    --md-sys-color-nav-active-container: #DCDAF7;
    --md-sys-color-on-nav-active-container: #24172C;
    --md-sys-color-shadow: #000000;

    --md-ref-typeface-brand: "Figtree", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
    --md-ref-typeface-plain: "Roboto", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;

    --md-sys-shape-corner-none: 0;
    --md-sys-shape-corner-small: 8px;
    --md-sys-shape-corner-medium: 16px;
    --md-sys-shape-corner-large: 20px;
    --md-sys-shape-corner-extra-large: 28px;
    --md-sys-shape-corner-full: 9999px;

    --md-sys-elevation-level0: none;
    --md-sys-elevation-level1: 0px 1px 2px rgba(0,0,0,0.28), 0px 1px 3px 1px rgba(0,0,0,0.12);
    --md-sys-elevation-level2: 0px 1px 2px rgba(0,0,0,0.28), 0px 2px 6px 2px rgba(0,0,0,0.12);
    --md-sys-elevation-level3: 0px 4px 8px 3px rgba(0,0,0,0.12), 0px 1px 3px rgba(0,0,0,0.28);

    --md-sys-state-hover-opacity: 0.08;
    --md-sys-state-focus-opacity: 0.12;

    --htmdx-bg: var(--md-sys-color-surface);
    --htmdx-ink: var(--md-sys-color-on-surface);
    --htmdx-body: var(--md-sys-color-on-surface-variant);
    --htmdx-soft: var(--md-sys-color-on-surface-variant);
    --htmdx-line: var(--md-sys-color-outline-variant);
    --htmdx-line-strong: var(--md-sys-color-outline);
    --htmdx-panel: var(--md-sys-color-surface-container);
    --htmdx-accent: var(--md-sys-color-primary);
    --htmdx-accent-soft: var(--md-sys-color-primary-container);
    --htmdx-accent-edge: var(--md-sys-color-primary-container);
    --htmdx-green: var(--md-sys-color-secondary);
    --htmdx-green-bg: var(--md-sys-color-secondary-container);
    --htmdx-amber: var(--md-sys-color-tertiary);
    --htmdx-amber-bg: var(--md-sys-color-tertiary-container);
    --htmdx-gray: var(--md-sys-color-on-surface-variant);
    --htmdx-gray-light: var(--md-sys-color-outline);
    --htmdx-gray-bg: var(--md-sys-color-surface-variant);
    --htmdx-red: var(--md-sys-color-error);
    --htmdx-red-bg: var(--md-sys-color-error-container);
    --htmdx-font: var(--md-ref-typeface-plain);
    --htmdx-mono: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace;

    /* Keep the bundled shadcn pack on the same active M3 palette. */
    --primary: var(--md-sys-color-primary);
    --primary-foreground: var(--md-sys-color-on-primary);
    --ring: var(--md-sys-color-primary);
    --accent: var(--md-sys-color-primary-container);
    --accent-foreground: var(--md-sys-color-on-primary-container);
  }

  htmdx-code {
    display: block;
    background: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);
    font-family: var(--md-ref-typeface-plain);
    font-size: 16px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }

  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

  .htmdx-app {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    min-height: 100vh;
    background: var(--md-sys-color-surface);
  }
  .htmdx-app--no-nav { grid-template-columns: minmax(0, 1fr); }

  .htmdx-toc {
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    overflow-y: auto;
    background: var(--md-sys-color-nav-surface);
    padding: 24px 12px;
    box-sizing: border-box;
    border-radius: 0 16px 16px 0;
  }
  .htmdx-toc-list { list-style: none; margin: 0; padding: 0; }
  .htmdx-nav-logo {
    position: fixed;
    left: 30px;
    bottom: 30px;
    width: 54px;
    height: 54px;
    object-fit: contain;
    object-position: bottom left;
    pointer-events: none;
  }
  .htmdx-toc-link {
    display: block;
    padding: 13px 18px;
    margin-bottom: 2px;
    border-radius: var(--md-sys-shape-corner-full);
    color: var(--md-sys-color-on-surface-variant);
    font-family: var(--md-ref-typeface-brand);
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    line-height: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .htmdx-toc-link:hover {
    background: color-mix(in srgb, var(--md-sys-color-primary) calc(var(--md-sys-state-hover-opacity) * 100%), transparent);
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-toc-item.is-active .htmdx-toc-link {
    background: var(--md-sys-color-nav-active-container);
    color: var(--md-sys-color-on-nav-active-container);
  }

  .htmdx-content {
    box-sizing: border-box;
    padding: 8px 8px 96px;
  }

  .htmdx-sticky-header {
    position: sticky;
    top: 8px;
    z-index: 50;
    height: 0;
    overflow: visible;
    pointer-events: none;
  }
  .htmdx-sticky-header-inner {
    display: flex;
    align-items: baseline;
    gap: 12px;
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: 18px 32px;
    font-family: var(--md-ref-typeface-brand);
    box-shadow: var(--md-sys-elevation-level2);
    transform: translateY(-140%);
    opacity: 0;
    transition: transform 0.28s ease, opacity 0.28s ease;
  }
  .htmdx-sticky-header.is-visible .htmdx-sticky-header-inner {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  .htmdx-sticky-title {
    font-size: 1.0625rem;
    font-weight: 600;
  }
  .htmdx-sticky-divider {
    font-weight: 300;
    opacity: 0.6;
  }
  .htmdx-sticky-project {
    font-size: 1.0625rem;
    font-weight: 300;
  }
  @media (prefers-reduced-motion: reduce) {
    .htmdx-sticky-header-inner { transition: none; }
  }

  .htmdx-hero {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: 102px 0;
    margin-bottom: 40px;
    text-align: left;
  }
  .htmdx-hero-inner {
    margin-left: 8.5%;
    width: 60%;
    box-sizing: border-box;
  }
  .htmdx-hero-eyebrow {
    margin: 0;
    font-family: var(--md-ref-typeface-brand);
    font-weight: 300;
    font-size: 1.02rem;
    line-height: 1.25;
    color: var(--md-sys-color-on-primary);
  }
  .htmdx-hero-title {
    margin: 12px 0 0;
    font-family: var(--md-ref-typeface-brand);
    font-size: clamp(1.7rem, 5.44vw, 4.08rem);
    line-height: 1.05;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--md-sys-color-on-primary);
  }
  .htmdx-hero-desc {
    margin: 24px 0 0;
    font-family: var(--md-ref-typeface-brand);
    font-size: 1.02rem;
    line-height: 1.25;
    font-weight: 300;
    color: var(--md-sys-color-on-primary);
  }
  .htmdx-hero-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 32px;
  }
  .htmdx-hero-label {
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: var(--md-sys-shape-corner-small);
    padding: 4px 10px;
    font-family: var(--md-ref-typeface-brand);
    font-weight: 300;
    font-size: 0.765rem;
    line-height: 1.3;
    color: var(--md-sys-color-on-primary);
  }
  .htmdx-hero-label b { font-weight: 500; }

  .htmdx-doc-section { margin-bottom: 48px; }
  .htmdx-doc-section:last-child { margin-bottom: 0; }
  .htmdx-doc-section > h2 {
    width: 75%;
    box-sizing: border-box;
    margin: 0 auto 16px;
    padding: 0 24px;
    text-align: left;
    font-family: var(--md-ref-typeface-brand);
    font-size: 2rem;
    line-height: 2.5rem;
    font-weight: 500;
    color: var(--md-sys-color-on-surface);
    /* Clear the sticky page header (top offset + bar height) so a nav-click
       scroll lands with the section title visible below the bar. */
    scroll-margin-top: 80px;
  }
  .htmdx-doc-section-card {
    width: 75%;
    box-sizing: border-box;
    margin-left: auto;
    margin-right: auto;
    background: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-extra-large);
    padding: 24px;
  }

  .htmdx-error {
    border: 1px solid var(--md-sys-color-error);
    background: var(--md-sys-color-error-container);
    color: var(--md-sys-color-on-error-container);
    padding: 12px 14px;
    margin-bottom: 14px;
    border-radius: var(--md-sys-shape-corner-medium);
    font-weight: 700;
  }
  .htmdx-raw-source {
    white-space: pre-wrap;
    overflow-x: auto;
    background: var(--md-sys-color-surface-container-low);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: 14px;
    font-family: var(--md-ref-typeface-plain);
  }

  .htmdx-component-header { display: none; }
  section.htmdx-component { margin: 14px 0; }
  section.htmdx-component:first-child { margin-top: 0; }
  section.htmdx-component:last-child { margin-bottom: 0; }

  .htmdx-doc-section-card > h3,
  .htmdx-doc-section-card h3 {
    font-family: var(--md-ref-typeface-brand);
    font-size: 1.375rem;
    line-height: 1.75rem;
    font-weight: 500;
    color: var(--md-sys-color-on-surface);
    margin: 8px 0 8px;
  }
  .htmdx-doc-section-card > h3 {
    margin-top: 24px;
  }
  .htmdx-doc-section-card > p,
  .htmdx-doc-section-card > ul,
  .htmdx-doc-section-card > div > p,
  .htmdx-doc-section-card > div > ul {
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 13px;
  }
  .htmdx-doc-section-card a { color: var(--md-sys-color-primary); text-underline-offset: 2px; }
  .htmdx-doc-section-card strong { font-weight: 700; color: var(--md-sys-color-on-surface); }

  .htmdx-card .htmdx-component-body {
    background: var(--md-sys-color-surface-container-lowest);
    border-radius: var(--md-sys-shape-corner-large);
    box-shadow: var(--md-sys-elevation-level1);
    padding: 18px 22px;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-executive-summary .htmdx-component-body {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-surface);
    border-radius: var(--md-sys-shape-corner-extra-large);
    padding: 22px 26px;
    font-family: var(--md-ref-typeface-brand);
  }
  .htmdx-executive-summary .htmdx-component-body p {
    margin: 0;
    font-size: 1.0625rem;
    line-height: 1.55;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-callout .htmdx-component-body {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-secondary-container);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 18px 22px;
    font-family: var(--md-ref-typeface-brand);
  }
  .htmdx-callout .htmdx-component-body p { margin: 0 0 8px; color: var(--md-sys-color-on-secondary-container); }
  .htmdx-callout .htmdx-component-body p:last-child { margin-bottom: 0; }

  .htmdx-source-quote .htmdx-component-body p {
    font-size: 0.9375rem;
    color: var(--md-sys-color-on-surface-variant);
    border-left: 3px solid var(--md-sys-color-primary);
    padding-left: 16px;
    margin: 6px 0;
    line-height: 1.55;
  }

  .htmdx-doc-section-card table:not([data-slot]) { width: 100%; border-collapse: collapse; font-size: 0.9375rem; margin: 6px 0; }
  .htmdx-doc-section-card table:not([data-slot]) thead th {
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--md-sys-color-on-surface-variant);
    background: var(--md-sys-color-surface-container-high);
    padding: 10px 12px;
    border-bottom: 1px solid var(--md-sys-color-outline);
    white-space: nowrap;
  }
  .htmdx-doc-section-card table:not([data-slot]) tbody th {
    width: 30%;
    text-align: left;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--md-sys-color-on-surface-variant);
    padding: 10px 12px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    border-right: 1px solid var(--md-sys-color-outline-variant);
    vertical-align: top;
  }
  .htmdx-doc-section-card table:not([data-slot]) tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    text-align: left;
    vertical-align: top;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-doc-section-card table:not([data-slot]) tbody tr:last-child td,
  .htmdx-doc-section-card table:not([data-slot]) tbody tr:last-child th { border-bottom: none; }
  .htmdx-doc-section-card table:not([data-slot]) tbody tr:hover td,
  .htmdx-doc-section-card table:not([data-slot]) tbody tr:hover th {
    background: color-mix(in srgb, var(--md-sys-color-primary) calc(var(--md-sys-state-hover-opacity) * 100%), transparent);
  }
  /* SourceQuote (a markdown-bodied shell) sits inside a card. */
  .htmdx-source-quote .htmdx-component-body {
    background: var(--md-sys-color-surface-container-lowest);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 16px 20px;
  }

  @media (max-width: 960px) {
    .htmdx-app { grid-template-columns: minmax(0, 1fr); }
    .htmdx-toc { display: none; }
    .htmdx-content { padding: 16px 20px 64px; }
    .htmdx-hero { padding: 48px 0; border-radius: var(--md-sys-shape-corner-medium); }
    .htmdx-hero-inner { margin-left: 0; width: auto; padding: 0 24px; }
    .htmdx-doc-section-card { width: auto; }
    .htmdx-doc-section > h2 { width: auto; }
  }
  @media (max-width: 720px) {
    .htmdx-hero-title { font-size: 2.5rem; }
    .htmdx-doc-section-card { padding: 16px; }
  }
`;
