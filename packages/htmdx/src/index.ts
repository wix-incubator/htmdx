// React-only htmdx runtime. HTMDX source renders through React everywhere:
// built-ins are React components, the shadcn/ui pack is included, and
// compile() produces a static HTML snapshot of the same tree.
import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { escapeHtml } from './components/rendering';
import {
  builtInReactComponents,
  compileDocument,
  tokenizeSource,
  type HtmdxReactComponent,
  type HtmdxReactComponents,
} from './react';
import { shadcnComponents } from './react/shadcn';
import { VERSION } from './version';

export { VERSION } from './version';
export { injectShadcnTheme, shadcnComponents } from './react/shadcn';
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
const TAILWIND_SCRIPT_ID = 'htmdx-tailwind-browser';
export const DEFAULT_TAG_NAME = 'htmdx-code';
export const DEFAULT_TAILWIND_BROWSER_SRC = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
const DEFAULT_SOURCE_SELECTOR = 'script[type="text/htmdx"], template[type="text/htmdx"]';

const globalReactComponents: HtmdxReactComponents = {};
const registeredTagNames = new Set([DEFAULT_TAG_NAME]);
const sourceCache = new WeakMap<Element, HtmdxSourceResult & { ok: true }>();

type HostRoot = { root: Root; renderError: { current: unknown } };
const reactRoots = new WeakMap<Element, HostRoot>();

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
    style.textContent = RUNTIME_CSS;
    document.head.append(style);
  }
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
    .map((link) => root.querySelector<HTMLElement>(`#${cssEscape(link.dataset.htmdxTarget || '')}`))
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
      const target = root.querySelector<HTMLElement>(`#${cssEscape(id)}`);
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

function cssEscape(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

const RUNTIME_CSS = `
  :root {
    color-scheme: light;
    --htmdx-bg: #ffffff;
    --htmdx-ink: #0f172a;
    --htmdx-body: #334155;
    --htmdx-soft: #64748b;
    --htmdx-line: #e8eaee;
    --htmdx-line-strong: #cbd2da;
    --htmdx-panel: #f7f8fa;
    --htmdx-accent: #3457d5;
    --htmdx-accent-soft: #eef1fd;
    --htmdx-accent-edge: #dfe4fb;
    --htmdx-green: #15803d;
    --htmdx-green-bg: #e7f6ec;
    --htmdx-amber: #b45309;
    --htmdx-amber-bg: #fdf0db;
    --htmdx-gray: #64748b;
    --htmdx-gray-bg: #eef1f4;
    --htmdx-red: #b91c1c;
    --htmdx-red-bg: #fdecec;
    --htmdx-font: system-ui, -apple-system, "Helvetica Neue", "Segoe UI", Arial, sans-serif;
    --htmdx-mono: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace;
  }

  htmdx-code {
    display: block;
    background: var(--htmdx-bg);
    color: var(--htmdx-body);
    font-family: var(--htmdx-font);
    font-size: 15px;
    line-height: 1.55;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }

  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

  .htmdx-masthead {
    max-width: 64rem;
    margin: 0 auto;
    padding: 44px 28px 0;
  }
  .htmdx-masthead h1 {
    margin: 0;
    padding-bottom: 18px;
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: 0;
    color: var(--htmdx-ink);
    line-height: 1.25;
    border-bottom: 2px solid var(--htmdx-ink);
  }

  .htmdx-shell {
    max-width: 64rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 40px;
    align-items: start;
  }

  .htmdx-page { padding: 40px 28px 96px; }

  .htmdx-toc {
    position: sticky;
    top: 20px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    padding: 40px 0 24px 16px;
  }
  .htmdx-toc-list {
    counter-reset: htmdx-nav;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .htmdx-toc-link {
    display: block;
    padding: 7px 0 7px 12px;
    color: var(--htmdx-soft);
    text-decoration: none;
    font-size: 0.82rem;
    line-height: 1.3;
    border-left: 2px solid transparent;
  }
  .htmdx-toc-link::before {
    counter-increment: htmdx-nav;
    content: counter(htmdx-nav, decimal-leading-zero);
    color: var(--htmdx-accent);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
    margin-right: 10px;
  }
  .htmdx-toc-link:hover { color: var(--htmdx-ink); }
  .htmdx-toc-item.is-active .htmdx-toc-link {
    color: var(--htmdx-ink);
    font-weight: 700;
    border-left-color: var(--htmdx-accent);
  }

  .htmdx-error {
    border: 1px solid #fed7aa;
    border-left: 3px solid var(--htmdx-amber);
    background: #fff7ed;
    color: var(--htmdx-amber);
    padding: 12px 14px;
    margin-bottom: 14px;
    border-radius: 6px;
    font-weight: 700;
  }

  .htmdx-raw-source {
    white-space: pre-wrap;
    overflow-x: auto;
    background: var(--htmdx-panel);
    border: 1px solid var(--htmdx-line);
    border-radius: 6px;
    padding: 14px;
    font-family: var(--htmdx-mono);
  }

  .htmdx-component-header { display: none; }
  .htmdx-article { max-width: 46rem; margin: 0 auto; counter-reset: sec; }
  .htmdx-article > h1 { display: none; }
  .htmdx-article > h2 {
    counter-increment: sec;
    display: flex;
    align-items: baseline;
    gap: 12px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--htmdx-ink);
    margin: 42px 0 16px;
    padding-bottom: 9px;
    border-bottom: 1px solid var(--htmdx-line-strong);
    scroll-margin-top: 24px;
  }
  .htmdx-article > h2::before {
    content: counter(sec, decimal-leading-zero);
    color: var(--htmdx-accent);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
    font-weight: 800;
  }
  .htmdx-article > h2:first-of-type { margin-top: 0; }
  .htmdx-article > h3 { font-size: 0.98rem; font-weight: 700; color: var(--htmdx-ink); margin: 22px 0 8px; }
  .htmdx-article > p { margin: 0 0 13px; }
  .htmdx-article a { color: var(--htmdx-accent); text-underline-offset: 2px; }
  .htmdx-article strong { font-weight: 700; color: var(--htmdx-ink); }
  section.htmdx-component { margin: 14px 0; }

  .htmdx-executive-summary .htmdx-component-body {
    background: var(--htmdx-accent-soft);
    border: 1px solid var(--htmdx-accent-edge);
    border-left: 3px solid var(--htmdx-accent);
    border-radius: 8px;
    padding: 16px 20px;
  }
  .htmdx-executive-summary .htmdx-component-body p {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.55;
    color: var(--htmdx-ink);
  }

  .htmdx-finding .htmdx-feature-grid,
  .htmdx-risk-table .htmdx-feature-grid { display: block; }
  .htmdx-finding .htmdx-feature-item {
    position: relative;
    padding: 9px 0 9px 20px;
    border-bottom: 1px solid var(--htmdx-line);
  }
  .htmdx-finding .htmdx-feature-item:last-child,
  .htmdx-risk-table .htmdx-feature-item:last-child { border-bottom: none; }
  .htmdx-finding .htmdx-feature-item::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 17px;
    width: 6px;
    height: 6px;
    background: var(--htmdx-accent);
    border-radius: 50%;
  }
  .htmdx-feature-title { display: block; font-weight: 700; color: var(--htmdx-ink); }
  .htmdx-feature-text { display: block; color: var(--htmdx-body); }

  .htmdx-compare .htmdx-feature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .htmdx-compare .htmdx-feature-item {
    border: 1px solid var(--htmdx-line);
    border-top: 2px solid var(--htmdx-accent);
    border-radius: 6px;
    padding: 13px 15px;
  }
  .htmdx-compare .htmdx-feature-title { margin-bottom: 3px; }
  .htmdx-compare .htmdx-feature-text { font-size: 0.9rem; }

  .htmdx-metric-strip .htmdx-component-body {
    border-top: 2px solid var(--htmdx-ink);
    border-bottom: 1px solid var(--htmdx-line);
  }
  .htmdx-metric-grid { display: flex; flex-wrap: wrap; }
  .htmdx-metric-item {
    flex: 1 1 16%;
    padding: 14px 16px 13px;
    border-right: 1px solid var(--htmdx-line);
  }
  .htmdx-metric-item:last-child { border-right: none; }
  .htmdx-metric-label {
    display: block;
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--htmdx-soft);
    margin-bottom: 7px;
  }
  .htmdx-metric-value {
    display: block;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--htmdx-ink);
    line-height: 1.05;
  }
  .htmdx-metric-item:last-child .htmdx-metric-value { color: var(--htmdx-accent); }

  .htmdx-source-quote .htmdx-component-body p {
    font-size: 0.85rem;
    color: var(--htmdx-soft);
    border-left: 2px solid var(--htmdx-line-strong);
    padding-left: 13px;
    margin: 5px 0;
    line-height: 1.5;
  }

  .htmdx-risk-table .htmdx-feature-item {
    display: grid;
    grid-template-columns: 108px 1fr;
    gap: 16px;
    align-items: start;
    padding: 12px 0;
    border-bottom: 1px solid var(--htmdx-line);
  }
  .htmdx-risk-table .htmdx-feature-title {
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 4px 0;
    border-radius: 5px;
    text-align: center;
  }
  .htmdx-risk-table .htmdx-feature-item[data-tier="must-have"] .htmdx-feature-title { background: var(--htmdx-green-bg); color: var(--htmdx-green); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="differentiator"] .htmdx-feature-title { background: var(--htmdx-amber-bg); color: var(--htmdx-amber); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="not-now"] .htmdx-feature-title { background: var(--htmdx-gray-bg); color: var(--htmdx-gray); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="wont-do"] .htmdx-feature-title { background: var(--htmdx-red-bg); color: var(--htmdx-red); }

  .htmdx-article table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin: 6px 0;
  }
  .htmdx-article thead th {
    text-align: left;
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--htmdx-soft);
    padding: 9px 10px;
    border-bottom: 2px solid var(--htmdx-ink);
    white-space: nowrap;
  }
  .htmdx-article tbody th {
    width: 30%;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--htmdx-soft);
    padding: 9px 12px;
    border-bottom: 1px solid var(--htmdx-line);
    border-right: 1px solid var(--htmdx-line);
    vertical-align: top;
    white-space: normal;
  }
  .htmdx-article tbody td {
    padding: 9px 12px;
    border-bottom: 1px solid var(--htmdx-line);
    text-align: left;
    vertical-align: top;
    color: var(--htmdx-body);
  }
  .htmdx-article tbody tr:last-child td,
  .htmdx-article tbody tr:last-child th { border-bottom: none; }
  .htmdx-article tbody tr:hover td,
  .htmdx-article tbody tr:hover th { background: var(--htmdx-panel); }

  .htmdx-chart svg {
    width: 100%;
    height: auto;
    max-height: 220px;
  }
  .htmdx-chart-bar { fill: var(--htmdx-accent); }
  .htmdx-chart-axis { stroke: var(--htmdx-line-strong); }
  .htmdx-chart-label {
    fill: var(--htmdx-soft);
    font-size: 11px;
    font-family: var(--htmdx-font);
  }

  @media (max-width: 960px) {
    .htmdx-shell {
      display: block;
      max-width: 46rem;
    }
    .htmdx-toc { display: none; }
    .htmdx-masthead { max-width: 46rem; }
  }

  @media (max-width: 720px) {
    htmdx-code { font-size: 14px; }
    .htmdx-article { max-width: 100%; }
    .htmdx-metric-item { flex-basis: 50%; border-bottom: 1px solid var(--htmdx-line); }
    .htmdx-risk-table .htmdx-feature-item { grid-template-columns: 1fr; }
    .htmdx-compare .htmdx-feature-grid { grid-template-columns: 1fr; }
  }
`;
