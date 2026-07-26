// React renderer for HTMDX — "MDX minus JavaScript".
//
// Renders an HTMDX source string to a React element tree. Component tags are
// resolved from an MDX-style `components` map; nested composition is parsed
// as data — no expressions, no eval, no function props. Component bodies are
// parsed as XML first (preserves tag/attribute case), falling back to HTML
// parsing when the body is not well-formed.

import { Component, createElement, Fragment, type ReactElement, type ReactNode } from 'react';
import {
  escapeCodeSpans,
  HtmdxBodyContractError,
  markdownSyntaxSource,
  unescapeCodeSpans,
} from '../components/body-contracts';
import {
  createDefinitionRegistry,
  validateConstraints,
  type HtmdxComponent,
  type HtmdxComponentDefinitions,
  type HtmdxProp,
} from '../component-definition';
import {
  HTML_BLOCK_ELEMENTS,
  HTML_FLOW_CONTAINERS,
  HTML_ELEMENTS,
  HTML_VOID_ELEMENTS,
  safeElementProps,
} from '../components/html-elements';
import { SVG_ELEMENTS, safeSvgProps } from '../components/svg-elements';
import { safeImageAttributes, uniqueSlug, type RenderContext } from '../components/rendering';
import { BUILT_IN_LOGOS } from '../logos';
import { getLayout, resolveLayoutName, resolveLayoutSlots } from '../layout';
import { renderInline, renderMarkdown, type HtmlRenderer } from './markdown';
import { COPY_LABEL, errorDiagnostics, formatErrorDetails } from '../fix-request';
import { THEME_IDS } from '../themes';
import {
  HtmdxSourceError,
  toDiagnostic,
  type HtmdxDiagnostic,
  type HtmdxDiagnosticCode,
} from '../diagnostics';

export type HtmdxReactOptions = {
  definitions?: HtmdxComponentDefinitions;
};

export type HtmdxBlockFailure = {
  /** Offset of the block's opening tag inside the tokenized source. */
  offset: number;
  name: string;
  error: unknown;
  componentStack?: string;
};

export type HtmdxDocumentOptions = HtmdxReactOptions & {
  layout?: string;
  /**
   * Opt into degraded rendering: a block that fails to build or to render is
   * replaced by an error card and reported here instead of failing the
   * document. Without it a block failure still throws, so compile() keeps
   * refusing to emit a half-broken page.
   */
  onBlockError?: (failure: HtmdxBlockFailure) => void;
};

type RuntimeCatalog = {
  definitions: Map<string, HtmdxComponent>;
  names: Map<string, string>;
};

type Block =
  | { type: 'markdown'; value: string; offset: number }
  | { type: 'html'; value: string; offset: number }
  | { type: 'component'; name: string; attrs: string; body: string; offset: number };

function createRuntimeCatalog(options: HtmdxReactOptions): RuntimeCatalog {
  const definitions = createDefinitionRegistry(options.definitions);
  const names = new Map(
    Array.from(definitions.values(), (definition) => [
      definition.name.toLowerCase(),
      definition.name,
    ]),
  );
  return { definitions, names };
}

export function compileToReact(source: string, options: HtmdxReactOptions = {}): ReactElement {
  const catalog = createRuntimeCatalog(options);
  const normalized = stripFrontmatterAndComments(source);
  const blocks = tokenize(normalized, catalog.names);
  const context: RenderContext = { headings: [], slugCounts: new Map() };
  const children = renderBlocks(blocks, catalog, context);

  return createElement(Fragment, null, ...children);
}

export function Htmdx(props: { source: string } & HtmdxReactOptions): ReactElement {
  return compileToReact(props.source, { definitions: props.definitions });
}

export type HtmdxDocument = {
  element: ReactElement;
  title: string;
  headings: { id: string; label: string }[];
  components: string[];
  meta: Record<string, string>;
};

// Full-document compile used by register()/compile(). The implicit default
// preserves the existing page chrome; blank and registered layouts own their
// composition around the same source content.
export function compileDocument(source: string, options: HtmdxDocumentOptions = {}): HtmdxDocument {
  const catalog = createRuntimeCatalog(options);
  const meta = parseFrontmatter(source);
  const title = titleFromSource(source, meta);
  const normalized = stripFrontmatterAndComments(source);
  const { onBlockError } = options;
  // An unrecognised tag is caught by the tokenizer, before there is a block to
  // wrap. Degraded mode leaves it as literal text and counts it as a failure so
  // the page still says something went wrong.
  const blocks = tokenize(
    normalized,
    catalog.names,
    onBlockError &&
      ((error) => {
        // An unclosed tag leaves no reliable body boundary, so everything after
        // it is guesswork. That is a document-level failure, not a block one.
        if (error.code === 'unclosed-component') {
          throw error;
        }
        onBlockError({
          offset: error.offset ?? 0,
          name: error.message.match(/<([A-Za-z][A-Za-z0-9]*)>/)?.[1] ?? 'unknown',
          error,
        });
      }),
  );
  const context: RenderContext = { headings: [], slugCounts: new Map() };

  const layout = resolveLayoutName(options.layout || meta.layout || 'default');
  if (layout === 'blank') {
    const theme = themeFromMeta(meta);
    return {
      element: createElement(
        'div',
        {
          className: 'htmdx-app htmdx-app--blank',
          ...(theme ? { 'data-htmdx-theme': theme } : {}),
        },
        createElement(
          'main',
          { className: 'htmdx-doc htmdx-page' },
          createElement(
            'article',
            { className: 'htmdx-article' },
            ...renderBlocks(blocks, catalog, context, options.onBlockError),
          ),
        ),
      ),
      title,
      headings: context.headings,
      components: componentNames(blocks, catalog.names),
      meta,
    };
  }

  if (layout !== 'default') {
    const definition = getLayout(layout);
    if (!definition) {
      throw new HtmdxSourceError('unknown-layout', `unknown layout "${layout}"`);
    }
    const theme = themeFromMeta(meta);
    const children = renderBlocks(blocks, catalog, context, options.onBlockError);
    return {
      element: createElement(
        'div',
        {
          className: 'htmdx-app htmdx-app--custom',
          'data-htmdx-layout': definition.name,
          ...(theme ? { 'data-htmdx-theme': theme } : {}),
        },
        createElement(definition.Component, {
          slots: resolveLayoutSlots(definition, meta),
          children,
        }),
      ),
      title,
      headings: context.headings,
      components: componentNames(blocks, catalog.names),
      meta,
    };
  }
  const lead = title ? extractHeroContent(blocks) : '';
  const sections = groupSections(blocks, catalog, context, options.onBlockError);
  const inlineHtml = inlineHtmlRenderer(catalog);

  const sectionElements = sections
    .filter((section) => section.heading || section.children.length > 0)
    .map((section, index) =>
      createElement(
        'section',
        { className: 'htmdx-doc-section', key: section.heading?.id || `head-${index}` },
        section.heading
          ? createElement(
              'h2',
              { id: section.heading.id },
              renderInline(section.heading.label, inlineHtml),
            )
          : null,
        createElement('div', { className: 'htmdx-doc-section-card' }, ...section.children),
      ),
    );

  const main = createElement(
    'main',
    { className: 'htmdx-doc htmdx-page', key: 'main' },
    createElement('article', { className: 'htmdx-article' }, ...sectionElements),
  );

  const hasNav = context.headings.length >= 2;
  const content = createElement(
    'div',
    { className: 'htmdx-content', key: 'content' },
    title ? renderStickyHeader(title, meta) : null,
    title ? renderHero(title, lead, meta) : null,
    createElement('div', { className: 'htmdx-shell', key: 'shell' }, main),
  );

  const theme = themeFromMeta(meta);

  return {
    element: createElement(
      'div',
      {
        className: hasNav ? 'htmdx-app' : 'htmdx-app htmdx-app--no-nav',
        ...(theme ? { 'data-htmdx-theme': theme } : {}),
      },
      hasNav ? renderToc(context.headings, meta) : null,
      content,
    ),
    title,
    headings: context.headings,
    components: componentNames(blocks, catalog.names),
    meta,
  };
}

function renderBlocks(
  blocks: Block[],
  catalog: RuntimeCatalog,
  context: RenderContext,
  onBlockError?: BlockErrorHandler,
) {
  const html = inlineHtmlRenderer(catalog);
  return blocks.map((block, index) => {
    if (block.type === 'markdown') {
      return createElement(
        'div',
        { key: `md-${index}` },
        renderMarkdown(block.value, context, html),
      );
    }
    if (block.type === 'html') {
      return guardBlock(block, `html-${index}`, onBlockError, () =>
        renderHtmlFragment(block.value, catalog, `html-${index}`, true),
      );
    }
    return guardBlock(block, `c-${index}`, onBlockError, () =>
      renderComponentBlock(block, catalog, `c-${index}`),
    );
  });
}

type BlockErrorHandler = (failure: HtmdxBlockFailure) => void;
type GuardedBlock = Exclude<Block, { type: 'markdown' }>;

// Without a handler a failing block throws and takes the document with it,
// which is what compile() wants. With one, everything that still compiles
// renders and each casualty becomes a card in its own place. A block can fail
// while the tree is built (unknown component, malformed body) or later, inside
// React's render (a component rejecting its own body), so both are covered.
function guardBlock(
  block: GuardedBlock,
  key: string,
  onBlockError: BlockErrorHandler | undefined,
  render: () => ReactNode,
): ReactNode {
  if (!onBlockError) {
    return render();
  }

  try {
    return createElement(
      HtmdxBlockBoundary,
      { key, block, onBlockError, resetKey: blockSource(block) },
      render(),
    );
  } catch (error) {
    onBlockError({ offset: block.offset, name: blockLabel(block), error });
    return blockErrorCard(block, error, key);
  }
}

type BoundaryProps = {
  block: GuardedBlock;
  onBlockError: BlockErrorHandler;
  resetKey: string;
  children?: ReactNode;
};

class HtmdxBlockBoundary extends Component<BoundaryProps, { error: unknown; resetKey: string }> {
  state = { error: null as unknown, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  // A rerender with new source must clear a stale failure; React keeps
  // boundary state until the instance unmounts, and the key is positional.
  static getDerivedStateFromProps(props: BoundaryProps, state: { resetKey: string }) {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    this.props.onBlockError({
      offset: this.props.block.offset,
      name: blockLabel(this.props.block),
      error,
      ...(info.componentStack ? { componentStack: info.componentStack } : {}),
    });
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return blockErrorCard(this.props.block, this.state.error);
  }
}

function blockSource(block: GuardedBlock) {
  return block.type === 'html' ? block.value : `${block.attrs} ${block.body}`;
}

function blockLabel(block: GuardedBlock) {
  if (block.type === 'component') {
    return block.name;
  }
  return block.value.match(/^<\s*([A-Za-z][A-Za-z0-9-]*)/)?.[1] ?? 'html';
}

// The card stands in for the block, so it says what broke and offers the same
// copy action as the whole-page error. `data-htmdx-block` ties it back to the
// failure the handler recorded, which is what the copy handler reads.
function blockErrorCard(block: GuardedBlock, error: unknown, key?: string): ReactNode {
  const label = blockLabel(block);
  const message = error instanceof Error ? error.message : String(error);
  const receivedInput =
    error instanceof HtmdxBodyContractError ? error.contract.receivedInput : undefined;

  return createElement(
    'div',
    {
      className: 'htmdx-block-error',
      'data-htmdx-block': String(block.offset),
      role: 'note',
      ...(key ? { key } : {}),
    },
    createElement('p', { className: 'htmdx-block-error-title' }, `<${label}> did not render`),
    createElement('p', { className: 'htmdx-block-error-message' }, message),
    receivedInput
      ? createElement('pre', { className: 'htmdx-block-error-input' }, receivedInput)
      : null,
    createElement(
      'button',
      {
        type: 'button',
        className: 'htmdx-block-error-fix',
        'data-htmdx-fix': String(block.offset),
      },
      COPY_LABEL,
    ),
    createElement(
      'details',
      null,
      createElement('summary', null, 'Error details'),
      // Same shape as the whole-page panel, minus the artifact position: only
      // the runtime scans the surrounding source, and the copied fix request
      // is where that position belongs.
      createElement(
        'pre',
        null,
        formatErrorDetails(
          errorDiagnostics(error instanceof HtmdxSourceError ? 'compile' : 'render', error),
        ),
      ),
    ),
  );
}

// Inline HTML sits inside a Markdown line, so its text nodes stay inline;
// block-level HTML owns whole lines and renders Markdown text as blocks.
function inlineHtmlRenderer(catalog: RuntimeCatalog): HtmlRenderer {
  return (source, key) => renderHtmlFragment(source, catalog, key, false);
}

function renderHtmlFragment(
  source: string,
  catalog: RuntimeCatalog,
  key: string,
  blockMarkdownText: boolean,
): ReactNode {
  const { nodes, sourceElements } = parseBodyNodes(source);
  const children = nodes
    .map((node, index) =>
      nodeToReact(node, catalog, `${key}-${index}`, { sourceElements, blockMarkdownText }),
    )
    .filter((child) => child !== null);
  return createElement(Fragment, { key }, ...children);
}

type Section = {
  heading: { id: string; label: string } | null;
  children: ReactNode[];
};

// Sections are split on `## ` heading lines. Headings are located on the
// masked syntax (code fences and inline code blanked out, positions
// preserved) so a `## ` inside a fence never splits, then sliced from the
// original value so labels keep their literal text.
function groupSections(
  blocks: Block[],
  catalog: RuntimeCatalog,
  context: RenderContext,
  onBlockError?: BlockErrorHandler,
): Section[] {
  const sections: Section[] = [{ heading: null, children: [] }];
  let current = sections[0];
  const html = inlineHtmlRenderer(catalog);

  const pushChunk = (chunk: string, key: string) => {
    const trimmed = chunk.trim();
    if (trimmed) {
      current.children.push(createElement('div', { key }, renderMarkdown(trimmed, context, html)));
    }
  };

  for (const [index, block] of blocks.entries()) {
    if (block.type === 'html') {
      current.children.push(
        createElement(
          'div',
          { className: 'htmdx-content-component', key: `h-${index}` },
          guardBlock(block, `h-${index}-content`, onBlockError, () =>
            renderHtmlFragment(block.value, catalog, `h-${index}-content`, true),
          ),
        ),
      );
      continue;
    }

    if (block.type === 'component') {
      // Mark only top-level Component blocks so the document shell can own
      // their vertical rhythm without affecting prose or nested composition.
      current.children.push(
        createElement(
          'div',
          { className: 'htmdx-content-component', key: `c-${index}` },
          guardBlock(block, `c-${index}-content`, onBlockError, () =>
            renderComponentBlock(block, catalog, `c-${index}-content`),
          ),
        ),
      );
      continue;
    }

    const syntax = markdownSyntaxSource(block.value);
    const headingLines = Array.from(syntax.matchAll(/^## +.+$/gm));
    let cursor = 0;
    for (const [headingIndex, match] of headingLines.entries()) {
      pushChunk(block.value.slice(cursor, match.index), `md-${index}-${headingIndex}`);
      const label = block.value.slice(match.index + 3, match.index + match[0].length).trim();
      const id = uniqueSlug(label, context);
      context.headings.push({ id, label });
      current = { heading: { id, label }, children: [] };
      sections.push(current);
      cursor = match.index + match[0].length;
    }
    pushChunk(block.value.slice(cursor), `md-${index}-tail`);
  }

  return sections;
}

// The hero owns the document title and lead paragraph, so both are removed
// from the article content: the leading `# ...` block is dropped and the
// first plain paragraph before any `## ` heading becomes the hero lead.
function extractHeroContent(blocks: Block[]): string {
  const first = blocks[0];
  if (!first || first.type !== 'markdown') {
    return '';
  }

  let value = first.value;
  if (value.startsWith('# ')) {
    const titleBlock = value.split(/\n{2,}/, 1)[0];
    value = value.slice(titleBlock.length).trim();
  }

  let lead = '';
  const headingLine = markdownSyntaxSource(value).match(/^## +.+$/m);
  const head = headingLine ? value.slice(0, headingLine.index) : value;
  const firstChunk = head.split(/\n{2,}/, 1)[0].trim();
  if (firstChunk && !/^(#|- |```)/.test(firstChunk)) {
    lead = firstChunk.replace(/\n/g, ' ');
    value = value.slice(value.indexOf(firstChunk) + firstChunk.length).trim();
  }

  if (value) {
    blocks[0] = { type: 'markdown', value, offset: first.offset };
  } else {
    blocks.shift();
  }
  return lead;
}

function renderStickyHeader(title: string, meta: Record<string, string>) {
  return createElement(
    'div',
    { className: 'htmdx-sticky-header', 'aria-hidden': 'true', key: 'sticky-header' },
    createElement(
      'div',
      { className: 'htmdx-sticky-header-inner' },
      createElement('span', { className: 'htmdx-sticky-title', key: 'title' }, renderInline(title)),
      createElement('span', { className: 'htmdx-sticky-divider', key: 'divider' }, '|'),
      createElement(
        'span',
        { className: 'htmdx-sticky-project', key: 'project' },
        renderInline(meta.project || '{Project Name}'),
      ),
    ),
  );
}

function renderHeroLabel(name: string, value: string) {
  return createElement(
    'span',
    { className: 'htmdx-hero-label', key: name },
    `${name} `,
    createElement('b', null, renderInline(value)),
  );
}

function renderHero(title: string, lead: string, meta: Record<string, string>) {
  return createElement(
    'header',
    { className: 'htmdx-hero', key: 'hero' },
    createElement(
      'div',
      { className: 'htmdx-hero-inner' },
      createElement(
        'p',
        { className: 'htmdx-hero-eyebrow', key: 'eyebrow' },
        renderInline(meta.project || '{Project Name}'),
      ),
      createElement('h1', { className: 'htmdx-hero-title', key: 'title' }, renderInline(title)),
      meta.subtitle
        ? createElement(
            'p',
            { className: 'htmdx-hero-subtitle', key: 'subtitle' },
            renderInline(meta.subtitle),
          )
        : null,
      lead
        ? createElement('p', { className: 'htmdx-hero-desc', key: 'desc' }, renderInline(lead))
        : null,
      createElement(
        'div',
        { className: 'htmdx-hero-labels', key: 'labels' },
        renderHeroLabel('Owner', meta.owner || '{name}'),
        renderHeroLabel('Phase', meta.phase || '{Flow / Skill}'),
        renderHeroLabel('Updated', meta.updated || '{Date}'),
      ),
    ),
  );
}

function renderToc(headings: { id: string; label: string }[], meta: Record<string, string>) {
  const items = headings.map((heading) =>
    createElement(
      'li',
      { className: 'htmdx-toc-item', key: heading.id },
      createElement(
        'a',
        {
          className: 'htmdx-toc-link',
          href: `#${heading.id}`,
          'data-htmdx-target': heading.id,
        },
        renderInline(heading.label),
      ),
    ),
  );

  const logoSrc = meta.logo && (BUILT_IN_LOGOS.get(meta.logo.toLowerCase()) ?? meta.logo);

  return createElement(
    'nav',
    { className: 'htmdx-toc', 'aria-label': 'Sections', key: 'toc' },
    createElement('ol', { className: 'htmdx-toc-list' }, ...items),
    logoSrc
      ? createElement('img', {
          className: 'htmdx-nav-logo',
          src: logoSrc,
          alt: meta['logo-alt'] || '',
          key: 'logo',
        })
      : null,
  );
}

// Unknown ids and the default (first) id fall back to the base palette so
// the attribute only appears when it changes something.
function themeFromMeta(meta: Record<string, string>) {
  const theme = meta.theme?.trim().toLowerCase();
  if (!theme || theme === THEME_IDS[0]) {
    return undefined;
  }
  return (THEME_IDS as readonly string[]).includes(theme) ? theme : undefined;
}

function parseFrontmatter(source: string): Record<string, string> {
  const match = source.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) {
      meta[field[1].toLowerCase()] = field[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return meta;
}

function titleFromSource(source: string, meta: Record<string, string>) {
  if (meta.title) {
    return meta.title;
  }

  const markdownTitle = source.match(/^#\s+(.+)$/m);
  return markdownTitle ? markdownTitle[1].trim() : '';
}

export function listComponents(
  source: string,
  definitions: HtmdxComponentDefinitions = [],
): string[] {
  const registry = new Map(
    definitions.map((definition) => [definition.name.toLowerCase(), definition.name]),
  );
  return componentNames(tokenize(stripFrontmatterAndComments(source), registry), registry);
}

export type HtmdxSourceToken =
  | { type: 'markdown'; value: string }
  | { type: 'html'; value: string }
  | { type: 'component'; name: string; body: string };

export function tokenizeSource(
  source: string,
  definitions: HtmdxComponentDefinitions = [],
): HtmdxSourceToken[] {
  const registry = new Map(
    definitions.map((definition) => [definition.name.toLowerCase(), definition.name]),
  );
  return tokenize(stripFrontmatterAndComments(source), registry).map((block) =>
    block.type === 'component'
      ? { type: 'component' as const, name: block.name, body: block.body }
      : { type: block.type, value: block.value },
  );
}

// Components nested inside a raw HTML block are still part of the document, so
// the reported list scans those blocks instead of stopping at the wrapper.
function componentNames(blocks: Block[], registry: Map<string, string>) {
  return blocks.flatMap((block) => {
    if (block.type === 'component') {
      return [block.name];
    }
    if (block.type !== 'html') {
      return [];
    }
    const names: string[] = [];
    const syntax = markdownSyntaxSource(block.value);
    const openTag = /<([A-Za-z][A-Za-z0-9]*)/g;
    let match: RegExpExecArray | null;
    while ((match = openTag.exec(syntax))) {
      const canonical = registry.get(match[1].toLowerCase());
      if (canonical) {
        names.push(canonical);
      }
    }
    return names;
  });
}

function renderComponentBlock(
  block: Block & { type: 'component' },
  catalog: RuntimeCatalog,
  key: string,
): ReactNode {
  const definition = catalog.definitions.get(block.name.toLowerCase());
  if (!definition) {
    throw new HtmdxSourceError('unknown-component', `unknown component <${block.name}>`);
  }
  return renderDefinition(
    definition,
    definitionPropsFromAttributes(definition, parseAttributes(block.attrs)),
    block.body,
    catalog,
    key,
  );
}

function renderDefinition(
  definition: HtmdxComponent,
  props: Record<string, unknown>,
  body: string,
  catalog: RuntimeCatalog,
  key: string,
): ReactNode {
  const componentProps = { ...props, key };
  if (definition.body === 'markdown') {
    if (hasBodyElements(body)) {
      throw new HtmdxSourceError(
        'markdown-body-nested-tags',
        `component <${definition.name}> with markdown body does not allow nested tags`,
      );
    }
    assertDeclarativeBody(definition.name, body);
    return createElement(definition.Component, { ...componentProps, body });
  }
  if (definition.body === 'none') {
    if (body.trim()) {
      throw new HtmdxSourceError(
        'body-not-allowed',
        `component <${definition.name}> does not allow a body`,
      );
    }
    return createElement(definition.Component, componentProps);
  }
  assertDeclarativeBody(definition.name, body, true);
  return createElement(
    definition.Component,
    componentProps,
    htmdxBodyToChildren(body, catalog, key),
  );
}

const tableHtmlContainers = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr']);

function htmdxBodyToChildren(body: string, catalog: RuntimeCatalog, keyPrefix: string): ReactNode {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }
  if (!hasBodyElements(body) && !isBlockMarkdown(trimmed)) {
    return renderInline(trimmed);
  }
  return bodyToChildren(body, catalog, keyPrefix);
}

function isBlockMarkdown(body: string): boolean {
  return /\r?\n/.test(body) || /^(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|~~~|---$)/.test(body);
}

function bodyToChildren(body: string, catalog: RuntimeCatalog, keyPrefix: string): ReactNode {
  if (!body) {
    return null;
  }

  // Element detection runs on the masked syntax so tags inside inline code
  // or fences (markdown literals) don't get parsed as component markup.
  if (!hasBodyElements(body)) {
    return createElement(
      'div',
      { key: keyPrefix },
      renderMarkdown(body, { headings: [], slugCounts: new Map() }),
    );
  }

  const { nodes, sourceElements } = parseBodyNodes(body);

  const children = nodes
    .map((node, index) =>
      nodeToReact(node, catalog, `${keyPrefix}-${index}`, { sourceElements, componentBody: true }),
    )
    .filter((child) => child !== null);
  return children.length === 1 ? children[0] : children;
}

function hasBodyElements(body: string) {
  return /<\/?[A-Za-z][A-Za-z0-9]*(\s[^>]*)?\/?>|<>|<\/>/.test(markdownSyntaxSource(body));
}

// A component body and a raw HTML block are parsed the same way but answer to
// different rules. A body is pre-existing surface: it keeps the passthrough and
// the wrapper `<span>` it has always had. A raw HTML block is new surface, so
// it answers to the allowlist and emits no wrapper.
type NodeContext = {
  sourceElements?: WeakMap<Element, SourceElement>;
  componentBody?: boolean;
  blockMarkdownText?: boolean;
  discardWhitespaceText?: boolean;
  /** Inside an `<svg>` subtree, where SVG's element and attribute space applies. */
  svg?: boolean;
};

function nodeToReact(
  node: Node,
  catalog: RuntimeCatalog,
  key: string,
  context: NodeContext = {},
): ReactNode | null {
  const {
    sourceElements = new WeakMap<Element, SourceElement>(),
    componentBody = false,
    blockMarkdownText = true,
    discardWhitespaceText = false,
    svg = false,
  } = context;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) {
      return null;
    }
    // Text in a graphic belongs to `<text>`/`<tspan>`, which render it as is.
    // Markdown and the wrapper elements it produces have no meaning there.
    if (svg) {
      return text;
    }
    // HTML forbids text directly inside table structure containers. Treat
    // their whitespace as source formatting while keeping spaces elsewhere.
    if (discardWhitespaceText && !text.trim()) {
      return null;
    }
    if (blockMarkdownText && text.trim() && isBlockMarkdown(text)) {
      return createElement(Fragment, { key }, ...renderMarkdown(text));
    }
    if (!text.trim()) {
      return text;
    }
    return createElement(componentBody ? 'span' : Fragment, { key }, renderInline(text));
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const lower = element.tagName.toLowerCase();

  // Inside a graphic, SVG's element space wins. A registered component or an
  // HTML tag that happens to share a name with `<text>` or `<path>` has no
  // meaning between `<svg>` and `</svg>`.
  if (svg) {
    return svgToReact(element, catalog, key, sourceElements);
  }

  if (lower === 'img') {
    const attributes = Object.fromEntries(
      element.getAttributeNames().map((name) => [name, element.getAttribute(name) ?? '']),
    );
    const safeAttributes = safeImageAttributes(attributes);
    return safeAttributes
      ? createElement('img', { key, ...safeAttributes })
      : attributes.alt || null;
  }
  const definition = catalog.definitions.get(lower);
  if (definition) {
    const attributes =
      sourceElements.get(element)?.attributes ||
      element.getAttributeNames().map((name) => ({
        name,
        value: element.getAttribute(name) ?? '',
        bare: false,
        fromDom: true,
      }));
    return renderDefinition(
      definition,
      definitionPropsFromAttributes(definition, attributes),
      unescapeCodeSpans(element.innerHTML).trim(),
      catalog,
      key,
    );
  }

  if (lower === 'svg') {
    return svgToReact(element, catalog, key, sourceElements);
  }

  // The allowlist decides before casing does. The HTML fallback parse uppercases
  // every tag name, so reading the authored name first would reject `<video>` as
  // a missing component whenever the source pairing could not be recovered.
  if (!HTML_ELEMENTS.has(lower)) {
    const authored = sourceElements.get(element)?.name || lower;
    if (/^[A-Z]/.test(authored)) {
      throw new HtmdxSourceError('unknown-component', `unknown component <${authored}>`);
    }
    return componentBody
      ? passthroughElement(element, catalog, key, sourceElements)
      : // Outside a body, an element the allowlist does not cover is not markup.
        // Markdown already renders it as literal text, so keep doing that here
        // instead of failing the document over one stray tag.
        unescapeCodeSpans(serializeElement(element));
  }

  const target = lower;
  const props: Record<string, unknown> = {
    key,
    ...safeElementProps(
      lower,
      element.getAttributeNames().map((name) => ({
        name,
        value: element.getAttribute(name) ?? '',
      })),
    ),
  };

  const children = Array.from(element.childNodes)
    .map((child, index) =>
      nodeToReact(child, catalog, `${key}-${index}`, {
        sourceElements,
        componentBody,
        blockMarkdownText: blockMarkdownText && HTML_FLOW_CONTAINERS.has(target),
        discardWhitespaceText: tableHtmlContainers.has(target),
      }),
    )
    .filter((child) => child !== null);

  return createElement(target, props, ...children);
}

// SVG element names are case sensitive and the forgiving HTML parse uppercases
// them, so the canonical name comes from the allowlist rather than from the
// parsed node. Both parse paths therefore reach the same `linearGradient`.
function svgToReact(
  element: Element,
  catalog: RuntimeCatalog,
  key: string,
  sourceElements: WeakMap<Element, SourceElement>,
): ReactNode {
  const canonical = SVG_ELEMENTS.get(element.tagName.toLowerCase());
  if (!canonical) {
    const authored = sourceElements.get(element)?.name || element.tagName.toLowerCase();
    // A registered component is registered for the document, not for the
    // inside of a graphic. Say that, rather than reporting it as unknown.
    if (catalog.definitions.has(authored.toLowerCase())) {
      throw new HtmdxSourceError(
        'html-element-not-allowed',
        `component <${authored}> is not allowed inside <svg>`,
      );
    }
    if (/^[A-Z]/.test(authored)) {
      throw new HtmdxSourceError('unknown-component', `unknown component <${authored}>`);
    }
    // `<foreignObject>`, `<script>`, and friends are the reason this allowlist
    // exists. They degrade to the text they were written as, the same way a
    // non-allowlisted HTML tag does outside a component body.
    return unescapeCodeSpans(serializeElement(element));
  }

  const props: Record<string, unknown> = {
    key,
    ...safeSvgProps(
      canonical,
      element.getAttributeNames().map((name) => ({
        name,
        value: element.getAttribute(name) ?? '',
      })),
    ),
  };

  const children = Array.from(element.childNodes)
    .map((child, index) =>
      nodeToReact(child, catalog, `${key}-${index}`, { sourceElements, svg: true }),
    )
    .filter((child) => child !== null);

  return createElement(canonical, props, ...children);
}

// Elements that turn source into code once they reach the DOM. Everything else
// outside the allowlist keeps rendering from a component body the way it always
// has, so documents written against the old permissive behavior still compile.
const UNSAFE_ELEMENTS = new Set([
  'base',
  'embed',
  'link',
  'meta',
  'object',
  'script',
  'style',
  'template',
]);

function passthroughElement(
  element: Element,
  catalog: RuntimeCatalog,
  key: string,
  sourceElements: WeakMap<Element, SourceElement>,
): ReactNode {
  const target = element.tagName.toLowerCase();
  if (UNSAFE_ELEMENTS.has(target)) {
    throw new HtmdxSourceError(
      'html-element-not-allowed',
      `HTML element <${target}> is not allowed`,
    );
  }

  const props: Record<string, unknown> = { key };
  for (const attribute of element.getAttributeNames()) {
    if (/^on/i.test(attribute)) {
      throw new HtmdxSourceError(
        'event-handler-attribute',
        `event handler attribute "${attribute}" is not allowed`,
      );
    }
    props[normalizePropName(attribute)] = parseAttrValue(element.getAttribute(attribute) || '');
  }

  const children = Array.from(element.childNodes)
    .map((child, index) =>
      nodeToReact(child, catalog, `${key}-${index}`, { sourceElements, componentBody: true }),
    )
    .filter((child) => child !== null);

  return createElement(target, props, ...children);
}

function normalizePropName(name: string) {
  if (name === 'class') {
    return 'className';
  }
  if (name === 'for') {
    return 'htmlFor';
  }
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function parseAttrValue(value: string): unknown {
  if (value === '') {
    return true;
  }
  if (/^(true|false|null|-?\d+(\.\d+)?)$/.test(value)) {
    return JSON.parse(value);
  }
  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// The XML parse keeps authored casing but serializes with namespace noise the
// source never had, so rebuild the tag from what was written.
function serializeElement(element: Element): string {
  const attributes = Array.from(element.attributes, (attribute) =>
    attribute.value === '' ? ` ${attribute.name}` : ` ${attribute.name}="${attribute.value}"`,
  ).join('');
  const name = element.tagName;
  return `<${name}${attributes}>${element.innerHTML}</${name}>`;
}

// Bodies are parsed as XML first: it preserves tag and attribute case (so
// camelCase props like defaultValue survive) and never relocates fragments the
// way the HTML parser does with table rows. Malformed bodies (unescaped `&`,
// unclosed tags) fall back to forgiving HTML parsing.
function parseBodyNodes(body: string): {
  nodes: Node[];
  sourceElements: WeakMap<Element, SourceElement>;
} {
  const source = escapeCodeSpans(body);
  const xml = new DOMParser().parseFromString(`<htmdx-body>${source}</htmdx-body>`, 'text/xml');
  const nodes = !xml.querySelector('parsererror')
    ? Array.from(xml.documentElement.childNodes)
    : Array.from(new DOMParser().parseFromString(source, 'text/html').body.childNodes);

  return { nodes, sourceElements: mapSourceElements(source, nodes) };
}

// DOMParser exposes both `enabled` and `enabled=""` as an empty attribute, and
// the HTML fallback parse discards tag casing. Pair parsed elements with their
// source tags so schema parsing and component detection see the authored form.
function mapSourceElements(body: string, nodes: Node[]): WeakMap<Element, SourceElement> {
  const sources: SourceElement[] = [];
  const openTag = /<([A-Za-z][A-Za-z0-9]*)(\s+(?:[^"'<>]|"[^"]*"|'[^']*')*)?\s*\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = openTag.exec(body))) {
    sources.push({ name: match[1], attributes: parseAttributes(match[2] || '') });
  }

  const domElements: Element[] = [];
  const collectElements = (children: Node[]) => {
    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      const element = child as Element;
      domElements.push(element);
      collectElements(Array.from(element.childNodes));
    }
  };
  collectElements(nodes);

  const sourceByElement = new WeakMap<Element, SourceElement>();
  let sourceIndex = 0;
  for (const element of domElements) {
    const source = sources[sourceIndex];
    if (source?.name.toLowerCase() === element.tagName.toLowerCase()) {
      sourceByElement.set(element, source);
      sourceIndex += 1;
    }
  }
  return sourceByElement;
}

// When `recover` is supplied the scan reports a tag-level failure and keeps
// going instead of throwing, so validate() can surface every bad tag in one
// pass. compile() passes nothing and keeps failing on the first.
function tokenize(
  source: string,
  registry: Map<string, string>,
  recover?: (error: HtmdxSourceError) => void,
): Block[] {
  const blocks: Block[] = [];
  // Tag scanning runs on the masked syntax (code fences and inline code
  // blanked out, positions preserved) so component tags inside code samples
  // are left to markdown; slices are taken from the original source.
  const syntax = markdownSyntaxSource(source);
  const openTag = /<([A-Za-z][A-Za-z0-9]*)((?:\s[^>]*?)?)(\/?)>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = openTag.exec(syntax))) {
    const [, rawName, attrs, selfClosing] = match;
    const canonical = registry.get(rawName.toLowerCase());
    if (!canonical) {
      // `<IMG>` is HTML, not a missing component, whatever its casing.
      if (rawName.toLowerCase() === 'img') {
        continue;
      }
      // Capitalized tags are component syntax; an unregistered one is a
      // typo or a missing registration, not markdown — fail loudly so
      // agents get feedback instead of silently degraded output.
      if (/^[A-Z]/.test(rawName)) {
        const error = new HtmdxSourceError(
          'unknown-component',
          `unknown component <${rawName}>`,
          match.index,
          match[0].length,
        );
        if (!recover) {
          throw error;
        }
        recover(error);
        continue;
      }

      // Unknown tags stay literal Markdown text. Only `<svg>` itself is scanned
      // for: everything between it and its close tag is one block, so the
      // element names inside a graphic never reach this loop.
      const lower = rawName.toLowerCase();
      const isSvgRoot = lower === 'svg';
      if (
        selfClosing ||
        HTML_VOID_ELEMENTS.has(lower) ||
        !(HTML_ELEMENTS.has(lower) || isSvgRoot)
      ) {
        continue;
      }

      // An allowlisted block element that opens a line owns everything up to
      // its close tag, so blank lines and nested components stay in one block.
      if ((HTML_BLOCK_ELEMENTS.has(lower) || isSvgRoot) && opensLine(syntax, match.index)) {
        const close = findMatchingClose(syntax, rawName, openTag.lastIndex);
        if (close) {
          pushMarkdown(blocks, source.slice(cursor, match.index), cursor);
          blocks.push({
            type: 'html',
            value: source.slice(match.index, close.closeEnd),
            offset: match.index,
          });
          cursor = close.closeEnd;
          openTag.lastIndex = close.closeEnd;
          continue;
        }
      }

      // Everything else renders from inside its Markdown block, which handles
      // nested components too, so scanning skips the whole span instead of
      // splitting a component out of the paragraph that wraps it.
      const inline = findMatchingClose(syntax, rawName, openTag.lastIndex);
      if (inline && !/\n\s*\n/.test(syntax.slice(openTag.lastIndex, inline.bodyEnd))) {
        openTag.lastIndex = inline.closeEnd;
      }
      continue;
    }

    pushMarkdown(blocks, source.slice(cursor, match.index), cursor);

    if (selfClosing) {
      blocks.push({ type: 'component', name: canonical, attrs, body: '', offset: match.index });
      cursor = openTag.lastIndex;
      continue;
    }

    const close = findMatchingClose(syntax, rawName, openTag.lastIndex);
    if (!close) {
      const error = new HtmdxSourceError(
        'unclosed-component',
        `unclosed component <${canonical}>`,
        match.index,
        match[0].length,
      );
      if (!recover) {
        throw error;
      }
      // No closing tag means no reliable body boundary; report and let the
      // rest of the source be scanned as markdown.
      recover(error);
      continue;
    }

    blocks.push({
      type: 'component',
      name: canonical,
      attrs,
      body: source.slice(openTag.lastIndex, close.bodyEnd).trim(),
      offset: match.index,
    });
    cursor = close.closeEnd;
    openTag.lastIndex = close.closeEnd;
  }

  pushMarkdown(blocks, source.slice(cursor), cursor);
  return blocks;
}

// CommonMark's HTML-block rule: up to three leading spaces still counts as
// opening the line, deeper indentation is code or list content.
function opensLine(source: string, index: number) {
  let start = index;
  while (start > 0 && (source[start - 1] === ' ' || source[start - 1] === '\t')) {
    start -= 1;
  }
  return index - start <= 3 && (start === 0 || source[start - 1] === '\n');
}

// Depth-aware close matching: nested same-name tags (the case the core regex
// tokenizer cannot handle) increment depth instead of terminating the block.
function findMatchingClose(source: string, name: string, from: number) {
  const scanner = new RegExp(`<(\\/?)${name}\\b[^>]*?(\\/?)>`, 'gi');
  scanner.lastIndex = from;
  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = scanner.exec(source))) {
    if (match[1]) {
      depth -= 1;
    } else if (!match[2]) {
      depth += 1;
    }
    if (depth === 0) {
      return { bodyEnd: match.index, closeEnd: scanner.lastIndex };
    }
  }
  return null;
}

function pushMarkdown(blocks: Block[], value: string, start: number) {
  const trimmed = value.trim();
  if (trimmed) {
    blocks.push({ type: 'markdown', value: trimmed, offset: start + value.indexOf(trimmed[0]) });
  }
}

type SourceElement = {
  name: string;
  attributes: SourceAttribute[];
};

type SourceAttribute = {
  name: string;
  value?: string;
  bare: boolean;
  quoted?: boolean;
  fromDom?: boolean;
  /** Offset of the attribute name, relative to the attribute string. */
  offset?: number;
};

function parseAttributes(attrs: string): SourceAttribute[] {
  const attributes: SourceAttribute[] = [];
  const pattern = /([A-Za-z][A-Za-z0-9-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(attrs))) {
    const value = match[2] ?? match[3] ?? match[4];
    attributes.push({
      name: match[1],
      value,
      bare: value === undefined,
      quoted: match[2] !== undefined || match[3] !== undefined,
      offset: match.index,
    });
  }
  return attributes;
}

function definitionPropsFromAttributes(
  definition: HtmdxComponent,
  attributes: SourceAttribute[],
): Record<string, unknown> {
  const declarations = new Map((definition.props || []).map((prop) => [prop.name, prop]));
  const props: Record<string, unknown> = {};
  const supplied = new Set<string>();

  for (const attribute of attributes) {
    // Event handlers report as an unknown prop for message compatibility, but
    // carry their own code: the user mistake is distinct from a typo.
    if (/^on/i.test(attribute.name)) {
      throw attributeError(
        'event-handler-attribute',
        `unknown prop "${attribute.name}" for <${definition.name}>`,
        attribute,
      );
    }
    if (attribute.name === 'class') {
      props.className = attribute.value ?? '';
      continue;
    }
    if (attribute.name === 'id' || /^(aria|data)-[A-Za-z0-9_.:-]+$/.test(attribute.name)) {
      props[attribute.name] = attribute.value ?? true;
      continue;
    }

    const declaration = declarations.get(attribute.name);
    if (!declaration) {
      throw attributeError(
        'unknown-prop',
        `unknown prop "${attribute.name}" for <${definition.name}>`,
        attribute,
      );
    }
    if (!attribute.fromDom && !attribute.quoted && attribute.value?.includes('{')) {
      throw attributeError(
        'brace-expression-prop',
        `brace expressions are not allowed in prop "${attribute.name}"`,
        attribute,
      );
    }
    supplied.add(declaration.name);
    props[declaration.name] = parseDefinitionProp(definition.name, declaration, attribute);
  }

  for (const declaration of declarations.values()) {
    if (supplied.has(declaration.name)) {
      continue;
    }
    if (declaration.required) {
      throw new HtmdxSourceError(
        'missing-required-prop',
        `required prop "${declaration.name}" is missing for <${definition.name}>`,
      );
    }
    if (declaration.default !== undefined) {
      props[declaration.name] = declaration.default;
    }
  }
  return props;
}

function attributeError(
  code: HtmdxDiagnosticCode,
  message: string,
  attribute: SourceAttribute,
): HtmdxSourceError {
  return new HtmdxSourceError(code, message, attribute.offset, attribute.name.length);
}

function parseDefinitionProp(
  componentName: string,
  prop: HtmdxProp,
  attribute: SourceAttribute,
): unknown {
  let value: unknown;
  if (prop.type === 'string') {
    if (attribute.bare && attribute.value === undefined) {
      throw attributeError(
        'prop-type-string',
        `prop "${prop.name}" for <${componentName}> requires a string value`,
        attribute,
      );
    }
    value = attribute.value ?? '';
  } else if (prop.type === 'number') {
    const source = attribute.value;
    value =
      source !== undefined && /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(source)
        ? Number(source)
        : Number.NaN;
    if (!Number.isFinite(value)) {
      throw attributeError(
        'prop-type-number',
        `prop "${prop.name}" for <${componentName}> must be a finite number`,
        attribute,
      );
    }
  } else if (prop.type === 'boolean') {
    if (attribute.bare) {
      value = true;
    } else if (attribute.value === 'true' || attribute.value === 'false') {
      value = attribute.value === 'true';
    } else {
      throw attributeError(
        'prop-type-boolean',
        `prop "${prop.name}" for <${componentName}> must be true or false`,
        attribute,
      );
    }
  } else {
    if (attribute.bare || attribute.value === undefined) {
      throw attributeError(
        'prop-type-json',
        `prop "${prop.name}" for <${componentName}> must be valid JSON`,
        attribute,
      );
    }
    try {
      value = JSON.parse(attribute.value);
    } catch {
      throw attributeError(
        'prop-type-json',
        `prop "${prop.name}" for <${componentName}> must be valid JSON`,
        attribute,
      );
    }
  }

  validateConstraints(componentName, prop, value);
  return value;
}

function assertDeclarativeBody(componentName: string, body: string, allowTags = false): void {
  let syntax = markdownSyntaxSource(body);
  if (allowTags && /=\s*\{/.test(syntax)) {
    throw new HtmdxSourceError(
      'brace-expression-body',
      `component <${componentName}> body does not allow brace expressions`,
    );
  }
  if (allowTags) {
    syntax = syntax.replace(/<[^>]*>/g, '');
  }
  if (/^\s*(import|export)\b/m.test(syntax)) {
    throw new HtmdxSourceError(
      'import-export-body',
      `component <${componentName}> body does not allow imports or exports`,
    );
  }
  if (/[{}]/.test(syntax)) {
    throw new HtmdxSourceError(
      'brace-expression-body',
      `component <${componentName}> body does not allow brace expressions`,
    );
  }
}

function stripFrontmatterAndComments(source: string) {
  return source
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

// Same removals as stripFrontmatterAndComments, but blanked in place so every
// offset still maps to the original source. Mirrors markdownSyntaxSource.
function blankFrontmatterAndComments(source: string) {
  const blanked = source.split('');
  const blank = (start: number, end: number) => {
    for (let index = start; index < end; index += 1) {
      if (blanked[index] !== '\n' && blanked[index] !== '\r') {
        blanked[index] = ' ';
      }
    }
  };

  const frontmatter = source.match(/^---[\s\S]*?---\s*/);
  if (frontmatter) {
    blank(0, frontmatter[0].length);
  }
  for (const comment of source.matchAll(/<!--[\s\S]*?-->/g)) {
    blank(comment.index, comment.index + comment[0].length);
  }
  return blanked.join('');
}

const FRONTMATTER_FIELDS = new Set([
  'layout',
  'title',
  'project',
  'owner',
  'phase',
  'updated',
  'theme',
  'logo',
  'logo-alt',
]);

// Scanned on the masked syntax so an image inside a code fence or inline code
// is documentation, not a finding. Markdown has no way to mark an image as
// decorative, so an empty alt is always a warning; `<img alt="">` is the
// standard way to say "decorative" and is left alone.
function imagesMissingAlt(source: string, normalized: string): HtmdxDiagnostic[] {
  const scannable = markdownSyntaxSource(normalized);
  const diagnostics: HtmdxDiagnostic[] = [];

  for (const match of scannable.matchAll(/!\[([^\]]*)]\([^)]*\)/g)) {
    if (!match[1].trim()) {
      diagnostics.push(
        toDiagnostic(
          source,
          'image-missing-alt',
          'image has no alt text',
          match.index,
          match[0].length,
          'warning',
        ),
      );
    }
  }

  for (const match of scannable.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=/i.test(match[0])) {
      diagnostics.push(
        toDiagnostic(
          source,
          'image-missing-alt',
          'image has no alt attribute',
          match.index,
          match[0].length,
          'warning',
        ),
      );
    }
  }

  return diagnostics;
}

export type HtmdxStructureNode =
  | { type: 'markdown'; value: string }
  | { type: 'text'; value: string }
  | {
      type: 'element';
      name: string;
      props: Record<string, string>;
      children: HtmdxStructureNode[];
    };

// The document's shape as written, not as rendered: component names, the props
// they were given, and the text between them. Derived from the source rather
// than the React tree so a snapshot survives runtime markup and styling churn.
export function structureOf(source: string, options: HtmdxReactOptions = {}): HtmdxStructureNode[] {
  const catalog = createRuntimeCatalog(options);
  return tokenize(stripFrontmatterAndComments(source), catalog.names).flatMap((block) => {
    if (block.type === 'markdown') {
      return [{ type: 'markdown' as const, value: block.value.trim() }];
    }
    // A raw HTML block has no wrapper of its own: its elements are the
    // structure, so they sit at the same level as the blocks around them.
    if (block.type === 'html') {
      return structureChildren(block.value, catalog);
    }
    return [
      {
        type: 'element' as const,
        name: block.name,
        props: propsFromSourceAttributes(parseAttributes(block.attrs)),
        children: structureChildren(block.body, catalog),
      },
    ];
  });
}

function structureChildren(body: string, catalog: RuntimeCatalog): HtmdxStructureNode[] {
  const trimmed = body.trim();
  if (!trimmed) {
    return [];
  }
  if (!hasBodyElements(body)) {
    return [{ type: 'text', value: trimmed }];
  }

  const { nodes, sourceElements } = parseBodyNodes(body);
  return structureNodes(nodes, catalog, sourceElements);
}

function structureNodes(
  nodes: Node[],
  catalog: RuntimeCatalog,
  sourceElements: WeakMap<Element, SourceElement>,
): HtmdxStructureNode[] {
  const structure: HtmdxStructureNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = (node.textContent || '').trim();
      if (value) {
        structure.push({ type: 'text', value });
      }
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }
    const element = node as Element;
    const tag = element.tagName;
    const source = sourceElements.get(element);
    structure.push({
      type: 'element',
      // SVG_ELEMENTS restores the casing the forgiving HTML parse flattened;
      // an authored name, when one was recovered, is still closer to the source.
      name:
        catalog.names.get(tag.toLowerCase()) ??
        source?.name ??
        SVG_ELEMENTS.get(tag.toLowerCase()) ??
        tag,
      props: propsFromSourceAttributes(
        source?.attributes ??
          Array.from(element.attributes, (attribute) => ({
            name: attribute.name,
            value: attribute.value,
            bare: false,
          })),
      ),
      children: structureNodes(Array.from(element.childNodes), catalog, sourceElements),
    });
  }
  return structure;
}

function propsFromSourceAttributes(attributes: SourceAttribute[]): Record<string, string> {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.name, attribute.bare ? '' : (attribute.value ?? '')]),
  );
}

export type ValidationProbe = {
  offset: number;
  render: () => ReactNode;
};

// Everything validate() can determine without a DOM, plus one render thunk per
// component block. The caller renders each probe in isolation so a component
// that throws does not hide the blocks after it.
export function collectStructuralDiagnostics(
  source: string,
  options: HtmdxDocumentOptions = {},
): { diagnostics: HtmdxDiagnostic[]; probes: ValidationProbe[] } {
  const catalog = createRuntimeCatalog(options);
  const diagnostics: HtmdxDiagnostic[] = [];
  const meta = parseFrontmatter(source);

  for (const [field, value] of Object.entries(meta)) {
    const offset = Math.max(0, source.indexOf(`${field}:`));
    if (!FRONTMATTER_FIELDS.has(field)) {
      diagnostics.push(
        toDiagnostic(
          source,
          'unknown-frontmatter-field',
          `unknown frontmatter field "${field}" is ignored`,
          offset,
          field.length,
          'warning',
        ),
      );
      continue;
    }
    if (
      field === 'theme' &&
      value &&
      !(THEME_IDS as readonly string[]).includes(value.trim().toLowerCase())
    ) {
      diagnostics.push(
        toDiagnostic(
          source,
          'unknown-theme',
          `unknown theme "${value}" falls back to the base palette; expected one of ${THEME_IDS.join(', ')}`,
          offset,
          field.length,
          'warning',
        ),
      );
    }
  }

  const layout = resolveLayoutName(options.layout || meta.layout || 'default');
  if (layout !== 'default' && layout !== 'blank' && !getLayout(layout)) {
    diagnostics.push(
      toDiagnostic(
        source,
        'unknown-layout',
        `unknown layout "${layout}"`,
        Math.max(0, source.indexOf('layout:')),
        'layout'.length,
        'error',
      ),
    );
  }

  const normalized = blankFrontmatterAndComments(source);
  diagnostics.push(...imagesMissingAlt(source, normalized));

  const blocks = tokenize(normalized, catalog.names, (error) => {
    diagnostics.push(
      toDiagnostic(source, error.code, error.message, error.offset ?? 0, error.length ?? 1),
    );
  });

  // Raw HTML blocks get a probe too: a disallowed element or an event handler
  // attribute only surfaces when the fragment is actually rendered.
  const probes = blocks
    .filter((block) => block.type !== 'markdown')
    .map((block, index) => ({
      offset: block.offset,
      render: () =>
        block.type === 'html'
          ? renderHtmlFragment(block.value, catalog, `v-${index}`, true)
          : renderComponentBlock(block, catalog, `v-${index}`),
    }));

  return { diagnostics, probes };
}

// A component block's failure can arrive from three places: the tokenizer
// (already coded), attribute parsing (coded, offset relative to the tag's
// attribute string), or the component's own render, where body-contract
// errors already carry a body-relative location inside their message.
export function diagnosticForBlock(
  source: string,
  block: { offset: number },
  error: unknown,
): HtmdxDiagnostic {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof HtmdxSourceError) {
    const openingTag = source.slice(block.offset).match(/^<([A-Za-z][A-Za-z0-9]*)[^>]*>/);
    const tagName = openingTag?.[1] ?? '';
    const rebased =
      error.offset === undefined ? block.offset : block.offset + 1 + tagName.length + error.offset;
    // An attribute offset is relative to its own tag. When the failing tag is
    // nested inside the block's body, rebasing it against the block's opening
    // tag lands on an unrelated character, so fall back to the block itself.
    const withinOpeningTag = rebased < block.offset + (openingTag?.[0].length ?? 0);
    const offset = withinOpeningTag ? rebased : block.offset;
    return toDiagnostic(
      source,
      error.code,
      message,
      offset,
      withinOpeningTag ? (error.length ?? 1) : 1,
    );
  }

  if (error instanceof HtmdxBodyContractError) {
    const row = bodyRowInSource(source, block.offset, error.contract.bodyLine);
    return toDiagnostic(
      source,
      'body-contract',
      message,
      row?.offset ?? block.offset,
      row?.length ?? 1,
    );
  }

  const code: HtmdxDiagnosticCode = message.startsWith('Invalid body for <')
    ? 'body-contract'
    : 'render-failed';
  return toDiagnostic(source, code, message, block.offset, 1);
}

// Body-contract errors count lines from the trimmed body the component saw, so
// the artifact position is that body's first line plus the reported offset.
function bodyRowInSource(source: string, blockOffset: number, bodyLine: number | undefined) {
  const openingTag = source.slice(blockOffset).match(/^<[A-Za-z][A-Za-z0-9]*[^>]*>/);
  if (!bodyLine || !openingTag) {
    return null;
  }

  const bodyStart = source.slice(blockOffset + openingTag[0].length).search(/\S/);
  if (bodyStart < 0) {
    return null;
  }

  let offset = blockOffset + openingTag[0].length + bodyStart;
  for (let remaining = bodyLine - 1; remaining > 0; remaining -= 1) {
    const next = source.indexOf('\n', offset);
    if (next < 0) {
      return null;
    }
    offset = next + 1;
  }

  const row = source.slice(offset).match(/^[^\n]*/)?.[0] ?? '';
  const indent = row.length - row.trimStart().length;
  const text = row.trim();
  return text ? { offset: offset + indent, length: text.length } : null;
}
