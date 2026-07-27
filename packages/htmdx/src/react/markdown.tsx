// The block + inline Markdown renderer for the React runtime. Produces real
// React elements (no HTML strings, no dangerouslySetInnerHTML): text is escaped
// by React, links and images are scheme-checked, and headings register into the TOC.
import { createElement, Fragment, type ReactNode } from 'react';
import { markdownSyntaxSource } from '../components/body-contracts';
import { HTML_ELEMENTS } from '../components/html-elements';
import {
  decodeHtmlEntities,
  safeHref,
  safeImageAttributes,
  slugify,
  uniqueSlug,
  type RenderContext,
} from '../components/rendering';
import { CodeBlock } from './CodeBlock';
import { MermaidDiagram } from './mermaid';

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
const HTML_TAG = /<\/?([A-Za-z][A-Za-z0-9]*)(?:\s[^>]*)?\/?>/g;
const LIST_BLOCK = /^(?:-|\d{1,9}[.)])\s/;
const LIST_ITEM = /^(\s*)(?:-|(\d{1,9})[.)])\s+(.*)$/;
// Indentation is author-controlled, so a document with runaway indentation would
// otherwise build a React tree deep enough to exhaust the render stack.
const MAX_LIST_DEPTH = 6;

// Raw HTML is parsed by the caller: it owns the component catalog, so a
// registered tag nested in allowlisted markup still resolves to its component.
export type HtmlRenderer = (source: string, key: string) => ReactNode;

type ParsedImage = {
  start: number;
  end: number;
  attributes: Record<string, string | undefined>;
  fallback: string;
};

export function renderInline(text: string, html?: HtmlRenderer): ReactNode {
  const syntax = markdownSyntaxSource(text);
  if (html && hasHtmlElement(syntax)) {
    return html(text, 'html');
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  let image = findNextImage(text, syntax, cursor);

  while (image) {
    appendInlineText(nodes, text.slice(cursor, image.start), key);
    key = nodes.length;
    const attributes = safeImageAttributes(image.attributes);
    nodes.push(attributes ? createElement('img', { key: key++, ...attributes }) : image.fallback);
    cursor = image.end;
    image = findNextImage(text, syntax, cursor);
  }

  appendInlineText(nodes, text.slice(cursor), key);
  return nodes.length === 1 ? nodes[0] : nodes;
}

function appendInlineText(nodes: ReactNode[], text: string, initialKey: number) {
  let last = 0;
  let key = initialKey;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text))) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(createElement('strong', { key: key++ }, match[1]));
    } else if (match[2] !== undefined) {
      nodes.push(createElement('code', { key: key++ }, match[2]));
    } else {
      const href = safeHref(match[4]);
      nodes.push(href ? createElement('a', { key: key++, href }, match[3]) : match[3]);
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
}

export function renderMarkdown(
  markdown: string,
  context?: RenderContext,
  html?: HtmlRenderer,
): ReactNode[] {
  return splitMarkdownBlocks(markdown).map((block, index) =>
    renderBlock(block, index, context, html),
  );
}

function renderBlock(
  block: string,
  key: number,
  context?: RenderContext,
  html?: HtmlRenderer,
): ReactNode {
  const fencedCode = renderFencedCode(block, key);
  if (fencedCode) {
    return fencedCode;
  }
  if (block.startsWith('### ')) {
    return createElement('h3', { key }, renderInline(block.slice(4), html));
  }
  if (block.startsWith('## ')) {
    const label = block.slice(3);
    const id = context ? uniqueSlug(label, context) : slugify(label);
    if (context) {
      context.headings.push({ id, label });
    }
    return createElement('h2', { key, id }, renderInline(label, html));
  }
  if (block.startsWith('# ')) {
    return createElement('h1', { key }, renderInline(block.slice(2), html));
  }
  if (isListBlock(block)) {
    return createElement(Fragment, { key }, ...renderLists(parseList(block), 'list', html));
  }
  return createElement('p', { key }, renderInline(block.replace(/\n/g, ' '), html));
}

function hasHtmlElement(syntax: string) {
  HTML_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HTML_TAG.exec(syntax))) {
    const tag = match[1].toLowerCase();
    // `svg` alone, not the whole SVG allowlist: a bare `<path>` in prose is
    // text, and inside a graphic the renderer has already taken over.
    if (HTML_ELEMENTS.has(tag) || tag === 'svg') {
      return true;
    }
  }
  return false;
}

function splitMarkdownBlocks(markdown: string) {
  const blocks: string[] = [];
  let lines: string[] = [];
  let fence: { marker: string; length: number } | null = null;
  const push = () => {
    const block = lines.join('\n').trim();
    if (block) {
      blocks.push(block);
    }
    lines = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      lines.push(line);
      if (
        marker?.[0] === fence.marker &&
        marker.length >= fence.length &&
        new RegExp(`^ {0,3}${fence.marker}{${fence.length},}\\s*$`).test(line)
      ) {
        fence = null;
        push();
      }
      continue;
    }
    if (marker) {
      push();
      fence = { marker: marker[0], length: marker.length };
      lines.push(line);
      continue;
    }
    if (!line.trim()) {
      push();
      continue;
    }
    lines.push(line);
  }

  push();
  return blocks;
}

function renderFencedCode(block: string, key: number) {
  const lines = block.split(/\r?\n/);
  const opening = lines[0]?.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!opening) {
    return null;
  }

  const marker = opening[1];
  const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`);
  const codeLines = closing.test(lines.at(-1) || '') ? lines.slice(1, -1) : lines.slice(1);
  const code = codeLines.join('\n');
  const language = fenceLanguage(opening[2]);

  // The diagram renders itself into the same fence markup until mermaid has
  // loaded, so compile() stays synchronous and an artifact that never reaches
  // a browser still shows the diagram source.
  if (language === 'mermaid') {
    return createElement(MermaidDiagram, { key, source: code });
  }

  return createElement(CodeBlock, { key, code, language });
}

// Only the first word of the info string, and only when it is a bare language
// name. CommonMark lets the rest carry anything, and it lands in a class
// attribute, so a value that is not a plain identifier is dropped rather than
// escaped.
export function fenceLanguage(info: string) {
  const word = info.trim().split(/\s+/)[0]?.toLowerCase() || '';
  return /^[a-z][a-z0-9+#._-]*$/.test(word) ? word : '';
}

function findNextImage(source: string, syntax: string, from: number): ParsedImage | null {
  for (let index = from; index < syntax.length; index += 1) {
    if (syntax[index] === '!' && syntax[index + 1] === '[') {
      const image = parseMarkdownImage(source, syntax, index);
      if (image) {
        return image;
      }
    }
    if (syntax[index] === '<' && syntax.slice(index + 1, index + 4).toLowerCase() === 'img') {
      const image = parseHtmlImage(source, index);
      if (image) {
        return image;
      }
    }
  }
  return null;
}

function parseMarkdownImage(source: string, syntax: string, start: number): ParsedImage | null {
  let labelDepth = 0;
  let labelEnd = -1;
  for (let index = start + 2; index < syntax.length; index += 1) {
    if (syntax[index] === '[') {
      labelDepth += 1;
      continue;
    }
    if (syntax[index] !== ']') {
      continue;
    }
    if (labelDepth > 0) {
      labelDepth -= 1;
      continue;
    }
    labelEnd = index;
    break;
  }
  if (labelEnd < 0 || syntax[labelEnd + 1] !== '(') {
    return null;
  }

  let cursor = labelEnd + 2;
  while (/\s/.test(syntax[cursor] || '')) {
    cursor += 1;
  }
  const sourceStart = cursor;
  let sourceEnd = cursor;

  if (syntax[cursor] === '<') {
    sourceEnd = syntax.indexOf('>', cursor + 1);
    if (sourceEnd < 0) {
      return null;
    }
    cursor = sourceEnd + 1;
  } else {
    let depth = 0;
    while (cursor < syntax.length) {
      const character = syntax[cursor];
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        if (depth === 0) {
          break;
        }
        depth -= 1;
      } else if (/\s/.test(character) && depth === 0) {
        break;
      }
      cursor += 1;
    }
    sourceEnd = cursor;
  }

  while (/\s/.test(syntax[cursor] || '')) {
    cursor += 1;
  }
  let title: string | undefined;
  const quote = syntax[cursor];
  if (quote === '"' || quote === "'") {
    const titleStart = cursor + 1;
    const titleEnd = syntax.indexOf(quote, titleStart);
    if (titleEnd < 0) {
      return null;
    }
    title = source.slice(titleStart, titleEnd);
    cursor = titleEnd + 1;
    while (/\s/.test(syntax[cursor] || '')) {
      cursor += 1;
    }
  }
  if (syntax[cursor] !== ')') {
    return null;
  }

  const src = source.slice(sourceStart + (syntax[sourceStart] === '<' ? 1 : 0), sourceEnd);
  return {
    start,
    end: cursor + 1,
    attributes: { src, alt: source.slice(start + 2, labelEnd), title },
    fallback: source.slice(start + 2, labelEnd),
  };
}

function parseHtmlImage(source: string, start: number): ParsedImage | null {
  const boundary = source[start + 4];
  if (boundary && !/[\s/>]/.test(boundary)) {
    return null;
  }

  let quote: '"' | "'" | null = null;
  for (let index = start + 4; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character !== '>') {
      continue;
    }

    const attributes = parseHtmlAttributes(source.slice(start + 4, index).replace(/\/\s*$/, ''));
    return {
      start,
      end: index + 1,
      attributes,
      fallback: attributes.alt || '',
    };
  }
  return null;
}

function parseHtmlAttributes(source: string) {
  const attributes = new Map<string, string>();
  const pattern = /([A-Za-z][A-Za-z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes.set(name, name.toLowerCase() === 'src' ? value : decodeHtmlEntities(value));
  }
  return Object.fromEntries(attributes);
}

type List = { ordered: boolean; start: number; items: ListItem[] };
type ListItem = { text: string; children: List[] };

export function isListBlock(block: string) {
  return LIST_BLOCK.test(block);
}

// One indent level holds the sibling lists written at that depth: `- a` followed
// by `1. b` is two lists, the way CommonMark reads a change of marker.
type Level = { indent: number; lists: List[]; item: ListItem | null };

function parseList(body: string): List[] {
  const lists: List[] = [];
  const levels: Level[] = [{ indent: 0, lists, item: null }];
  let current: ListItem | null = null;

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(LIST_ITEM);
    if (!match) {
      // A line the parser does not recognize belongs to the item above it.
      // Dropping it is how nested content used to disappear without a trace.
      const text = line.trim();
      if (text && current) {
        current.text = `${current.text} ${text}`.trim();
      }
      continue;
    }

    const [, indentation, number, text] = match;
    const indent = indentation.length;
    const ordered = number !== undefined;

    while (levels.length > 1 && indent < levels[levels.length - 1].indent) {
      levels.pop();
    }

    const enclosing = levels[levels.length - 1];
    if (indent > enclosing.indent && enclosing.item && levels.length < MAX_LIST_DEPTH) {
      levels.push({ indent, lists: enclosing.item.children, item: null });
    }

    const level = levels[levels.length - 1];
    let list = level.lists[level.lists.length - 1];
    if (!list || list.ordered !== ordered) {
      list = { ordered, start: ordered ? Number(number) : 1, items: [] };
      level.lists.push(list);
    }

    current = { text: text.trim(), children: [] };
    level.item = current;
    list.items.push(current);
  }

  return lists;
}

function renderLists(lists: List[], keyPrefix: string, html?: HtmlRenderer): ReactNode[] {
  return lists.map((list, index) =>
    createElement(
      list.ordered ? 'ol' : 'ul',
      {
        key: `${keyPrefix}-${index}`,
        ...(list.ordered && list.start !== 1 ? { start: list.start } : {}),
      },
      list.items.map((item, itemIndex) =>
        createElement(
          'li',
          { key: itemIndex },
          renderInline(item.text, html),
          ...renderLists(item.children, `${keyPrefix}-${index}-${itemIndex}`, html),
        ),
      ),
    ),
  );
}
