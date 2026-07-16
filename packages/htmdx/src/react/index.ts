// React renderer for HTMDX — "MDX minus JavaScript".
//
// Renders an HTMDX source string to a React element tree. Component tags are
// resolved from an MDX-style `components` map; nested composition is parsed
// as data — no expressions, no eval, no function props. Component bodies are
// parsed as XML first (preserves tag/attribute case), falling back to HTML
// parsing when the body is not well-formed.

import {
  createElement,
  Fragment,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { markdownSyntaxSource } from '../components/body-contracts';
import { inline, renderMarkdown, uniqueSlug, type RenderContext } from '../components/rendering';

// oxlint-disable-next-line no-explicit-any -- component prop shapes are caller-defined
export type HtmdxReactComponent = ComponentType<any>;

export type HtmdxReactComponents = Record<string, HtmdxReactComponent>;

export type HtmdxReactOptions = {
  components?: HtmdxReactComponents;
};

type Block =
  | { type: 'markdown'; value: string }
  | { type: 'component'; name: string; attrs: string; body: string };

export function compileToReact(source: string, options: HtmdxReactOptions = {}): ReactElement {
  const components = options.components || {};
  const registry = new Map(Object.keys(components).map((name) => [name.toLowerCase(), name]));
  const normalized = stripFrontmatterAndComments(source);
  const blocks = tokenize(normalized, registry);
  const context: RenderContext = { headings: [], slugCounts: new Map() };

  const children = blocks.map((block, index) => {
    if (block.type === 'markdown') {
      return rawHtml('div', renderMarkdown(block.value, context), `md-${index}`);
    }
    return renderComponentBlock(block, components, `c-${index}`);
  });

  return createElement(Fragment, null, ...children);
}

export function Htmdx(props: { source: string } & HtmdxReactOptions): ReactElement {
  return compileToReact(props.source, { components: props.components });
}

export type HtmdxDocument = {
  element: ReactElement;
  title: string;
  headings: { id: string; label: string }[];
  components: string[];
  meta: Record<string, string>;
};

// Full-document compile: article content wrapped in the hero + sticky header
// + section rail shell (same class names the runtime CSS styles). Used by the
// core register()/compile() so every host renders the complete page chrome.
export function compileDocument(source: string, options: HtmdxReactOptions = {}): HtmdxDocument {
  const components = options.components || {};
  const registry = new Map(Object.keys(components).map((name) => [name.toLowerCase(), name]));
  const meta = parseFrontmatter(source);
  const title = titleFromSource(source, meta);
  const normalized = stripFrontmatterAndComments(source);
  const blocks = tokenize(normalized, registry);
  const context: RenderContext = { headings: [], slugCounts: new Map() };

  const lead = title ? extractHeroContent(blocks) : '';
  const sections = groupSections(blocks, components, context);

  const sectionElements = sections
    .filter((section) => section.heading || section.children.length > 0)
    .map((section, index) =>
      createElement(
        'section',
        { className: 'htmdx-doc-section', key: section.heading?.id || `head-${index}` },
        section.heading
          ? createElement('h2', {
              id: section.heading.id,
              dangerouslySetInnerHTML: { __html: inline(section.heading.label) },
            })
          : null,
        createElement('div', { className: 'htmdx-doc-section-card' }, ...section.children),
      ),
    );

  const main = createElement(
    'main',
    { className: 'htmdx-page', key: 'main' },
    createElement('article', { className: 'htmdx-article' }, ...sectionElements),
  );

  const body =
    context.headings.length < 2
      ? main
      : createElement(
          'div',
          { className: 'htmdx-shell', key: 'shell' },
          renderToc(context.headings),
          main,
        );

  return {
    element: createElement(
      'div',
      { className: 'htmdx-app' },
      title ? renderStickyHeader(title, meta) : null,
      title ? renderHero(title, lead, meta) : null,
      body,
    ),
    title,
    headings: context.headings,
    components: blocks.filter((block) => block.type === 'component').map((block) => block.name),
    meta,
  };
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
  components: HtmdxReactComponents,
  context: RenderContext,
): Section[] {
  const sections: Section[] = [{ heading: null, children: [] }];
  let current = sections[0];

  const pushChunk = (chunk: string, key: string) => {
    const trimmed = chunk.trim();
    if (trimmed) {
      current.children.push(rawHtml('div', renderMarkdown(trimmed, context), key));
    }
  };

  for (const [index, block] of blocks.entries()) {
    if (block.type === 'component') {
      current.children.push(renderComponentBlock(block, components, `c-${index}`));
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
    blocks[0] = { type: 'markdown', value };
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
      createElement('span', {
        className: 'htmdx-sticky-title',
        key: 'title',
        dangerouslySetInnerHTML: { __html: inline(title) },
      }),
      createElement('span', { className: 'htmdx-sticky-divider', key: 'divider' }, '|'),
      createElement('span', {
        className: 'htmdx-sticky-project',
        key: 'project',
        dangerouslySetInnerHTML: { __html: inline(meta.project || '{Project Name}') },
      }),
    ),
  );
}

function renderHeroLabel(name: string, value: string) {
  return createElement(
    'span',
    { className: 'htmdx-hero-label', key: name },
    `${name} `,
    createElement('b', { dangerouslySetInnerHTML: { __html: inline(value) } }),
  );
}

function renderHero(title: string, lead: string, meta: Record<string, string>) {
  return createElement(
    'header',
    { className: 'htmdx-hero', key: 'hero' },
    createElement(
      'div',
      { className: 'htmdx-hero-inner' },
      createElement('p', {
        className: 'htmdx-hero-eyebrow',
        key: 'eyebrow',
        dangerouslySetInnerHTML: { __html: inline(meta.project || '{Project Name}') },
      }),
      createElement('h1', {
        className: 'htmdx-hero-title',
        key: 'title',
        dangerouslySetInnerHTML: { __html: inline(title) },
      }),
      lead
        ? createElement('p', {
            className: 'htmdx-hero-desc',
            key: 'desc',
            dangerouslySetInnerHTML: { __html: inline(lead) },
          })
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

function renderToc(headings: { id: string; label: string }[]) {
  const items = headings.map((heading) =>
    createElement(
      'li',
      { className: 'htmdx-toc-item', key: heading.id },
      createElement('a', {
        className: 'htmdx-toc-link',
        href: `#${heading.id}`,
        'data-htmdx-target': heading.id,
        dangerouslySetInnerHTML: { __html: inline(heading.label) },
      }),
    ),
  );

  return createElement(
    'nav',
    { className: 'htmdx-toc', 'aria-label': 'Sections', key: 'toc' },
    createElement('ol', { className: 'htmdx-toc-list' }, ...items),
  );
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

export { builtInReactComponents } from './builtins';

export function listComponents(source: string, components: HtmdxReactComponents = {}): string[] {
  const registry = new Map(Object.keys(components).map((name) => [name.toLowerCase(), name]));
  return tokenize(stripFrontmatterAndComments(source), registry)
    .filter((block) => block.type === 'component')
    .map((block) => block.name);
}

export type HtmdxSourceToken =
  | { type: 'markdown'; value: string }
  | { type: 'component'; name: string; body: string };

export function tokenizeSource(
  source: string,
  components: HtmdxReactComponents = {},
): HtmdxSourceToken[] {
  const registry = new Map(Object.keys(components).map((name) => [name.toLowerCase(), name]));
  return tokenize(stripFrontmatterAndComments(source), registry).map((block) =>
    block.type === 'markdown'
      ? { type: 'markdown' as const, value: block.value }
      : { type: 'component' as const, name: block.name, body: block.body },
  );
}

function renderComponentBlock(
  block: Block & { type: 'component' },
  components: HtmdxReactComponents,
  key: string,
): ReactNode {
  const component = components[block.name];
  const props = { ...attrsToProps(block.attrs), key };

  // Raw-body components (bridged string built-ins) consume the body
  // themselves — validation and rendering stay in the string pipeline.
  if ((component as { htmdxRawBody?: boolean }).htmdxRawBody) {
    return createElement(component, { ...props, body: block.body });
  }

  return createElement(component, props, bodyToChildren(block.body, components, key));
}

function bodyToChildren(
  body: string,
  components: HtmdxReactComponents,
  keyPrefix: string,
): ReactNode {
  if (!body) {
    return null;
  }

  // Element detection runs on the masked syntax so tags inside inline code
  // or fences (markdown literals) don't get parsed as component markup.
  const hasElements = /<[A-Za-z][A-Za-z0-9]*(\s[^>]*)?\/?>/.test(markdownSyntaxSource(body));
  if (!hasElements) {
    return rawHtml('div', renderMarkdown(body, { headings: [], slugCounts: new Map() }), keyPrefix);
  }

  const nodes = parseBodyNodes(body);

  const children = nodes
    .map((node, index) => nodeToReact(node, components, `${keyPrefix}-${index}`))
    .filter((child) => child !== null);
  return children.length === 1 ? children[0] : children;
}

function nodeToReact(node: Node, components: HtmdxReactComponents, key: string): ReactNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text.trim()) {
      return null;
    }
    return rawHtml('span', inline(text.trim()), key);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const lower = element.tagName.toLowerCase();
  const canonical = Object.keys(components).find((name) => name.toLowerCase() === lower);
  const target: HtmdxReactComponent | string = canonical ? components[canonical] : lower;

  const props: Record<string, unknown> = { key };
  for (const attr of element.getAttributeNames()) {
    props[normalizePropName(attr)] = parseAttrValue(element.getAttribute(attr) || '');
  }

  if ((target as { htmdxRawBody?: boolean }).htmdxRawBody) {
    return createElement(target, { ...props, body: element.innerHTML.trim() });
  }

  const children = Array.from(element.childNodes)
    .map((child, index) => nodeToReact(child, components, `${key}-${index}`))
    .filter((child) => child !== null);

  return createElement(target, props, ...children);
}

// Bodies are parsed as XML first: it preserves tag and attribute case (so
// camelCase props like defaultValue survive) and never relocates fragments the
// way the HTML parser does with table rows. Malformed bodies (unescaped `&`,
// unclosed tags) fall back to forgiving HTML parsing.
function parseBodyNodes(body: string): Node[] {
  const xml = new DOMParser().parseFromString(`<htmdx-body>${body}</htmdx-body>`, 'text/xml');
  if (!xml.querySelector('parsererror')) {
    return Array.from(xml.documentElement.childNodes);
  }

  const html = new DOMParser().parseFromString(body, 'text/html');
  return Array.from(html.body.childNodes);
}

function tokenize(source: string, registry: Map<string, string>): Block[] {
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
      // Capitalized tags are component syntax; an unregistered one is a
      // typo or a missing registration, not markdown — fail loudly so
      // agents get feedback instead of silently degraded output.
      if (/^[A-Z]/.test(rawName)) {
        throw new Error(`unknown component <${rawName}>`);
      }
      continue;
    }

    pushMarkdown(blocks, source.slice(cursor, match.index));

    if (selfClosing) {
      blocks.push({ type: 'component', name: canonical, attrs, body: '' });
      cursor = openTag.lastIndex;
      continue;
    }

    const close = findMatchingClose(syntax, rawName, openTag.lastIndex);
    if (!close) {
      throw new Error(`unclosed component <${canonical}>`);
    }

    blocks.push({
      type: 'component',
      name: canonical,
      attrs,
      body: source.slice(openTag.lastIndex, close.bodyEnd).trim(),
    });
    cursor = close.closeEnd;
    openTag.lastIndex = close.closeEnd;
  }

  pushMarkdown(blocks, source.slice(cursor));
  return blocks;
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

function pushMarkdown(blocks: Block[], value: string) {
  const trimmed = value.trim();
  if (trimmed) {
    blocks.push({ type: 'markdown', value: trimmed });
  }
}

function attrsToProps(attrs: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const pattern = /([A-Za-z][A-Za-z0-9-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(attrs))) {
    const value = match[2] ?? match[3] ?? match[4];
    props[normalizePropName(match[1])] = value === undefined ? true : parseAttrValue(value);
  }
  return props;
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

function rawHtml(tag: string, html: string, key: string) {
  return createElement(tag, { key, dangerouslySetInnerHTML: { __html: html } });
}

function stripFrontmatterAndComments(source: string) {
  return source
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}
