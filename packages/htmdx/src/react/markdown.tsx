// The block + inline Markdown renderer for the React runtime. Produces real
// React elements (no HTML strings, no dangerouslySetInnerHTML): text is escaped
// by React, links and images are scheme-checked, and headings register into the TOC.
import { createElement, type ReactNode } from 'react';
import { markdownSyntaxSource } from '../components/body-contracts';
import {
  decodeHtmlEntities,
  safeHref,
  safeImageAttributes,
  slugify,
  uniqueSlug,
  type RenderContext,
} from '../components/rendering';

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

type ParsedImage = {
  start: number;
  end: number;
  attributes: Record<string, string | undefined>;
  fallback: string;
};

export function renderInline(text: string): ReactNode {
  const syntax = markdownSyntaxSource(text);
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

export function renderMarkdown(markdown: string, context?: RenderContext): ReactNode[] {
  return splitMarkdownBlocks(markdown).map((block, index) => renderBlock(block, index, context));
}

function renderBlock(block: string, key: number, context?: RenderContext): ReactNode {
  const fencedCode = renderFencedCode(block, key);
  if (fencedCode) {
    return fencedCode;
  }
  if (block.startsWith('### ')) {
    return createElement('h3', { key }, renderInline(block.slice(4)));
  }
  if (block.startsWith('## ')) {
    const label = block.slice(3);
    const id = context ? uniqueSlug(label, context) : slugify(label);
    if (context) {
      context.headings.push({ id, label });
    }
    return createElement('h2', { key, id }, renderInline(label));
  }
  if (block.startsWith('# ')) {
    return createElement('h1', { key }, renderInline(block.slice(2)));
  }
  if (block.startsWith('- ')) {
    return createElement(
      'ul',
      { key },
      parseList(block).map((item, index) =>
        createElement('li', { key: index }, renderInline(item)),
      ),
    );
  }
  return createElement('p', { key }, renderInline(block.replace(/\n/g, ' ')));
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
  const opening = lines[0]?.match(/^ {0,3}(`{3,}|~{3,})/);
  if (!opening) {
    return null;
  }

  const marker = opening[1];
  const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`);
  const codeLines = closing.test(lines.at(-1) || '') ? lines.slice(1, -1) : lines.slice(1);
  return createElement('pre', { key }, createElement('code', null, codeLines.join('\n')));
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

function parseList(body: string) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}
