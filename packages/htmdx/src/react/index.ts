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
import type { RenderContext } from '../components/rendering';
import { renderInline, renderMarkdown } from './markdown';

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
      return createElement('div', { key: `md-${index}` }, renderMarkdown(block.value, context));
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
};

// Full-document compile: article content wrapped in the masthead + section
// rail shell (same class names the runtime CSS styles). Used by the core
// register()/compile() so every host renders the complete page chrome.
export function compileDocument(source: string, options: HtmdxReactOptions = {}): HtmdxDocument {
  const components = options.components || {};
  const registry = new Map(Object.keys(components).map((name) => [name.toLowerCase(), name]));
  const title = titleFromSource(source);
  const normalized = stripFrontmatterAndComments(source);
  const blocks = tokenize(normalized, registry);
  const context: RenderContext = { headings: [], slugCounts: new Map() };

  const children = blocks.map((block, index) => {
    if (block.type === 'markdown') {
      return createElement('div', { key: `md-${index}` }, renderMarkdown(block.value, context));
    }
    return renderComponentBlock(block, components, `c-${index}`);
  });

  const article = createElement(
    'main',
    { className: 'htmdx-page', key: 'main' },
    createElement('article', { className: 'htmdx-article' }, ...children),
  );

  const masthead = title
    ? createElement('header', { className: 'htmdx-masthead', key: 'masthead' }, [
        createElement('h1', { key: 'title' }, renderInline(title)),
      ])
    : null;

  const body =
    context.headings.length < 2
      ? article
      : createElement(
          'div',
          { className: 'htmdx-shell', key: 'shell' },
          renderToc(context.headings),
          article,
        );

  return {
    element: createElement(Fragment, null, masthead, body),
    title,
    headings: context.headings,
    components: blocks.filter((block) => block.type === 'component').map((block) => block.name),
  };
}

function renderToc(headings: { id: string; label: string }[]) {
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

  return createElement(
    'nav',
    { className: 'htmdx-toc', 'aria-label': 'Sections', key: 'toc' },
    createElement('ol', { className: 'htmdx-toc-list' }, ...items),
  );
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

  // Raw-body built-ins (structured JSX components) parse and validate their
  // own HTMDX body through the body contracts instead of taking children.
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
    return createElement(
      'div',
      { key: keyPrefix },
      renderMarkdown(body, { headings: [], slugCounts: new Map() }),
    );
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
    return createElement('span', { key }, renderInline(text.trim()));
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

function stripFrontmatterAndComments(source: string) {
  return source
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}
