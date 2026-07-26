// React-only htmdx runtime. HTMDX source renders through React everywhere:
// built-ins are React components, the shadcn/ui pack is included, and
// compile() produces a static HTML snapshot of the same tree.
import { createElement, Fragment, type ReactElement } from 'react';
import {
  createDefinitionRegistry,
  type HtmdxComponent,
  type HtmdxComponentDefinitions,
} from './component-definition';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { bundledDefinitions, globalDefinitions, runtimeOptionsFor } from './runtime-definitions';
import { calloutStyles } from './components/builtins/Callout/Callout';
import { executiveSummaryStyles } from './components/builtins/ExecutiveSummary/ExecutiveSummary';
import { foldoutStyles } from './components/builtins/Foldout/Foldout';
import { sourceQuoteStyles } from './components/builtins/SourceQuote/SourceQuote';
import {
  collectStructuralDiagnostics,
  compileDocument,
  diagnosticForBlock,
  tokenizeSource,
  type HtmdxBlockFailure,
} from './react';
import {
  buildFixRequest,
  cleanUrl,
  COPY_LABEL,
  errorDiagnostics,
  formatErrorDetails,
  type ErrorDiagnostics,
} from './fix-request';
import { configureMermaid, type HtmdxMermaidOptions } from './react/mermaid';
import { withStaticRender } from './react/static-render';
import { HtmdxSourceError, toDiagnostic, type HtmdxDiagnostic } from './diagnostics';
import { addLayout, type HtmdxLayoutDefinition } from './layout';
import { THEME_CSS, THEME_IDS } from './themes';
import { VERSION } from './version';

export { THEME_IDS, type HtmdxThemeId } from './themes';
export { VERSION } from './version';
export { HtmdxSourceError };
export { injectShadcnTheme } from './components/shadcn/shared/theme';
export { compileDocument, compileToReact, Htmdx, listComponents } from './react';
export type {
  HtmdxBlockFailure,
  HtmdxDocument,
  HtmdxDocumentOptions,
  HtmdxReactOptions,
} from './react';
export { DEFAULT_MERMAID_SRC, type HtmdxMermaidOptions } from './react/mermaid';
export type { HtmdxDiagnostic, HtmdxDiagnosticCode, HtmdxSeverity } from './diagnostics';
export type { HtmdxLayoutDefinition, HtmdxLayoutProps, HtmdxLayoutSlot } from './layout';
export type HtmdxToken =
  | { type: 'markdown'; value: string }
  | { type: 'html'; value: string }
  | { type: 'component'; name: string; body: string };

export type HtmdxCompileResult =
  | { ok: true; html: string; components: string[] }
  | { ok: false; error: string };

export type HtmdxThemeDefinition = {
  id?: string;
  css: string;
};

export type HtmdxCompileOptions = {
  definitions?: HtmdxComponentDefinitions;
  layout?: string;
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
  mermaid?: HtmdxMermaidOptions;
  automount?: boolean;
} & HtmdxCompileOptions;

const STYLE_ID = 'htmdx-runtime-v1-styles';
const FONTS_LINK_ID = 'htmdx-fonts';
const TAILWIND_SCRIPT_ID = 'htmdx-tailwind-browser';
export const DEFAULT_TAG_NAME = 'htmdx-code';
export const DEFAULT_TAILWIND_BROWSER_SRC = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
const DEFAULT_SOURCE_SELECTOR = 'script[type="text/htmdx"], template[type="text/htmdx"]';
const COPIED_LABEL_MS = 1600;

const registeredTagNames = new Set([DEFAULT_TAG_NAME]);
const registeredOptions = new Map<string, HtmdxRegisterOptions>();
const sourceCache = new WeakMap<Element, HtmdxSourceResult & { ok: true }>();

type CapturedError = {
  error: unknown;
  componentStack?: string;
};
type HostRoot = { root: Root; renderError: { current: CapturedError | null } };
const reactRoots = new WeakMap<Element, HostRoot>();
const stickyObservers = new WeakMap<Element, IntersectionObserver>();
const degradedListeners = new WeakMap<Element, AbortController>();

export function compile(source: string, options: HtmdxCompileOptions = {}): HtmdxCompileResult {
  try {
    const doc = compileDocument(source, runtimeOptionsFor(options));
    return {
      ok: true,
      html: renderStaticHtml(doc.element),
      components: doc.components,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Every problem in one pass, with positions. compile() stops at the first
// failure by design; validate() recovers at the tokenizer and renders each
// component block in isolation so one bad block does not mask the rest.
// Like compile(), this needs a DOM: component bodies parse through DOMParser
// and body-format rules only run when the component renders.
export function validate(source: string, options: HtmdxCompileOptions = {}): HtmdxDiagnostic[] {
  const { diagnostics, probes } = collectStructuralDiagnostics(source, runtimeOptionsFor(options));

  for (const probe of probes) {
    const nesting = captureNestingWarnings(() => {
      try {
        renderStaticHtml(createElement(Fragment, null, probe.render()));
      } catch (error) {
        diagnostics.push(diagnosticForBlock(source, probe, error));
      }
    });

    for (const message of nesting) {
      diagnostics.push(
        toDiagnostic(source, 'invalid-html-nesting', message, probe.offset, 1, 'warning'),
      );
    }
  }

  return diagnostics.toSorted((left, right) => left.offset - right.offset);
}

// React reports invalid nesting through console.error during render and
// nowhere else, so the only way to surface it is to listen while rendering.
// Anything else React logs is passed through untouched.
//
// React also remembers which nesting warnings it has already logged, in
// react-dom module state that no API resets. Validating several sources in one
// process therefore reports each distinct violation once, on the first source
// that has it; a fresh process sees it again.
function captureNestingWarnings(render: () => void): string[] {
  const captured: string[] = [];
  // oxlint-disable no-console
  const consoleError = console.error;
  console.error = (...args: unknown[]) => {
    const [format, ...substitutions] = args;
    const message = String(format);
    if (/cannot be a child|cannot be a descendant|validateDOMNesting/.test(message)) {
      captured.push(formatConsoleMessage(message, substitutions).split('\n')[0]);
      return;
    }
    consoleError(...args);
  };

  try {
    render();
  } finally {
    console.error = consoleError;
  }
  // oxlint-enable no-console

  return captured;
}

// React logs through console's format-string protocol, so the tag names live
// in the trailing arguments rather than the message.
function formatConsoleMessage(format: string, substitutions: unknown[]): string {
  let index = 0;
  return format.replace(/%[sdo]/g, (token) =>
    index < substitutions.length ? String(substitutions[index++]) : token,
  );
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
    withStaticRender(() => flushSync(() => root.render(element)));
    if (caught) {
      throw caught;
    }
    return container.innerHTML;
  } finally {
    root.unmount();
  }
}

export function registerComponent(definition: HtmdxComponent, options: HtmdxExtensionOptions = {}) {
  registerDefinitions([definition]);
  return options.rerender === false ? Promise.resolve() : rerender();
}

export function registerComponents(
  definitions: HtmdxComponentDefinitions,
  options: HtmdxExtensionOptions = {},
) {
  registerDefinitions(definitions);
  return options.rerender === false ? Promise.resolve() : rerender();
}

function registerDefinitions(definitions: HtmdxComponentDefinitions) {
  createDefinitionRegistry(definitions, [
    ...bundledDefinitions.map(({ name }) => name),
    ...globalDefinitions.map(({ name }) => name),
  ]);
  globalDefinitions.push(...definitions);
}

export function registerTheme(theme: HtmdxThemeDefinition, options: HtmdxExtensionOptions = {}) {
  injectThemeStyle(theme);
  if (options.rerender === true) {
    return rerender();
  }
  return Promise.resolve();
}

export function registerLayout(
  definition: HtmdxLayoutDefinition,
  options: HtmdxExtensionOptions = {},
) {
  addLayout(definition);
  return options.rerender === false ? Promise.resolve() : rerender();
}

export function rerender(options: Pick<HtmdxRegisterOptions, 'tagName' | 'sourceSelector'> = {}) {
  if (!globalThis.document) {
    return Promise.resolve([]);
  }

  const tagNames = options.tagName ? [options.tagName] : Array.from(registeredTagNames);
  const hosts = tagNames.flatMap((tagName) => Array.from(document.querySelectorAll(tagName)));
  return Promise.all(
    hosts.map((host) =>
      renderHost(host, {
        ...registeredOptions.get(host.tagName.toLowerCase()),
        ...options,
      }),
    ),
  );
}

export function register(options: HtmdxRegisterOptions = {}) {
  if (!globalThis.document || !globalThis.customElements) {
    return;
  }

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = RUNTIME_CSS + COMPONENT_CSS + THEME_CSS;
    document.head.append(style);
  }
  injectFonts();
  injectTailwindBrowser(options.tailwind);
  // Mermaid is not injected here: unlike Tailwind, nothing needs it until a
  // document turns out to contain a diagram, so the fetch is the diagram's.
  configureMermaid(options.mermaid);
  injectThemeStyle(options.theme);

  const tagName = options.tagName || DEFAULT_TAG_NAME;
  const optionsKey = tagName.toLowerCase();
  const mergedOptions = { ...registeredOptions.get(optionsKey), ...options, tagName };
  registeredTagNames.add(tagName);
  registeredOptions.set(optionsKey, mergedOptions);
  const alreadyRegistered = Boolean(customElements.get(tagName));
  if (!alreadyRegistered) {
    customElements.define(
      tagName,
      class HtmdxElement extends HTMLElement {
        async connectedCallback() {
          await renderHost(this, registeredOptions.get(optionsKey) || mergedOptions);
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

  if (mergedOptions.automount !== false) {
    mountBareSources(tagName, mergedOptions);
  }
  if (alreadyRegistered) {
    void rerender({ tagName });
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
    const scan = scanArtifact(sourceResult.source ?? '', options);
    reportHostError(
      host,
      errorDiagnostics('load', sourceResult.error, { artifactDiagnostics: scan }),
      { phase: 'source' },
      sourceResult.source,
      scan,
    );
    return;
  }

  sourceCache.set(host, sourceResult);

  // A block that fails no longer takes the page with it. Failures land here,
  // and the banner appended after the render is what tells the reader that the
  // page they are looking at is incomplete.
  const blockFailures: HtmdxBlockFailure[] = [];
  let doc;
  try {
    doc = compileDocument(sourceResult.source, {
      ...runtimeOptionsFor(options),
      onBlockError: (failure) => blockFailures.push(failure),
    });
  } catch (error) {
    const scan = scanArtifact(sourceResult.source, options);
    reportHostError(
      host,
      errorDiagnostics('compile', error, { artifactDiagnostics: scan }),
      {},
      sourceResult.source,
      scan,
    );
    return;
  }

  try {
    let hostRoot = reactRoots.get(host);
    if (!hostRoot) {
      // The embedded source element is consumed here; the source is cached
      // above, so rerenders keep working. React owns a container of its own so
      // the degraded banner can sit beside it without fighting reconciliation.
      host.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'htmdx-root';
      host.append(container);
      const renderErrorBox: HostRoot['renderError'] = { current: null };
      hostRoot = {
        root: createRoot(container, {
          // React roots swallow render errors instead of throwing; capture
          // them so the error fallback below still works.
          onUncaughtError: (error, errorInfo) => {
            renderErrorBox.current = {
              error,
              componentStack: errorInfo.componentStack || undefined,
            };
          },
          // A block boundary already reported this one and put a card in its
          // place; React's default would log it again as if nothing handled it.
          onCaughtError: () => {},
        }),
        renderError: renderErrorBox,
      };
      reactRoots.set(host, hostRoot);
    }
    hostRoot.renderError.current = null;
    host.querySelector('.htmdx-degraded')?.remove();
    degradedListeners.get(host)?.abort();
    degradedListeners.delete(host);
    flushSync(() => hostRoot.root.render(doc.element));
    const captured = hostRoot.renderError.current as CapturedError | null;
    if (captured) {
      const scan = scanArtifact(sourceResult.source, options);
      reportHostError(
        host,
        errorDiagnostics('render', captured.error, {
          reactComponentStack: captured.componentStack,
          artifactDiagnostics: scan,
        }),
        {},
        sourceResult.source,
        scan,
      );
      return;
    }
    activateSectionRail(host);
    activateStickyHeader(host);
    activateInPageAnchors(host);
    if (blockFailures.length > 0) {
      renderDegradedBanner(host, blockFailures, sourceResult.source, options);
    }
    host.dispatchEvent(
      new CustomEvent('htmdx:rendered', {
        detail: {
          source: sourceResult.kind,
          components: doc.components,
          version: VERSION,
          ...(blockFailures.length > 0 ? { partial: true } : {}),
        },
        bubbles: true,
      }),
    );
    // The page rendered, so htmdx:rendered is the truth; htmdx:error follows
    // for anything watching for failures, marked partial so it is not mistaken
    // for the whole page going down.
    if (blockFailures.length > 0) {
      host.dispatchEvent(
        new CustomEvent('htmdx:error', {
          detail: {
            ok: false,
            partial: true,
            failedStep: 'render',
            blocks: blockFailures.map((failure) => ({
              component: failure.name,
              error: failure.error instanceof Error ? failure.error.message : String(failure.error),
            })),
          },
          bubbles: true,
        }),
      );
    }
  } catch (error) {
    const scan = scanArtifact(sourceResult.source, options);
    reportHostError(
      host,
      errorDiagnostics('render', error, { artifactDiagnostics: scan }),
      {},
      sourceResult.source,
      scan,
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

const inPageAnchorHosts = new WeakSet<Element>();

// Component-generated and author-written in-page links (BulletList rows,
// `[label](#slug)` markdown links, ...) are plain anchors, not TOC links.
// Native `#hash` navigation is unreliable inside embedding iframes that carry a
// <base> (Storybook's preview frame, some artifact hosts): the click resolves
// against the base URL and loads a new page instead of scrolling. Delegate the
// click on the host so any in-page anchor smooth-scrolls to its target, the
// same treatment TOC links already get in activateSectionRail.
function activateInPageAnchors(root: Element) {
  if (!globalThis.document || inPageAnchorHosts.has(root)) {
    return;
  }
  inPageAnchorHosts.add(root);
  root.addEventListener('click', (event) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href^="#"]');
    // TOC links keep their own scroll-spy handler; leave them alone.
    if (!anchor || anchor.classList.contains('htmdx-toc-link')) {
      return;
    }
    const id = decodeURIComponent((anchor.getAttribute('href') || '').slice(1));
    const target = id ? root.querySelector<HTMLElement>(idSelector(id)) : null;
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
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
  return tokenizeSource(source, runtimeOptionsFor(options).definitions);
}

export function canonicalComponentName(name: string, options: HtmdxCompileOptions = {}) {
  const names = runtimeOptionsFor(options).definitions.map((definition) => definition.name);
  return names.find((known) => known.toLowerCase() === name.toLowerCase()) || name;
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

// The error path scans the whole source once: the same list anchors the
// failure that stopped the page and fills out everything else the agent should
// fix in the same pass. A scan that throws must never replace the real error.
function scanArtifact(source: string, options: HtmdxCompileOptions) {
  if (!source) {
    return [];
  }

  try {
    return validate(source, options);
  } catch {
    return [];
  }
}

function reportHostError(
  host: Element,
  diagnostics: ErrorDiagnostics,
  legacyDetail: Record<string, unknown> = {},
  source = '',
  artifactDiagnostics: HtmdxDiagnostic[] = [],
) {
  const hostRoot = reactRoots.get(host);
  if (hostRoot) {
    reactRoots.delete(host);
    hostRoot.root.unmount();
  }
  // The panel replaces the banner and its cards, so the delegated copy handler
  // has nothing left to answer for.
  degradedListeners.get(host)?.abort();
  degradedListeners.delete(host);

  renderError(host, diagnostics, source, artifactDiagnostics);
  host.dispatchEvent(
    new CustomEvent('htmdx:error', {
      detail: {
        ok: false,
        ...legacyDetail,
        failedStep: diagnostics.failedStep,
        error: diagnostics.message,
        javascriptStack: diagnostics.javascriptStack,
        reactComponentStack: diagnostics.reactComponentStack,
      },
      bubbles: true,
    }),
  );
}

function renderError(
  host: Element,
  diagnostics: ErrorDiagnostics,
  source: string,
  artifactDiagnostics: HtmdxDiagnostic[],
) {
  const fixRequest = buildFixRequest(
    diagnostics,
    fixRequestContext(host, source, artifactDiagnostics),
  );
  host.replaceChildren();

  const panel = document.createElement('section');
  panel.className = 'htmdx-error';
  const theme = themeFromSource(source);
  if (theme) {
    panel.setAttribute('data-htmdx-theme', theme);
  }
  panel.setAttribute('role', 'alert');
  panel.setAttribute('aria-labelledby', 'htmdx-error-title');

  const heading = document.createElement('h1');
  heading.id = 'htmdx-error-title';
  heading.textContent = 'This page couldn’t be shown';

  const body = document.createElement('p');
  body.textContent =
    'Copy the fix request and send it to your coding agent. When your agent finishes, reload this page.';

  const actions = document.createElement('div');
  actions.className = 'htmdx-error-actions';

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = COPY_LABEL;

  const reloadButton = document.createElement('button');
  reloadButton.type = 'button';
  reloadButton.textContent = 'Reload page';
  reloadButton.addEventListener('click', () => window.location.reload());
  actions.append(copyButton, reloadButton);

  const status = document.createElement('p');
  status.className = 'htmdx-error-status';
  status.setAttribute('aria-live', 'polite');

  const manual = createManualRequest();
  const copy = copyHandler(status, manual);
  copyButton.addEventListener('click', () => void copy(copyButton, fixRequest));

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Error details';
  const detailsText = document.createElement('pre');
  detailsText.textContent = formatErrorDetails(diagnostics);
  details.append(summary, detailsText);

  panel.append(heading, body, actions, status, manual.element, details);
  host.append(panel);
}

type ManualRequest = { element: HTMLElement; text: HTMLElement };

function createManualRequest(): ManualRequest {
  const element = document.createElement('div');
  element.hidden = true;
  const label = document.createElement('p');
  label.textContent = 'Copy this fix request manually:';
  const text = document.createElement('pre');
  text.tabIndex = 0;
  element.append(label, text);
  return { element, text };
}

// One clipboard flow for the whole-page panel, the degraded banner, and every
// card inside it: the label flips back on its own, and a refused clipboard
// reveals the text instead of leaving the reader with nothing.
function copyHandler(status: HTMLElement, manual: ManualRequest) {
  let restoreLabel: ReturnType<typeof setTimeout> | undefined;
  return async (button: HTMLButtonElement, fixRequest: string) => {
    try {
      await navigator.clipboard.writeText(fixRequest);
      status.textContent = 'Copied. Paste it into your coding agent.';
      button.textContent = 'Copied';
      clearTimeout(restoreLabel);
      restoreLabel = setTimeout(() => {
        button.textContent = COPY_LABEL;
      }, COPIED_LABEL_MS);
    } catch {
      status.textContent = 'Clipboard access failed. Copy the fix request below.';
      manual.text.textContent = fixRequest;
      manual.element.hidden = false;
      selectText(manual.text);
    }
  };
}

// The page rendered, so the banner is a persistent notice rather than a
// replacement: it says how much is missing and carries the copy action for the
// artifact as a whole, while each card copies only its own failure.
function renderDegradedBanner(
  host: Element,
  failures: HtmdxBlockFailure[],
  source: string,
  options: HtmdxCompileOptions,
) {
  const scan = scanArtifact(source, options);
  const context = fixRequestContext(host, source, scan);

  const banner = document.createElement('section');
  banner.className = 'htmdx-error htmdx-degraded';
  banner.setAttribute('role', 'alert');
  const theme = themeFromSource(source);
  if (theme) {
    banner.setAttribute('data-htmdx-theme', theme);
  }

  const heading = document.createElement('h1');
  heading.textContent =
    failures.length === 1
      ? '1 block on this page didn’t render'
      : `${failures.length} blocks on this page didn’t render`;

  const body = document.createElement('p');
  body.textContent =
    'Everything else is shown below. Copy the fix request and send it to your coding agent, then reload this page.';

  const actions = document.createElement('div');
  actions.className = 'htmdx-error-actions';
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = COPY_LABEL;
  const reloadButton = document.createElement('button');
  reloadButton.type = 'button';
  reloadButton.textContent = 'Reload page';
  reloadButton.addEventListener('click', () => window.location.reload());
  actions.append(copyButton, reloadButton);

  const status = document.createElement('p');
  status.className = 'htmdx-error-status';
  status.setAttribute('aria-live', 'polite');

  const manual = createManualRequest();
  banner.append(heading, body, actions, status, manual.element);
  host.prepend(banner);

  const copy = copyHandler(status, manual);
  copyButton.addEventListener(
    'click',
    () => void copy(copyButton, buildFixRequest(blockError(failures[0], scan), context)),
  );

  // The cards live inside the React tree, which is rebuilt on every render, so
  // the click handler is delegated from the host and torn down with the banner.
  const byOffset = new Map(failures.map((failure) => [String(failure.offset), failure]));
  const controller = new AbortController();
  degradedListeners.set(host, controller);
  host.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('[data-htmdx-fix]');
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }
      const failure = byOffset.get(button.dataset.htmdxFix ?? '');
      if (failure) {
        void copy(button, buildFixRequest(blockError(failure, scan), context));
      }
    },
    { signal: controller.signal },
  );
}

function blockError(failure: HtmdxBlockFailure, artifactDiagnostics: HtmdxDiagnostic[]) {
  const step = failure.error instanceof HtmdxSourceError ? 'compile' : 'render';
  return errorDiagnostics(step, failure.error, {
    ...(failure.componentStack ? { reactComponentStack: failure.componentStack } : {}),
    artifactDiagnostics,
  });
}

function themeFromSource(source: string) {
  const frontmatter = source.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  const themeField = frontmatter?.[1]
    .split(/\r?\n/)
    .map((line) => line.match(/^theme:\s*(.*)$/i)?.[1])
    .find((value) => value !== undefined);
  const theme = themeField
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();
  return theme && (THEME_IDS as readonly string[]).includes(theme) ? theme : undefined;
}

function fixRequestContext(host: Element, source: string, artifactDiagnostics: HtmdxDiagnostic[]) {
  return {
    pageTitle: document.title,
    pageLocation: document.location.href,
    baseUrl: document.baseURI,
    artifactSrc: host.getAttribute('src'),
    runtimeScriptPath: findRuntimeScriptPath(),
    version: VERSION,
    source,
    artifactDiagnostics,
  };
}

function findRuntimeScriptPath() {
  const scripts = Array.from(document.scripts).filter((script) => script.src);
  const runtime =
    scripts.find((script) => script.src.includes('@wix/htmdx@')) ||
    scripts.find((script) => /\/browser\.js(?:[?#]|$)/.test(script.src));
  return runtime ? cleanUrl(runtime.src) : '';
}

function selectText(element: HTMLElement) {
  element.focus();
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
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
    'https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800&display=swap';
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

// Presentation owned by migrated components, colocated with their
// implementations; the runtime only injects it next to its own chrome CSS.
const COMPONENT_CSS = `${calloutStyles}${executiveSummaryStyles}${foldoutStyles}${sourceQuoteStyles}`;

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
    --md-ref-typeface-plain: "Figtree", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;

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

    /* Syntax colors are fixed rather than theme-derived: a palette that shifts
       with the accent hue stops separating tokens from each other. Override any
       of these to reskin every code block. */
    --htmdx-code-text: #1f2430;
    --htmdx-code-comment: #71809b;
    --htmdx-code-keyword: #7c3aed;
    --htmdx-code-string: #047857;
    --htmdx-code-number: #b45309;
    --htmdx-code-function: #2563eb;
    --htmdx-code-type: #0e7490;
    --htmdx-code-property: #be185d;
    --htmdx-code-punctuation: #8a94a6;
    --htmdx-code-inserted: #047857;
    --htmdx-code-deleted: #b91c1c;

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
  .htmdx-app--blank,
  .htmdx-app--custom { display: block; }

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
    font-size: 20px;
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
  .htmdx-hero-subtitle {
    margin: 10px 0 0;
    font-family: var(--md-ref-typeface-brand);
    font-size: 1.35rem;
    line-height: 1.2;
    font-weight: 400;
    opacity: 0.9;
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
  .htmdx-doc-section-card > .htmdx-content-component:not(:last-child) {
    margin-bottom: 24px;
  }

  .htmdx-error {
    box-sizing: border-box;
    width: min(680px, calc(100% - 32px));
    margin: 64px auto;
    padding: 32px;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    background: var(--md-sys-color-surface-container-lowest);
    color: var(--md-sys-color-on-surface);
    box-shadow: var(--md-sys-elevation-level1);
  }
  .htmdx-error h1 { margin: 0 0 12px; font-size: 1.75rem; line-height: 1.2; }
  .htmdx-error > p { margin: 0 0 24px; color: var(--md-sys-color-on-surface-variant); }
  .htmdx-error-actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .htmdx-error button {
    border: 1px solid var(--md-sys-color-primary);
    border-radius: var(--md-sys-shape-corner-full);
    padding: 10px 18px;
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .htmdx-error button + button {
    background: transparent;
    color: var(--md-sys-color-primary);
  }
  .htmdx-error-status { min-height: 24px; margin: 16px 0 0; }
  .htmdx-error details { margin-top: 20px; }
  .htmdx-error summary { cursor: pointer; font-weight: 600; }
  .htmdx-error pre {
    max-height: 320px;
    margin: 12px 0 0;
    padding: 14px;
    overflow: auto;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-small);
    background: var(--md-sys-color-surface-container-low);
    color: var(--md-sys-color-on-surface);
    font-family: var(--htmdx-mono);
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre-wrap;
    user-select: text;
  }

  /* The page rendered, so the banner announces the gap without owning the
     viewport the way the full-page panel does. */
  .htmdx-degraded {
    width: min(880px, calc(100% - 32px));
    margin: 24px auto 0;
    padding: 24px;
    border-color: var(--md-sys-color-error);
  }
  .htmdx-degraded h1 { font-size: 1.25rem; }
  .htmdx-degraded > p { margin-bottom: 16px; }

  /* A card stands in for one block, so it takes the block's place in the flow
     rather than interrupting the page around it. */
  .htmdx-block-error {
    margin: 8px 0;
    padding: 18px 20px;
    border: 1px solid var(--md-sys-color-error);
    border-radius: var(--md-sys-shape-corner-medium);
    background: var(--md-sys-color-surface-container-lowest);
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-block-error-title { margin: 0; font-weight: 600; }
  .htmdx-block-error-message {
    margin: 6px 0 0;
    color: var(--md-sys-color-on-surface-variant);
  }
  .htmdx-block-error-input {
    margin: 12px 0 0;
    padding: 10px 12px;
    overflow: auto;
    border-radius: var(--md-sys-shape-corner-small);
    background: var(--md-sys-color-surface-container-low);
    font-family: var(--htmdx-mono);
    font-size: 0.8125rem;
    white-space: pre-wrap;
    user-select: text;
  }
  .htmdx-block-error-fix {
    margin-top: 14px;
    border: 1px solid var(--md-sys-color-primary);
    border-radius: var(--md-sys-shape-corner-full);
    padding: 8px 16px;
    background: transparent;
    color: var(--md-sys-color-primary);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .htmdx-component-header { display: none; }

  .htmdx-doc-section-card > h3,
  .htmdx-doc-section-card h3:not([data-slot]) {
    font-family: var(--md-ref-typeface-brand);
    font-size: 1.58rem;
    line-height: 1.75rem;
    font-weight: 500;
    color: var(--md-sys-color-on-surface);
    margin: 20px 0;
  }
  /* A section title that is the first item in its section has no content above
     it to separate from, so drop the top margin — only when it is first. */
  .htmdx-doc-section-card > div:first-child > h3:first-child:not([data-slot]),
  .htmdx-doc-section-card > h3:first-child:not([data-slot]) {
    margin-top: 0;
  }
  .htmdx-doc-section-card > p,
  .htmdx-doc-section-card > ul,
  .htmdx-doc-section-card > div > p,
  .htmdx-doc-section-card > div > ul {
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 13px;
  }
  .htmdx-doc-section-card > p:last-child,
  .htmdx-doc-section-card > div:last-child > p:last-child {
    margin-bottom: 0;
  }
  .htmdx-doc-section-card a:not([data-slot]) {
    color: var(--md-sys-color-primary);
    text-underline-offset: 2px;
  }
  .htmdx-doc-section-card strong:not([data-slot]) {
    font-weight: 700;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-doc-section-card :not(pre) > code:not([data-slot]) {
    padding: 0.15em 0.4em;
    border-radius: var(--md-sys-shape-corner-small);
    background: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
    font-family: var(--htmdx-mono);
    font-size: 0.875em;
  }
  .htmdx-image { display: block; max-width: 100%; height: auto; }

  .htmdx-code-figure {
    box-sizing: border-box;
    max-width: 100%;
    margin: 0 0 16px;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-medium);
    background: var(--md-sys-color-surface-container-lowest);
    overflow: hidden;
  }
  .htmdx-code-figure:last-child { margin-bottom: 0; }
  .htmdx-code-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 6px 5px 14px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-surface-container-low);
  }
  .htmdx-code-language {
    font-family: var(--htmdx-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--md-sys-color-on-surface-variant);
  }
  .htmdx-code-copy {
    flex: none;
    border: 0;
    border-radius: var(--md-sys-shape-corner-small);
    padding: 4px 10px;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant);
    font-family: var(--htmdx-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    /* Dimmed rather than hidden: a control that only exists on hover is
       invisible on touch and to anyone scanning the page. */
    opacity: 0.6;
    transition: opacity 120ms ease, background-color 120ms ease, color 120ms ease;
  }
  .htmdx-code-figure:hover .htmdx-code-copy,
  .htmdx-code-copy:focus-visible { opacity: 1; }
  .htmdx-code-copy:hover { background: var(--md-sys-color-surface-container-high); }
  .htmdx-code-copy[data-copied] {
    opacity: 1;
    color: var(--md-sys-color-primary);
  }
  .htmdx-code-block {
    box-sizing: border-box;
    max-width: 100%;
    margin: 0;
    padding: 14px 16px;
    overflow-x: auto;
    background: none;
    color: var(--htmdx-code-text);
    font-family: var(--htmdx-mono);
    font-size: 0.8125rem;
    line-height: 1.65;
    tab-size: 2;
    scrollbar-width: thin;
    user-select: text;
  }
  .htmdx-tok-comment { color: var(--htmdx-code-comment); font-style: italic; }
  .htmdx-tok-keyword { color: var(--htmdx-code-keyword); }
  .htmdx-tok-string { color: var(--htmdx-code-string); }
  .htmdx-tok-number { color: var(--htmdx-code-number); }
  .htmdx-tok-function { color: var(--htmdx-code-function); }
  .htmdx-tok-tag { color: var(--htmdx-code-keyword); }
  .htmdx-tok-type { color: var(--htmdx-code-type); }
  .htmdx-tok-attribute { color: var(--htmdx-code-property); }
  .htmdx-tok-property { color: var(--htmdx-code-property); }
  .htmdx-tok-operator { color: var(--htmdx-code-punctuation); }
  .htmdx-tok-punctuation { color: var(--htmdx-code-punctuation); }
  .htmdx-tok-inserted { color: var(--htmdx-code-inserted); }
  .htmdx-tok-deleted { color: var(--htmdx-code-deleted); }
  @media (prefers-reduced-motion: reduce) {
    .htmdx-code-copy { transition: none; }
  }

  .htmdx-card .htmdx-component-body {
    background: var(--md-sys-color-surface-container-lowest);
    border-radius: var(--md-sys-shape-corner-large);
    box-shadow: var(--md-sys-elevation-level1);
    padding: 18px 22px;
    color: var(--md-sys-color-on-surface);
  }
  /* The white Card surface ships shadcn's py-6 (24px) top/bottom — tighten to
     20px. Unlayered runtime CSS outranks Tailwind's layered py-6 utility. */
  .htmdx-doc-section-card [data-slot="card"] {
    padding-top: 20px;
    padding-bottom: 20px;
  }
  /* shadcn Card renders a markdown body into a bare (non-slot) div with no
     horizontal padding of its own — inset it 20px L/R. Composed bodies using
     CardHeader/CardContent carry data-slot and keep their built-in px-6. */
  .htmdx-doc-section-card [data-slot="card"] > div:not([data-slot]) {
    padding-left: 20px;
    padding-right: 20px;
  }
  /* CardContent owns the layout of direct HTMDX blocks. Keep dense card
     content spaced without adding utility classes to each artifact. */
  .htmdx-doc-section-card [data-slot="card-content"] > [data-htmdx-component]:not(:last-child) {
    margin-block-end: 16px;
  }
  /* Put space after each Badge rather than before the next one so a Badge that
     wraps onto a new line stays aligned with the first Badge. */
  .htmdx-doc-section-card [data-slot="card-content"] > [data-slot="badge"]:has(+ [data-slot="badge"]) {
    margin-inline-end: 8px;
  }
  .htmdx-doc-section-card [data-slot="card-content"] > [data-slot="badge"] + :not([data-slot="badge"]) {
    margin-block-start: 16px;
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
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
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
  /* DecisionMatrix: vertical column separators matching the row borders. */
  [data-htmdx-component="DecisionMatrix"] th:not(:last-child),
  [data-htmdx-component="DecisionMatrix"] td:not(:last-child) {
    border-right: 1px solid var(--md-sys-color-outline-variant);
  }
  /* Let DecisionMatrix headers wrap; the inherited markdown-table nowrap forced
     the columns wider than the container, overflowing/clipping the last one. */
  .htmdx-doc-section-card [data-htmdx-component="DecisionMatrix"] thead th:not([data-slot]) {
    white-space: normal;
  }
  /* MetricStrip values render inline **bold** as <strong> (700); keep the big
     card text at a cohesive medium weight (outranks .htmdx-doc-section-card
     strong, 0,2,1). */
  .htmdx-doc-section-card [data-htmdx-component="MetricStrip"] strong:not([data-slot]),
  .htmdx-doc-section-card [data-htmdx-component="MetricStrip"] b:not([data-slot]) {
    font-weight: 500;
  }
  .htmdx-doc-section-card table:not([data-slot]) tbody tr:hover td,
  .htmdx-doc-section-card table:not([data-slot]) tbody tr:hover th {
    background: color-mix(in srgb, var(--md-sys-color-primary) calc(var(--md-sys-state-hover-opacity) * 100%), transparent);
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
