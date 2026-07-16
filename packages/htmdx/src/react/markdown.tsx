// The block + inline Markdown renderer for the React runtime. Produces real
// React elements (no HTML strings, no dangerouslySetInnerHTML): text is escaped
// by React, links are scheme-checked, and headings register into the TOC.
import { createElement, type ReactNode } from 'react';
import { safeHref, slugify, uniqueSlug, type RenderContext } from './rendering';

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

export function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
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
  return nodes.length === 1 ? nodes[0] : nodes;
}

export function renderMarkdown(markdown: string, context?: RenderContext): ReactNode[] {
  return markdown
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((block, index) => renderBlock(block, index, context));
}

function renderBlock(block: string, key: number, context?: RenderContext): ReactNode {
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

function parseList(body: string) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}
