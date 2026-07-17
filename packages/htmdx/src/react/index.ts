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
import {
  createDefinitionRegistry,
  validateConstraints,
  type HtmdxComponent,
  type HtmdxComponentDefinitions,
  type HtmdxProp,
} from '../component-definition';
import { uniqueSlug, type RenderContext } from '../components/rendering';
import { BUILT_IN_LOGOS } from '../logos';
import { renderInline, renderMarkdown } from './markdown';
import { THEME_IDS } from '../themes';

// oxlint-disable-next-line no-explicit-any -- component prop shapes are caller-defined
export type HtmdxReactComponent = ComponentType<any>;

export type HtmdxReactComponents = Record<string, HtmdxReactComponent>;

export type HtmdxReactOptions = {
  components?: HtmdxReactComponents;
  definitions?: HtmdxComponentDefinitions;
};

type RuntimeCatalog = {
  components: HtmdxReactComponents;
  definitions: Map<string, HtmdxComponent>;
  names: Map<string, string>;
};

type Block =
  | { type: 'markdown'; value: string }
  | { type: 'component'; name: string; attrs: string; body: string };

function createRuntimeCatalog(options: HtmdxReactOptions): RuntimeCatalog {
  const components = options.components || {};
  const definitions = createDefinitionRegistry(options.definitions, Object.keys(components));
  const names = new Map(Object.keys(components).map((name) => [name.toLowerCase(), name]));
  for (const definition of definitions.values()) {
    names.set(definition.name.toLowerCase(), definition.name);
  }
  return { components, definitions, names };
}

export function compileToReact(source: string, options: HtmdxReactOptions = {}): ReactElement {
  const catalog = createRuntimeCatalog(options);
  const normalized = stripFrontmatterAndComments(source);
  const blocks = tokenize(normalized, catalog.names);
  const context: RenderContext = { headings: [], slugCounts: new Map() };

  const children = blocks.map((block, index) => {
    if (block.type === 'markdown') {
      return createElement('div', { key: `md-${index}` }, renderMarkdown(block.value, context));
    }
    return renderComponentBlock(block, catalog, `c-${index}`);
  });

  return createElement(Fragment, null, ...children);
}

export function Htmdx(props: { source: string } & HtmdxReactOptions): ReactElement {
  return compileToReact(props.source, {
    components: props.components,
    definitions: props.definitions,
  });
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
  const catalog = createRuntimeCatalog(options);
  const meta = parseFrontmatter(source);
  const title = titleFromSource(source, meta);
  const normalized = stripFrontmatterAndComments(source);
  const blocks = tokenize(normalized, catalog.names);
  const context: RenderContext = { headings: [], slugCounts: new Map() };

  const lead = title ? extractHeroContent(blocks) : '';
  const sections = groupSections(blocks, catalog, context);

  const sectionElements = sections
    .filter((section) => section.heading || section.children.length > 0)
    .map((section, index) =>
      createElement(
        'section',
        { className: 'htmdx-doc-section', key: section.heading?.id || `head-${index}` },
        section.heading
          ? createElement('h2', { id: section.heading.id }, renderInline(section.heading.label))
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
  catalog: RuntimeCatalog,
  context: RenderContext,
): Section[] {
  const sections: Section[] = [{ heading: null, children: [] }];
  let current = sections[0];

  const pushChunk = (chunk: string, key: string) => {
    const trimmed = chunk.trim();
    if (trimmed) {
      current.children.push(createElement('div', { key }, renderMarkdown(trimmed, context)));
    }
  };

  for (const [index, block] of blocks.entries()) {
    if (block.type === 'component') {
      // Mark only top-level Component blocks so the document shell can own
      // their vertical rhythm without affecting prose or nested composition.
      current.children.push(
        createElement(
          'div',
          { className: 'htmdx-content-component', key: `c-${index}` },
          renderComponentBlock(block, catalog, `c-${index}-content`),
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

export { builtInReactComponents } from './builtins';
export type {
  HtmdxBooleanProp,
  HtmdxComponent,
  HtmdxComponentDefinitions,
  HtmdxJsonProp,
  HtmdxJsonValue,
  HtmdxNumberProp,
  HtmdxProp,
  HtmdxPropType,
  HtmdxStringProp,
} from '../component-definition';

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
  catalog: RuntimeCatalog,
  key: string,
): ReactNode {
  const definition = catalog.definitions.get(block.name.toLowerCase());
  if (definition) {
    return renderDefinition(
      definition,
      definitionPropsFromAttributes(definition, parseAttributes(block.attrs)),
      block.body,
      catalog,
      key,
    );
  }

  const component = catalog.components[block.name];
  const props = { ...attrsToProps(block.attrs), key };

  // Raw-body built-ins (structured JSX components) parse and validate their
  // own HTMDX body through the body contracts instead of taking children.
  if ((component as { htmdxRawBody?: boolean }).htmdxRawBody) {
    return createElement(component, { ...props, body: block.body });
  }

  if (
    (component as { htmdxInlineBody?: boolean }).htmdxInlineBody &&
    !hasBodyElements(block.body)
  ) {
    return createElement(component, props, renderInline(block.body.trim()));
  }

  return createElement(component, props, bodyToChildren(block.body, catalog, key));
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
      throw new Error(
        `component <${definition.name}> with markdown body does not allow nested tags`,
      );
    }
    assertDeclarativeBody(definition.name, body);
    return createElement(definition.Component, { ...componentProps, body });
  }
  if (definition.body === 'none') {
    if (body.trim()) {
      throw new Error(`component <${definition.name}> does not allow a body`);
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

function htmdxBodyToChildren(body: string, catalog: RuntimeCatalog, keyPrefix: string): ReactNode {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }
  if (!hasBodyElements(body) && !isBlockMarkdown(trimmed)) {
    return renderInline(trimmed);
  }
  return bodyToChildren(body, catalog, keyPrefix, true);
}

function isBlockMarkdown(body: string): boolean {
  return /\r?\n/.test(body) || /^(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|~~~|---$)/.test(body);
}

function bodyToChildren(
  body: string,
  catalog: RuntimeCatalog,
  keyPrefix: string,
  contractDriven = false,
): ReactNode {
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

  const { nodes, sourceAttributes } = parseBodyNodes(body);

  const children = nodes
    .map((node, index) =>
      nodeToReact(node, catalog, `${keyPrefix}-${index}`, contractDriven, sourceAttributes),
    )
    .filter((child) => child !== null);
  return children.length === 1 ? children[0] : children;
}

function hasBodyElements(body: string) {
  return /<\/?[A-Za-z][A-Za-z0-9]*(\s[^>]*)?\/?>|<>|<\/>/.test(markdownSyntaxSource(body));
}

function nodeToReact(
  node: Node,
  catalog: RuntimeCatalog,
  key: string,
  contractDriven = false,
  sourceAttributes: WeakMap<Element, SourceAttribute[]> = new WeakMap(),
): ReactNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) {
      return null;
    }
    if (contractDriven && text.trim() && isBlockMarkdown(text)) {
      return createElement(Fragment, { key }, ...renderMarkdown(text));
    }
    return text.trim() ? createElement('span', { key }, renderInline(text)) : text;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const lower = element.tagName.toLowerCase();
  const canonical = catalog.names.get(lower);
  if (contractDriven && !canonical && /^[A-Z]/.test(element.tagName)) {
    throw new Error(`unknown component <${element.tagName}>`);
  }
  const definition = canonical ? catalog.definitions.get(lower) : undefined;
  if (definition) {
    const attributes =
      sourceAttributes.get(element) ||
      element.getAttributeNames().map((name) => ({
        name,
        value: element.getAttribute(name) ?? '',
        bare: false,
        fromDom: true,
      }));
    return renderDefinition(
      definition,
      definitionPropsFromAttributes(definition, attributes),
      element.innerHTML.trim(),
      catalog,
      key,
    );
  }

  const target: HtmdxReactComponent | string = canonical ? catalog.components[canonical] : lower;
  const props: Record<string, unknown> = { key };
  for (const attr of element.getAttributeNames()) {
    if (contractDriven && /^on/i.test(attr)) {
      throw new Error(`event handler attribute "${attr}" is not allowed`);
    }
    props[normalizePropName(attr)] = parseAttrValue(element.getAttribute(attr) || '');
  }

  if ((target as { htmdxRawBody?: boolean }).htmdxRawBody) {
    return createElement(target, { ...props, body: element.innerHTML.trim() });
  }

  const children = Array.from(element.childNodes)
    .map((child, index) =>
      nodeToReact(child, catalog, `${key}-${index}`, contractDriven, sourceAttributes),
    )
    .filter((child) => child !== null);

  return createElement(target, props, ...children);
}

// Bodies are parsed as XML first: it preserves tag and attribute case (so
// camelCase props like defaultValue survive) and never relocates fragments the
// way the HTML parser does with table rows. Malformed bodies (unescaped `&`,
// unclosed tags) fall back to forgiving HTML parsing.
function parseBodyNodes(body: string): {
  nodes: Node[];
  sourceAttributes: WeakMap<Element, SourceAttribute[]>;
} {
  const xml = new DOMParser().parseFromString(`<htmdx-body>${body}</htmdx-body>`, 'text/xml');
  const nodes = !xml.querySelector('parsererror')
    ? Array.from(xml.documentElement.childNodes)
    : Array.from(new DOMParser().parseFromString(body, 'text/html').body.childNodes);

  return { nodes, sourceAttributes: mapSourceAttributes(body, nodes) };
}

// DOMParser exposes both `enabled` and `enabled=""` as an empty attribute.
// Pair parsed elements with source attributes so schema parsing can distinguish them.
function mapSourceAttributes(body: string, nodes: Node[]): WeakMap<Element, SourceAttribute[]> {
  const sourceElements: { name: string; attributes: SourceAttribute[] }[] = [];
  const openTag = /<([A-Za-z][A-Za-z0-9]*)(\s+(?:[^"'<>]|"[^"]*"|'[^']*')*)?\s*\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = openTag.exec(body))) {
    sourceElements.push({
      name: match[1].toLowerCase(),
      attributes: parseAttributes(match[2] || ''),
    });
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

  const attributesByElement = new WeakMap<Element, SourceAttribute[]>();
  let sourceIndex = 0;
  for (const element of domElements) {
    const source = sourceElements[sourceIndex];
    if (source?.name === element.tagName.toLowerCase()) {
      attributesByElement.set(element, source.attributes);
      sourceIndex += 1;
    }
  }
  return attributesByElement;
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

type SourceAttribute = {
  name: string;
  value?: string;
  bare: boolean;
  quoted?: boolean;
  fromDom?: boolean;
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
    if (/^on/i.test(attribute.name)) {
      throw new Error(`unknown prop "${attribute.name}" for <${definition.name}>`);
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
      throw new Error(`unknown prop "${attribute.name}" for <${definition.name}>`);
    }
    if (!attribute.fromDom && !attribute.quoted && attribute.value?.includes('{')) {
      throw new Error(`brace expressions are not allowed in prop "${attribute.name}"`);
    }
    supplied.add(declaration.name);
    props[declaration.name] = parseDefinitionProp(definition.name, declaration, attribute);
  }

  for (const declaration of declarations.values()) {
    if (supplied.has(declaration.name)) {
      continue;
    }
    if (declaration.required) {
      throw new Error(`required prop "${declaration.name}" is missing for <${definition.name}>`);
    }
    if (declaration.default !== undefined) {
      props[declaration.name] = declaration.default;
    }
  }
  return props;
}

function parseDefinitionProp(
  componentName: string,
  prop: HtmdxProp,
  attribute: SourceAttribute,
): unknown {
  let value: unknown;
  if (prop.type === 'string') {
    if (attribute.bare && attribute.value === undefined) {
      throw new Error(`prop "${prop.name}" for <${componentName}> requires a string value`);
    }
    value = attribute.value ?? '';
  } else if (prop.type === 'number') {
    const source = attribute.value;
    value =
      source !== undefined && /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(source)
        ? Number(source)
        : Number.NaN;
    if (!Number.isFinite(value)) {
      throw new Error(`prop "${prop.name}" for <${componentName}> must be a finite number`);
    }
  } else if (prop.type === 'boolean') {
    if (attribute.bare) {
      value = true;
    } else if (attribute.value === 'true' || attribute.value === 'false') {
      value = attribute.value === 'true';
    } else {
      throw new Error(`prop "${prop.name}" for <${componentName}> must be true or false`);
    }
  } else {
    if (attribute.bare || attribute.value === undefined) {
      throw new Error(`prop "${prop.name}" for <${componentName}> must be valid JSON`);
    }
    try {
      value = JSON.parse(attribute.value);
    } catch {
      throw new Error(`prop "${prop.name}" for <${componentName}> must be valid JSON`);
    }
  }

  validateConstraints(componentName, prop, value);
  return value;
}

function assertDeclarativeBody(componentName: string, body: string, allowTags = false): void {
  let syntax = markdownSyntaxSource(body);
  if (allowTags && /=\s*\{/.test(syntax)) {
    throw new Error(`component <${componentName}> body does not allow brace expressions`);
  }
  if (allowTags) {
    syntax = syntax.replace(/<[^>]*>/g, '');
  }
  if (/^\s*(import|export)\b/m.test(syntax)) {
    throw new Error(`component <${componentName}> body does not allow imports or exports`);
  }
  if (/[{}]/.test(syntax)) {
    throw new Error(`component <${componentName}> body does not allow brace expressions`);
  }
}

function attrsToProps(attrs: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attribute of parseAttributes(attrs)) {
    props[normalizePropName(attribute.name)] = attribute.bare
      ? true
      : parseAttrValue(attribute.value ?? '');
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
