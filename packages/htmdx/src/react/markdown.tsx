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

const HTML_TAG = /<\/?([A-Za-z][A-Za-z0-9]*)(?:\s[^>]*)?\/?>/g;
const ATX_HEADING = /^(#{1,6}) /;
// A closing sequence is decoration, not part of the label: `## Title ##`.
const ATX_CLOSING = /\s+#+$/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const BLOCKQUOTE = /^ {0,3}>/;
const BLOCKQUOTE_MARKER = /^ {0,3}> ?/;
const LIST_BLOCK = /^(?:-|\d{1,9}[.)])\s/;
const LIST_ITEM = /^(\s*)(?:-|(\d{1,9})[.)])\s+(.*)$/;
// Mirrors the autolink form `markdownSyntaxSource` masks, so what the mask
// hides from emphasis is exactly what renders as a link.
const AUTOLINK = /^<((?:https?:\/\/|mailto:)[^<>\s]+)>|^<([^<>\s@]+@[^<>\s@]+)>/i;
// CommonMark escapes ASCII punctuation only, so `C:\path` keeps its backslash.
const ESCAPABLE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;
// Indentation is author-controlled, so a document with runaway indentation would
// otherwise build a React tree deep enough to exhaust the render stack.
const MAX_LIST_DEPTH = 6;
// Emphasis nests by recursion, and the delimiters come from the document, so
// the same ceiling applies here.
const MAX_INLINE_DEPTH = 6;

// Matched against the masked syntax, so a delimiter inside code or behind a
// backslash cannot open a span. Longest run first: `***` before `**` before
// `*`. Underscore forms are flagged `word` because CommonMark refuses them
// mid-word — `snake_case_name` is an identifier, not emphasis.
type Delimiter = { pattern: RegExp; tags: string[]; word?: boolean };

const DELIMITERS: Delimiter[] = [
  { pattern: /\*\*\*([^\n]+?)\*\*\*/y, tags: ['strong', 'em'] },
  { pattern: /___([^\n]+?)___/y, tags: ['strong', 'em'], word: true },
  { pattern: /\*\*([^\n]+?)\*\*/y, tags: ['strong'] },
  { pattern: /__([^\n]+?)__/y, tags: ['strong'], word: true },
  { pattern: /~~([^\n]+?)~~/y, tags: ['del'] },
  { pattern: /\*([^\n]+?)\*/y, tags: ['em'] },
  { pattern: /_([^\n]+?)_/y, tags: ['em'], word: true },
];

const LINK = /\[([^\]]+)\]\(([^)]+)\)/y;
// Ordinary prose is mostly letters: without this, every character would pay for
// a sticky match against each delimiter in turn.
const MARKUP_STARTERS = new Set(['*', '_', '~', '[']);

// Raw HTML is parsed by the caller: it owns the component catalog, so a
// registered tag nested in allowlisted markup still resolves to its component.
export type HtmlRenderer = (source: string, key: string) => ReactNode;

type ParsedImage = {
  start: number;
  end: number;
  attributes: Record<string, string | undefined>;
  fallback: string;
};

type TableAlignment = 'left' | 'center' | 'right' | undefined;

type ParsedTable = {
  header: string[];
  alignments: TableAlignment[];
  rows: string[][];
  remainder: string;
};

export function renderInline(text: string, html?: HtmlRenderer): ReactNode {
  const syntax = markdownSyntaxSource(text);
  if (html && hasHtmlElement(syntax)) {
    return html(text, 'html');
  }

  const nodes = renderInlineNodes(text, syntax, 0);
  return nodes.length === 1 ? nodes[0] : nodes;
}

// One linear pass over the source, paired with the masked syntax that
// `markdownSyntaxSource` produces. A position whose syntax character differs
// from its source character is code, an escape, or an autolink: it is consumed
// as that, and never read as a delimiter. Everything else is free to open a
// span, whose content is rendered by the same pass so markup nests.
function renderInlineNodes(source: string, syntax: string, depth: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let pending = '';
  let key = 0;

  const flush = () => {
    if (pending) {
      nodes.push(pending);
      pending = '';
    }
  };
  const push = (node: ReactNode) => {
    flush();
    nodes.push(node);
  };

  let index = 0;
  while (index < source.length) {
    const character = source[index];
    const masked = syntax[index] !== character;

    if (masked && character === '\\') {
      const escaped = source[index + 1] ?? '';
      pending += ESCAPABLE.test(escaped) ? escaped : `${character}${escaped}`;
      index += escaped ? 2 : 1;
      continue;
    }

    if (masked && character === '`') {
      const span = parseCodeSpan(source, index);
      if (span) {
        push(createElement('code', { key: key++ }, span.code));
        index = span.end;
        continue;
      }
    }

    if (masked && character === '<') {
      const link = parseAutolink(source, index);
      if (link) {
        push(
          link.href ? createElement('a', { key: key++, href: link.href }, link.label) : link.label,
        );
        index = link.end;
        continue;
      }
    }

    if (!masked) {
      const image = parseImage(source, syntax, index);
      if (image) {
        const attributes = safeImageAttributes(image.attributes);
        push(attributes ? createElement('img', { key: key++, ...attributes }) : image.fallback);
        index = image.end;
        continue;
      }

      const markup = MARKUP_STARTERS.has(character)
        ? parseMarkup(source, syntax, index, depth, key)
        : null;
      if (markup) {
        push(markup.node);
        key += 1;
        index = markup.end;
        continue;
      }
    }

    pending += character;
    index += 1;
  }

  flush();
  return nodes;
}

function parseImage(source: string, syntax: string, index: number) {
  if (source[index] === '!' && source[index + 1] === '[') {
    return parseMarkdownImage(source, syntax, index);
  }
  if (source[index] === '<' && source.slice(index + 1, index + 4).toLowerCase() === 'img') {
    return parseHtmlImage(source, index);
  }
  return null;
}

function parseMarkup(
  source: string,
  syntax: string,
  index: number,
  depth: number,
  key: number,
): { node: ReactNode; end: number } | null {
  LINK.lastIndex = index;
  const link = LINK.exec(syntax);
  if (link) {
    const end = LINK.lastIndex;
    const href = safeHref(source.slice(end - 1 - link[2].length, end - 1));
    const children = renderChildren(source, syntax, index + 1, index + 1 + link[1].length, depth);
    return {
      node: href
        ? createElement('a', { key, href }, children)
        : createElement(Fragment, { key }, children),
      end,
    };
  }

  for (const { pattern, tags, word } of DELIMITERS) {
    pattern.lastIndex = index;
    const match = pattern.exec(syntax);
    if (!match) {
      continue;
    }

    const opening = (pattern.lastIndex - index - match[1].length) / 2;
    const contentStart = index + opening;
    // A lazy match stops at the first closing run, which cuts a longer run in
    // the wrong place: in `**a *b***` the strong has to close on the last two
    // stars so the `*` left over can close the emphasis inside it.
    const overrun = runLength(syntax, pattern.lastIndex - opening, source[index]) - opening;
    const contentEnd = pattern.lastIndex - opening + Math.max(overrun, 0);
    const end = contentEnd + opening;
    const content = source.slice(contentStart, contentEnd);
    // A delimiter run only opens a span when it hugs its content, so `2 * 3 * 4`
    // and `a _ b _ c` stay arithmetic and prose.
    if (/^\s|\s$/.test(content)) {
      continue;
    }
    if (word && !isWordBoundary(source, index, end)) {
      continue;
    }

    const children = renderChildren(source, syntax, contentStart, contentEnd, depth);
    const node = tags.reduceRight<ReactNode>(
      (inner, tag, position) => createElement(tag, position === 0 ? { key } : {}, inner),
      children,
    );
    return { node, end };
  }

  return null;
}

function renderChildren(
  source: string,
  syntax: string,
  start: number,
  end: number,
  depth: number,
): ReactNode {
  const content = source.slice(start, end);
  if (depth >= MAX_INLINE_DEPTH) {
    return content;
  }
  const nodes = renderInlineNodes(content, syntax.slice(start, end), depth + 1);
  return nodes.length === 1 ? nodes[0] : nodes;
}

function runLength(syntax: string, start: number, character: string) {
  let length = 0;
  while (syntax[start + length] === character) {
    length += 1;
  }
  return length;
}

// Underscore emphasis is refused mid-word, so identifiers survive intact.
function isWordBoundary(source: string, start: number, end: number) {
  const before = source[start - 1];
  const after = source[end];
  return !(before && WORD_CHARACTER.test(before)) && !(after && WORD_CHARACTER.test(after));
}

function parseCodeSpan(source: string, start: number) {
  const fence = source.slice(start).match(/^`+/)?.[0] ?? '';
  const closing = source.indexOf(fence, start + fence.length);
  if (closing < 0) {
    return null;
  }
  const raw = source.slice(start + fence.length, closing);
  // One space either side is stripping, not content: it is what lets a span
  // hold a backtick of its own.
  const code = raw.trim() && /^ [\s\S]* $/.test(raw) ? raw.slice(1, -1) : raw;
  return { code, end: closing + fence.length };
}

function parseAutolink(source: string, start: number) {
  const match = AUTOLINK.exec(source.slice(start));
  if (!match) {
    return null;
  }
  const label = match[1] ?? match[2];
  const target = match[1] ? label : `mailto:${label}`;
  return { label, href: safeHref(target), end: start + match[0].length };
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
  const table = parseGfmTable(block);
  if (table) {
    const renderedTable = createElement(
      'table',
      { key: 'table' },
      createElement(
        'thead',
        null,
        createElement(
          'tr',
          null,
          ...table.header.map((cell, index) =>
            createElement(
              'th',
              {
                key: index,
                ...(table.alignments[index]
                  ? { style: { textAlign: table.alignments[index] } }
                  : {}),
              },
              renderInline(cell, html),
            ),
          ),
        ),
      ),
      createElement(
        'tbody',
        null,
        ...table.rows.map((row, rowIndex) =>
          createElement(
            'tr',
            { key: rowIndex },
            ...row.map((cell, cellIndex) =>
              createElement(
                'td',
                {
                  key: cellIndex,
                  ...(table.alignments[cellIndex]
                    ? { style: { textAlign: table.alignments[cellIndex] } }
                    : {}),
                },
                renderInline(cell, html),
              ),
            ),
          ),
        ),
      ),
    );
    if (!table.remainder) {
      return createElement(Fragment, { key }, renderedTable);
    }
    return createElement(
      Fragment,
      { key },
      renderedTable,
      ...renderMarkdown(table.remainder, context, html),
    );
  }
  // Ahead of the list check: `- - -` is a break, not three empty bullets.
  if (THEMATIC_BREAK.test(block)) {
    return createElement('hr', { key });
  }
  const heading = ATX_HEADING.exec(block);
  if (heading) {
    const level = heading[1].length;
    const label = block.slice(level + 1).replace(ATX_CLOSING, '');
    // Only `##` anchors the table of contents; deeper levels are body structure.
    if (level !== 2) {
      return createElement(`h${level}`, { key }, renderInline(label, html));
    }
    const id = context ? uniqueSlug(label, context) : slugify(label);
    if (context) {
      context.headings.push({ id, label });
    }
    return createElement('h2', { key, id }, renderInline(label, html));
  }
  if (BLOCKQUOTE.test(block)) {
    // The quoted body is markdown in its own right, so it goes back through the
    // block renderer: a list or a heading inside a quote stays one.
    const quoted = block
      .split('\n')
      .map((line) => line.replace(BLOCKQUOTE_MARKER, ''))
      .join('\n');
    return createElement('blockquote', { key }, ...renderMarkdown(quoted, context, html));
  }
  if (isListBlock(block)) {
    return createElement(Fragment, { key }, ...renderLists(parseList(block), 'list', html));
  }
  return createElement('p', { key }, renderInline(block.replace(/\n/g, ' '), html));
}

function parseGfmTable(block: string): ParsedTable | null {
  const lines = block.split(/\r?\n/);
  if (lines.length < 2) {
    return null;
  }

  const header = splitTableRow(lines[0]);
  const separator = splitTableRow(lines[1]);
  if (
    !header.hasDelimiter ||
    !separator.hasDelimiter ||
    header.cells.length === 0 ||
    separator.cells.length !== header.cells.length ||
    separator.cells.some((cell) => !/^:?-{3,}:?$/.test(cell))
  ) {
    return null;
  }

  const alignments = separator.cells.map<TableAlignment>((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) {
      return 'center';
    }
    if (right) {
      return 'right';
    }
    return left ? 'left' : undefined;
  });

  const rows: string[][] = [];
  let lineIndex = 2;
  for (; lineIndex < lines.length; lineIndex += 1) {
    const row = splitTableRow(lines[lineIndex]);
    if (!row.hasDelimiter) {
      break;
    }
    rows.push(Array.from({ length: header.cells.length }, (_, index) => row.cells[index] ?? ''));
  }

  return {
    header: header.cells,
    alignments,
    rows,
    remainder: lines.slice(lineIndex).join('\n').trim(),
  };
}

function splitTableRow(line: string) {
  const syntax = markdownSyntaxSource(line, { indentedCode: false });
  const delimiters: number[] = [];
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '|' && syntax[index] === '|') {
      delimiters.push(index);
    }
  }

  const cells: string[] = [];
  let start = 0;
  for (const delimiter of delimiters) {
    cells.push(line.slice(start, delimiter).trim());
    start = delimiter + 1;
  }
  cells.push(line.slice(start).trim());

  if (delimiters[0] !== undefined && !line.slice(0, delimiters[0]).trim()) {
    cells.shift();
  }
  const lastDelimiter = delimiters.at(-1);
  if (lastDelimiter !== undefined && !line.slice(lastDelimiter + 1).trim()) {
    cells.pop();
  }

  return { cells, hasDelimiter: delimiters.length > 0 };
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
