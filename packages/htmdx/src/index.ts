import { markdownSyntaxSource, parseComponentBody } from './components/body-contracts';
import { builtInComponents } from './components/catalog';
import type { HtmdxComponent } from './components/types';
import { THEME_CSS, THEME_IDS } from './themes';
import { VERSION } from './version';

export { VERSION } from './version';
import {
  escapeHtml,
  inline,
  renderMarkdown,
  type HtmdxHeading,
  type RenderContext,
} from './components/rendering';

export type HtmdxToken =
  | { type: 'markdown'; value: string }
  | { type: 'component'; name: string; body: string };

export type HtmdxCompileResult =
  | { ok: true; html: string; components: string[] }
  | { ok: false; error: string };

export type HtmdxComponentRenderContext = {
  name: string;
  body: string;
  markdown: (source: string) => string;
  inline: (source: string) => string;
  escapeHtml: (source: string) => string;
};

export type HtmdxComponentRenderer = (context: HtmdxComponentRenderContext) => string;

export type HtmdxComponentDefinition = HtmdxComponentRenderer | { render: HtmdxComponentRenderer };

export type HtmdxComponentRegistry = Record<string, HtmdxComponentDefinition>;

export type HtmdxThemeDefinition = {
  id?: string;
  css: string;
};

export type HtmdxCompileOptions = {
  components?: HtmdxComponentRegistry;
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
} & HtmdxCompileOptions;

const STYLE_ID = 'htmdx-runtime-v1-styles';
const FONTS_LINK_ID = 'htmdx-fonts';
const TAILWIND_SCRIPT_ID = 'htmdx-tailwind-browser';
export const DEFAULT_TAG_NAME = 'htmdx-code';
export const DEFAULT_TAILWIND_BROWSER_SRC = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
const DEFAULT_SOURCE_SELECTOR = 'script[type="text/htmdx"], template[type="text/htmdx"]';

type InternalComponentRenderer = (name: string, body: string) => string;
type InternalComponentRegistry = Map<string, InternalComponentRenderer>;
const globalComponentDefinitions: HtmdxComponentRegistry = {};
const registeredTagNames = new Set([DEFAULT_TAG_NAME]);
const sourceCache = new WeakMap<Element, HtmdxSourceResult & { ok: true }>();

const builtInRenderers: InternalComponentRegistry = new Map(
  builtInComponents.map((component) => [component.name, createBuiltInRenderer(component)]),
);

function createBuiltInRenderer(component: HtmdxComponent): InternalComponentRenderer {
  return (name, rawBody) => {
    switch (component.body) {
      case 'markdown': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
      case 'label-value-list': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
      case 'label-number-list': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
      case 'gfm-table': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
      case 'markdown-list-cards': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
    }
  };
}

export function compile(source: string, options: HtmdxCompileOptions = {}): HtmdxCompileResult {
  try {
    const renderers = createComponentRegistry(options);
    const title = titleFromSource(source);
    const meta = parseFrontmatter(source);
    const normalized = stripFrontmatterAndComments(source);
    const tokens = tokenizeBlocksWithRegistry(normalized, renderers);
    const context: RenderContext = { headings: [], slugCounts: new Map() };
    const html = tokens.map((token) => renderToken(token, context, renderers)).join('');

    return {
      ok: true,
      html: renderDocument(title, html, context.headings, meta),
      components: tokens.filter((token) => token.type === 'component').map((token) => token.name),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function registerComponent(
  name: string,
  definition: HtmdxComponentDefinition,
  options: HtmdxExtensionOptions = {},
) {
  assertComponentName(name);
  globalComponentDefinitions[name] = definition;
  if (options.rerender !== false) {
    return rerender();
  }
  return Promise.resolve();
}

export function registerComponents(
  components: HtmdxComponentRegistry,
  options: HtmdxExtensionOptions = {},
) {
  for (const [name, definition] of Object.entries(components)) {
    assertComponentName(name);
    globalComponentDefinitions[name] = definition;
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
  if (customElements.get(tagName)) {
    return;
  }

  customElements.define(
    tagName,
    class HtmdxElement extends HTMLElement {
      async connectedCallback() {
        await renderHost(this, options);
      }
    },
  );
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
  const rendered = compile(sourceResult.source, options);
  if (!rendered.ok) {
    renderError(host, rendered.error, sourceResult.source);
    host.dispatchEvent(new CustomEvent('htmdx:error', { detail: rendered, bubbles: true }));
    return;
  }

  host.innerHTML = rendered.html;
  activateSectionRail(host);
  activateStickyHeader(host);
  host.dispatchEvent(
    new CustomEvent('htmdx:rendered', {
      detail: { source: sourceResult.kind, components: rendered.components, version: VERSION },
      bubbles: true,
    }),
  );
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
    root.querySelectorAll<HTMLAnchorElement>('.htmdx-nav-link[data-htmdx-target]'),
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

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        header.classList.toggle('is-visible', !entry.isIntersecting);
      }
    },
    { threshold: 0 },
  );
  observer.observe(hero);
}

export function tokenizeBlocks(source: string, options: HtmdxCompileOptions = {}): HtmdxToken[] {
  return tokenizeBlocksWithRegistry(source, createComponentRegistry(options));
}

function tokenizeBlocksWithRegistry(
  source: string,
  renderers: InternalComponentRegistry,
): HtmdxToken[] {
  const tokens: HtmdxToken[] = [];
  const componentPattern = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = componentPattern.exec(source))) {
    const beforeSource = source.slice(lastIndex, match.index);
    assertNoSelfClosingComponents(beforeSource, renderers);
    const before = beforeSource.trim();
    if (before) {
      tokens.push({ type: 'markdown', value: before });
    }

    const name = canonicalComponentName(match[1], renderers);
    if (!renderers.has(name)) {
      throw new Error(`unknown component <${name}>`);
    }

    const body = match[2].trim();
    parseComponentBody(name, 'markdown', body);
    tokens.push({ type: 'component', name, body });
    lastIndex = componentPattern.lastIndex;
  }

  const afterSource = source.slice(lastIndex);
  assertNoSelfClosingComponents(afterSource, renderers);
  const after = afterSource.trim();
  if (after) {
    tokens.push({ type: 'markdown', value: after });
  }

  return tokens;
}

function assertNoSelfClosingComponents(source: string, renderers: InternalComponentRegistry) {
  const syntax = markdownSyntaxSource(source);
  const pattern = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*\/\s*>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(syntax))) {
    const name = canonicalComponentName(match[1], renderers);
    if (renderers.has(name)) {
      parseComponentBody(name, 'markdown', '');
    }
  }
}

export function canonicalComponentName(
  name: string,
  optionsOrRenderers: HtmdxCompileOptions | InternalComponentRegistry = {},
) {
  const renderers =
    optionsOrRenderers instanceof Map
      ? optionsOrRenderers
      : createComponentRegistry(optionsOrRenderers);
  for (const known of renderers.keys()) {
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

function stripFrontmatterAndComments(source: string) {
  return source
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

// Parse a leading YAML-ish frontmatter block (`---\nkey: value\n---`) into a
// flat string map. Values are trimmed and unquoted. Used for optional hero
// fields (project, owner, phase, updated); missing keys fall back to
// placeholders in renderHero.
function parseFrontmatter(source: string): Record<string, string> {
  const match = source.match(/^\s*---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) {
      meta[field[1].toLowerCase()] = field[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return meta;
}

function titleFromSource(source: string) {
  const frontmatterTitle = source.match(
    /^---[\s\S]*?\ntitle:\s*["']?([^"'\n]+)["']?\s*\n[\s\S]*?---/,
  );
  if (frontmatterTitle) {
    return frontmatterTitle[1].trim();
  }

  const markdownTitle = source.match(/^#\s+(.+)$/m);
  return markdownTitle ? markdownTitle[1].trim() : '';
}

function renderDocument(
  title: string,
  articleHtml: string,
  headings: HtmdxHeading[],
  meta: Record<string, string> = {},
) {
  const { lead, sectionsHtml } = groupSections(articleHtml);
  const hero = renderHero(title, lead, meta);
  const stickyHeader = renderStickyHeader(title, meta);
  const nav = renderNav(headings);
  const content = `<div class="htmdx-content">${stickyHeader}${hero}<main class="htmdx-doc">${sectionsHtml}</main></div>`;
  const appClass = nav ? 'htmdx-app' : 'htmdx-app htmdx-app--no-nav';
  const theme = meta.theme?.toLowerCase();
  const themeAttr =
    theme && theme !== 'purple' && (THEME_IDS as readonly string[]).includes(theme)
      ? ` data-htmdx-theme="${theme}"`
      : '';
  return `<div class="${appClass}"${themeAttr}>${nav}${content}</div>`;
}

// Condensed page header revealed once the hero scrolls out of view. Rendered
// into the content column but pinned to the viewport top via position: sticky
// in a zero-height container, so it never occupies layout space. Visibility is
// toggled by activateStickyHeader via an IntersectionObserver on the hero.
function renderStickyHeader(title: string, meta: Record<string, string> = {}) {
  if (!title) {
    return '';
  }
  const project = meta.project || '{Project Name}';
  return (
    '<div class="htmdx-sticky-header" aria-hidden="true"><div class="htmdx-sticky-header-inner">' +
    `<span class="htmdx-sticky-title">${inline(title)}</span>` +
    '<span class="htmdx-sticky-divider">|</span>' +
    `<span class="htmdx-sticky-project">${inline(project)}</span>` +
    '</div></div>'
  );
}

function renderHero(title: string, leadHtml: string, meta: Record<string, string> = {}) {
  if (!title && !leadHtml) {
    return '';
  }
  const eyebrow = `<p class="htmdx-hero-eyebrow">${inline(meta.project || '{Project Name}')}</p>`;
  const titleHtml = title ? `<h1 class="htmdx-hero-title">${inline(title)}</h1>` : '';
  const descHtml = leadHtml ? leadHtml.replace('<p', '<p class="htmdx-hero-desc"') : '';
  const labels =
    '<div class="htmdx-hero-labels">' +
    `<span class="htmdx-hero-label">Owner <b>${inline(meta.owner || '{name}')}</b></span>` +
    `<span class="htmdx-hero-label">Phase <b>${inline(meta.phase || '{Flow / Skill}')}</b></span>` +
    `<span class="htmdx-hero-label">Updated <b>${inline(meta.updated || '{Date}')}</b></span>` +
    '</div>';
  return `<header class="htmdx-hero"><div class="htmdx-hero-inner">${eyebrow}${titleHtml}${descHtml}${labels}</div></header>`;
}

function renderNav(headings: HtmdxHeading[]) {
  if (headings.length < 2) {
    return '';
  }
  const items = headings
    .map(
      (heading) =>
        `<li class="htmdx-nav-item"><a class="htmdx-nav-link" href="#${heading.id}" data-htmdx-target="${heading.id}">${inline(heading.label)}</a></li>`,
    )
    .join('');
  return `<nav class="htmdx-nav" aria-label="Sections"><ol class="htmdx-nav-list">${items}</ol><div class="htmdx-nav-logo" role="img" aria-label="Creator Kit"></div></nav>`;
}

// Split the renderer's own deterministic article HTML into per-<h2> section
// cards. h2 blocks are always emitted as `<h2 id="...">` at a block boundary,
// so splitting on the `<h2` marker is safe (this is our own output, not
// arbitrary HTML). The head chunk (before the first h2) yields the hero lead
// (first <p>, minus any leading <h1>); any head remainder becomes a
// title-less leading card.
function groupSections(articleHtml: string): { lead: string; sectionsHtml: string } {
  const parts = articleHtml.split(/(?=<h2\b)/);
  const head = parts[0] ?? '';
  const sectionChunks = parts.slice(1);

  const headNoH1 = head.replace(/^<h1\b[^>]*>[\s\S]*?<\/h1>/, '');
  const leadMatch = headNoH1.match(/^\s*<p\b[^>]*>[\s\S]*?<\/p>/);
  const lead = leadMatch ? leadMatch[0].trim() : '';
  const headRemainder = leadMatch ? headNoH1.replace(leadMatch[0], '') : headNoH1;

  const sections: string[] = [];
  if (headRemainder.trim()) {
    sections.push(
      `<section class="htmdx-doc-section"><div class="htmdx-doc-section-card">${headRemainder}</div></section>`,
    );
  }
  for (const chunk of sectionChunks) {
    const match = chunk.match(/^(<h2\b[^>]*>[\s\S]*?<\/h2>)([\s\S]*)$/);
    if (!match) {
      sections.push(
        `<section class="htmdx-doc-section"><div class="htmdx-doc-section-card">${chunk}</div></section>`,
      );
      continue;
    }
    const heading = match[1].replace('<h2', '<h2 class="htmdx-doc-section-title"');
    sections.push(
      `<section class="htmdx-doc-section">${heading}<div class="htmdx-doc-section-card">${match[2]}</div></section>`,
    );
  }

  return { lead, sectionsHtml: sections.join('') };
}

function renderToken(
  token: HtmdxToken,
  context: RenderContext,
  renderers: InternalComponentRegistry,
) {
  if (token.type === 'markdown') {
    return renderMarkdown(token.value, context);
  }

  const renderer = renderers.get(token.name);
  if (!renderer) {
    throw new Error(`unknown component <${token.name}>`);
  }

  return renderer(token.name, token.body);
}

function createComponentRegistry(options: HtmdxCompileOptions): InternalComponentRegistry {
  const renderers = new Map(builtInRenderers);
  for (const [name, definition] of Object.entries(globalComponentDefinitions)) {
    renderers.set(name, normalizeComponentDefinition(definition));
  }
  for (const [name, definition] of Object.entries(options.components || {})) {
    renderers.set(name, normalizeComponentDefinition(definition));
  }
  return renderers;
}

function assertComponentName(name: string) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
    throw new Error(`invalid component name "${name}"`);
  }
}

function normalizeComponentDefinition(
  definition: HtmdxComponentDefinition,
): InternalComponentRenderer {
  const render = typeof definition === 'function' ? definition : definition.render;
  return (name, body) =>
    render({
      name,
      body,
      markdown: renderMarkdown,
      inline,
      escapeHtml,
    });
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

function cssEscape(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
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

    --md-chart-series-0: var(--md-sys-color-primary);
    --md-chart-series-1: var(--md-sys-color-tertiary);
    --md-chart-series-2: var(--md-sys-color-secondary);
    --md-chart-series-3: var(--md-sys-color-error);
    --md-chart-series-4: var(--md-sys-color-on-surface-variant);

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

  .htmdx-nav {
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
  .htmdx-nav-list { list-style: none; margin: 0; padding: 0; }
  .htmdx-nav-logo {
    position: fixed;
    left: 30px;
    bottom: 30px;
    width: 54px;
    height: 54px;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTg4IiBoZWlnaHQ9IjE4OCIgdmlld0JveD0iMCAwIDE4OCAxODgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xNzkgOUgxODhWODhIMTc5Vjk3SDlWODhIMFY5SDlWMEgxNzlWOVoiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGQ9Ik0xMy4zOTczIDc5VjYxLjQ3MzNIMjIuMTYwN1Y3OUgxMy4zOTczWk0yMi4xNjA3IDYxLjQ3MzNWNTIuNzA5OUgzMC45MjQxVjYxLjQ3MzNIMjIuMTYwN1pNMzAuOTI0MSA1Mi43MDk5VjQzLjk0NjVIMzkuNjg3NFY1Mi43MDk5SDMwLjkyNDFaTTM5LjY4NzQgNDMuOTQ2NVYzNS4xODMySDQ4LjQ1MDhWNDMuOTQ2NUgzOS42ODc0Wk00OC40NTA4IDM1LjE4MzJWMTcuNjU2NEg1Ny4yMTQyVjM1LjE4MzJINDguNDUwOFpNNzUuNTYyNSA3OVY3MC4yMzY2SDEwMS44NTNWNzlINzUuNTYyNVpNMTAxLjg1MyA3MC4yMzY2VjYxLjQ3MzNIMTEwLjYxNlY3MC4yMzY2SDEwMS44NTNaTTY2Ljc5OTEgNzAuMjM2NlYyNi40MTk4SDc1LjU2MjVWNzAuMjM2Nkg2Ni43OTkxWk0xMDEuODUzIDM1LjE4MzJWMjYuNDE5OEgxMTAuNjE2VjM1LjE4MzJIMTAxLjg1M1pNNzUuNTYyNSAyNi40MTk4VjE3LjY1NjRIMTAxLjg1M1YyNi40MTk4SDc1LjU2MjVaTTE1NS4yNTQgNzlWNzAuMjM2NkgxNjQuMDE4Vjc5SDE1NS4yNTRaTTE0Ni40OTEgNzAuMjM2NlY2MS40NzMzSDE1NS4yNTRWNzAuMjM2NkgxNDYuNDkxWk0xMzcuNzI4IDYxLjQ3MzNWNTIuNzA5OUgxNDYuNDkxVjYxLjQ3MzNIMTM3LjcyOFpNMTM3LjcyOCA0My45NDY1VjM1LjE4MzJIMTQ2LjQ5MVY0My45NDY1SDEzNy43MjhaTTE0Ni40OTEgMzUuMTgzMlYyNi40MTk4SDE1NS4yNTRWMzUuMTgzMkgxNDYuNDkxWk0xMjAuMjAxIDc5VjE3LjY1NjRIMTI4Ljk2NFY0My45NDY1SDEzNy43MjhWNTIuNzA5OUgxMjguOTY0Vjc5SDEyMC4yMDFaTTE1NS4yNTQgMjYuNDE5OFYxNy42NTY0SDE2NC4wMThWMjYuNDE5OEgxNTUuMjU0WiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzE1NV8xNTUzKSIvPgo8cmVjdCB4PSIzNCIgeT0iMTE3IiB3aWR0aD0iMTYiIGhlaWdodD0iNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMzQiIHk9IjEyOSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjM0IiB5PSIxMjEiIHdpZHRoPSI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSI1MCIgeT0iMTIxIiB3aWR0aD0iNCIgaGVpZ2h0PSI4IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSI1MCIgeT0iMTMzIiB3aWR0aD0iNCIgaGVpZ2h0PSIxMiIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTU5IiB5PSIxMTciIHdpZHRoPSIxNiIgaGVpZ2h0PSI0IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxNTkiIHk9IjEyOSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjE1OSIgeT0iMTIxIiB3aWR0aD0iNCIgaGVpZ2h0PSIyNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTc1IiB5PSIxMjEiIHdpZHRoPSI0IiBoZWlnaHQ9IjgiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjE3NSIgeT0iMTMzIiB3aWR0aD0iNCIgaGVpZ2h0PSIxMiIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iNTkiIHk9IjExNyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjU5IiB5PSIxMjkiIHdpZHRoPSIyMCIgaGVpZ2h0PSI0IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSI1OSIgeT0iMTQxIiB3aWR0aD0iMjAiIGhlaWdodD0iNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iNTkiIHk9IjEyMSIgd2lkdGg9IjQiIGhlaWdodD0iMjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjEwOSIgeT0iMTE3IiB3aWR0aD0iMjAiIGhlaWdodD0iNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTE3IiB5PSIxMjEiIHdpZHRoPSI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSI1OSIgeT0iMTU1IiB3aWR0aD0iMjAiIGhlaWdodD0iNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iNjciIHk9IjE1OSIgd2lkdGg9IjQiIGhlaWdodD0iMjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9Ijg4IiB5PSIxMTciIHdpZHRoPSIxMiIgaGVpZ2h0PSI0IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSI4NCIgeT0iMTI5IiB3aWR0aD0iMjAiIGhlaWdodD0iNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iODQiIHk9IjEyMSIgd2lkdGg9IjQiIGhlaWdodD0iMjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjEwMCIgeT0iMTIxIiB3aWR0aD0iNCIgaGVpZ2h0PSIyNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTM4IiB5PSIxMTciIHdpZHRoPSIxMiIgaGVpZ2h0PSI0IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxMzgiIHk9IjE0MSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjEzNCIgeT0iMTIxIiB3aWR0aD0iNCIgaGVpZ2h0PSIyMCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTUwIiB5PSIxMjEiIHdpZHRoPSI0IiBoZWlnaHQ9IjIwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxMyIgeT0iMTE3IiB3aWR0aD0iMTIiIGhlaWdodD0iNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTMiIHk9IjE0MSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjI1IiB5PSIxMzciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjI1IiB5PSIxMjEiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjkiIHk9IjEyMSIgd2lkdGg9IjQiIGhlaWdodD0iMjAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjEzIiB5PSIxNjciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjE3IiB5PSIxNzEiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjIxIiB5PSIxNzUiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjI1IiB5PSIxNzkiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjE3IiB5PSIxNjMiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjIxIiB5PSIxNTkiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjI1IiB5PSIxNTUiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjkiIHk9IjE1NSIgd2lkdGg9IjQiIGhlaWdodD0iMjgiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjM4IiB5PSIxNTUiIHdpZHRoPSIxMiIgaGVpZ2h0PSI0IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIzOCIgeT0iMTc5IiB3aWR0aD0iMTIiIGhlaWdodD0iNCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iNDIiIHk9IjE1NSIgd2lkdGg9IjQiIGhlaWdodD0iMjgiIGZpbGw9ImJsYWNrIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfMTU1XzE1NTMiIHgxPSI4LjUiIHkxPSI4NyIgeDI9IjExOC44ODkiIHkyPSIxMzguOTg1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRTk5MkIiLz4KPHN0b3Agb2Zmc2V0PSIwLjI3MzIxMyIgc3RvcC1jb2xvcj0iIzA2RDRDNyIvPgo8c3RvcCBvZmZzZXQ9IjAuNjE4OTQxIiBzdG9wLWNvbG9yPSIjRjRBQ0U4Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZCODEwRSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: bottom left;
    pointer-events: none;
  }
  .htmdx-nav-link {
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
  .htmdx-nav-link:hover {
    background: color-mix(in srgb, var(--md-sys-color-primary) calc(var(--md-sys-state-hover-opacity) * 100%), transparent);
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-nav-item.is-active .htmdx-nav-link {
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
  .htmdx-doc-section-title {
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
  .htmdx-doc-section-card > ul {
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

  .htmdx-finding .htmdx-feature-grid,
  .htmdx-risk-table .htmdx-feature-grid { display: block; }
  .htmdx-finding .htmdx-feature-item { position: relative; padding: 10px 0 10px 22px; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
  .htmdx-finding .htmdx-feature-item:last-child,
  .htmdx-risk-table .htmdx-feature-item:last-child { border-bottom: none; }
  .htmdx-finding .htmdx-feature-item::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 18px;
    width: 7px;
    height: 7px;
    background: var(--md-sys-color-primary);
    border-radius: var(--md-sys-shape-corner-full);
  }
  .htmdx-feature-title { display: block; font-weight: 700; color: var(--md-sys-color-on-surface); }
  .htmdx-feature-text { display: block; color: var(--md-sys-color-on-surface-variant); }

  .htmdx-compare .htmdx-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .htmdx-compare .htmdx-feature-item {
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 16px 20px;
    background: var(--md-sys-color-surface-container-lowest);
  }
  .htmdx-compare .htmdx-feature-title { margin-bottom: 4px; }
  .htmdx-compare .htmdx-feature-text { font-size: 0.9375rem; }

  .htmdx-timeline .htmdx-feature-grid { display: block; margin-left: 4px; }
  .htmdx-timeline .htmdx-feature-item { position: relative; padding: 6px 0 22px 28px; }
  .htmdx-timeline .htmdx-feature-item:last-child { padding-bottom: 4px; }
  /* Node marker, drawn above the connector so the rail threads through it. */
  .htmdx-timeline .htmdx-feature-item::before {
    content: "";
    position: absolute;
    left: 0;
    top: 13px;
    width: 10px;
    height: 10px;
    box-sizing: border-box;
    background: var(--md-sys-color-surface-container-lowest);
    border: 2px solid var(--md-sys-color-primary);
    border-radius: var(--md-sys-shape-corner-full);
    z-index: 1;
  }
  /* Connector to the next node; last item has none, so the rail brackets the
     nodes instead of dangling past them. */
  .htmdx-timeline .htmdx-feature-item::after {
    content: "";
    position: absolute;
    left: 4px;
    top: 18px;
    bottom: -18px;
    width: 2px;
    background: var(--md-sys-color-primary);
  }
  .htmdx-timeline .htmdx-feature-item:last-child::after { display: none; }
  .htmdx-timeline .htmdx-feature-title { color: var(--md-sys-color-on-surface); }
  .htmdx-timeline .htmdx-feature-text { color: var(--md-sys-color-on-surface-variant); }

  .htmdx-metric-strip .htmdx-component-body,
  .htmdx-stat .htmdx-component-body {
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    background: var(--md-sys-color-surface-container-lowest);
    overflow: hidden;
  }
  .htmdx-metric-grid { display: flex; flex-wrap: wrap; }
  .htmdx-metric-item {
    flex: 1 1 16%;
    padding: 18px 20px;
    border-right: 1px solid var(--md-sys-color-outline-variant);
  }
  .htmdx-metric-item:last-child { border-right: none; }
  .htmdx-metric-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--md-sys-color-on-surface-variant);
    margin-bottom: 8px;
  }
  .htmdx-metric-value {
    display: block;
    font-family: var(--md-ref-typeface-brand);
    font-size: 1.75rem;
    line-height: 2.25rem;
    font-weight: 500;
    letter-spacing: normal;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-metric-item:last-child .htmdx-metric-value { color: var(--md-sys-color-primary); }

  .htmdx-evidence .htmdx-component-body {
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    background: var(--md-sys-color-surface-container-lowest);
    padding: 16px 20px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .htmdx-evidence .htmdx-feature-item + .htmdx-feature-item { margin-top: 12px; }

  .htmdx-source-quote .htmdx-component-body p {
    font-size: 0.9375rem;
    color: var(--md-sys-color-on-surface-variant);
    border-left: 3px solid var(--md-sys-color-primary);
    padding-left: 16px;
    margin: 6px 0;
    line-height: 1.55;
  }

  .htmdx-risk-table .htmdx-feature-item {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 16px;
    align-items: start;
    padding: 12px 0;
    border-bottom: 1px solid var(--htmdx-line);
  }
  .htmdx-risk-table .htmdx-feature-title {
    display: block;
    white-space: nowrap;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 6px 12px;
    border-radius: var(--md-sys-shape-corner-small);
    text-align: center;
    align-self: start;
  }
  .htmdx-risk-table .htmdx-feature-item[data-tier="must-have"] .htmdx-feature-title { background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="differentiator"] .htmdx-feature-title { background: var(--md-sys-color-tertiary-container); color: var(--md-sys-color-on-tertiary-container); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="not-now"] .htmdx-feature-title { background: var(--md-sys-color-surface-variant); color: var(--md-sys-color-on-surface-variant); border: 1px solid var(--md-sys-color-outline-variant); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="wont-do"] .htmdx-feature-title { background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); }

  .htmdx-doc-section-card table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; margin: 6px 0; }
  .htmdx-doc-section-card thead th {
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
  .htmdx-doc-section-card tbody th {
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
  .htmdx-doc-section-card tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    text-align: left;
    vertical-align: top;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-doc-section-card tbody tr:last-child td,
  .htmdx-doc-section-card tbody tr:last-child th { border-bottom: none; }
  .htmdx-doc-section-card tbody tr:hover td,
  .htmdx-doc-section-card tbody tr:hover th {
    background: color-mix(in srgb, var(--md-sys-color-primary) calc(var(--md-sys-state-hover-opacity) * 100%), transparent);
  }
  /* DataTable: grey-bordered rounded frame around the table itself.
     border-collapse: separate + overflow:hidden lets the 12px radius clip the
     header fill and the corner cells. */
  .htmdx-data-table table,
  .htmdx-decision-table table {
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 12px;
    overflow: hidden;
    margin: 0;
  }
  /* Match the header divider to the table frame color, not the darker outline. */
  .htmdx-data-table thead th { border-bottom-color: var(--md-sys-color-outline-variant); }

  .htmdx-chart svg { width: 100%; height: auto; max-height: 240px; }
  .htmdx-chart-bar { fill: var(--md-chart-series-0); }
  .htmdx-chart-bar[data-series="1"] { fill: var(--md-chart-series-1); }
  .htmdx-chart-bar[data-series="2"] { fill: var(--md-chart-series-2); }
  .htmdx-chart-bar[data-series="3"] { fill: var(--md-chart-series-3); }
  .htmdx-chart-bar[data-series="4"] { fill: var(--md-chart-series-4); }
  .htmdx-chart-axis { stroke: var(--md-sys-color-outline-variant); }
  .htmdx-chart-label { fill: var(--md-sys-color-on-surface-variant); font-size: 11px; font-family: var(--md-ref-typeface-plain); }

  /* Bare components sit inside a card, like Evidence and MetricStrip */
  .htmdx-finding .htmdx-component-body,
  .htmdx-source-quote .htmdx-component-body,
  .htmdx-risk-table .htmdx-component-body,
  .htmdx-timeline .htmdx-component-body,
  .htmdx-data-table .htmdx-component-body,
  .htmdx-decision-table .htmdx-component-body,
  .htmdx-chart-bar .htmdx-component-body,
  .htmdx-chart-line .htmdx-component-body,
  .htmdx-chart-area .htmdx-component-body,
  .htmdx-chart-pie .htmdx-component-body {
    background: var(--md-sys-color-surface-container-lowest);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 16px 20px;
  }

  @media (max-width: 960px) {
    .htmdx-app { grid-template-columns: minmax(0, 1fr); }
    .htmdx-nav { display: none; }
    .htmdx-content { padding: 16px 20px 64px; }
    .htmdx-hero { padding: 48px 0; border-radius: var(--md-sys-shape-corner-medium); }
    .htmdx-hero-inner { margin-left: 0; width: auto; padding: 0 24px; }
    .htmdx-doc-section-card { width: auto; }
    .htmdx-doc-section-title { width: auto; }
  }
  @media (max-width: 720px) {
    .htmdx-hero-title { font-size: 2.5rem; }
    .htmdx-doc-section-card { padding: 16px; }
    .htmdx-compare .htmdx-feature-grid { grid-template-columns: 1fr; }
    .htmdx-metric-item { flex-basis: 50%; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
  }
`;
