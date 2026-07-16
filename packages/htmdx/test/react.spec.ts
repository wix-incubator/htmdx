import { describe, expect, test } from 'vitest';
import { act, createElement, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { compileToReact, Htmdx, type HtmdxReactComponents } from '../src/react-poc';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const Card = (props: { className?: string; children?: ReactNode }) =>
  createElement('div', { className: `card ${props.className || ''}`.trim() }, props.children);

const CardTitle = (props: { children?: ReactNode }) =>
  createElement('h3', { className: 'card-title' }, props.children);

const Badge = (props: { variant?: string; children?: ReactNode }) =>
  createElement('span', { className: `badge badge-${props.variant || 'default'}` }, props.children);

const Counter = (props: { start?: number }) => {
  const [count, setCount] = useState(props.start ?? 0);
  return createElement(
    'button',
    { type: 'button', onClick: () => setCount((current) => current + 1) },
    `count:${count}`,
  );
};

const components: HtmdxReactComponents = { Card, CardTitle, Badge, Counter };

describe('react-poc renderer', () => {
  test('interleaves markdown blocks with mapped components', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `## Decision

Some **bold** narrative.

<Badge variant="success">shipped</Badge>

More text after.`,
        { components },
      ),
    );

    expect(html).toContain('<h2');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('class="badge badge-success"');
    expect(html.indexOf('badge-success')).toBeGreaterThan(html.indexOf('<h2'));
  });

  test('renders nested composition with props and intrinsic elements', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Card class="highlight" data-count="3">
  <CardTitle>Quarterly **update**</CardTitle>
  <p>Plain intrinsic paragraph</p>
  <Badge variant="warn">draft</Badge>
</Card>`,
        { components },
      ),
    );

    expect(html).toContain('class="card highlight"');
    expect(html).toContain('<h3 class="card-title">');
    expect(html).toContain('<strong>update</strong>');
    expect(html).toMatch(/<p>.*Plain intrinsic paragraph.*<\/p>/);
    expect(html).toContain('badge-warn');
  });

  test('handles nested same-name tags via depth counting', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Card>
  outer
  <Card class="inner">inner body</Card>
</Card>`,
        { components },
      ),
    );

    expect(html).toContain('class="card inner"');
    expect((html.match(/class="card/g) || []).length).toBe(2);
  });

  test('supports self-closing components and typed attribute values', () => {
    const html = renderToStaticMarkup(compileToReact('<Counter start="5" />', { components }));
    expect(html).toContain('count:5');
  });

  test('markdown-only bodies render as block markdown', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Card>
- first
- second
</Card>`,
        { components },
      ),
    );

    expect(html).toContain('<li>first</li>');
    expect(html).toContain('<li>second</li>');
  });

  test('components are live React with working state', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);

    act(() => {
      root.render(createElement(Htmdx, { source: '<Counter start="5" />', components }));
    });
    expect(host.textContent).toContain('count:5');

    act(() => {
      host
        .querySelector('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(host.textContent).toContain('count:6');

    act(() => root.unmount());
    host.remove();
  });

  test('throws on unclosed component tags', () => {
    expect(() => compileToReact('<Card>never closed', { components })).toThrow(
      'unclosed component <Card>',
    );
  });

  test('leaves unregistered tags to markdown', () => {
    const html = renderToStaticMarkup(
      compileToReact('Text with <kbd>keys</kbd> stays markdown.', { components }),
    );
    expect(html).toContain('Text with');
  });
});
