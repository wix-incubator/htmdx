import { createElement, type ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { compile, registerComponent, validate } from '../src';
import { snapshot } from '../src/testing';
import type { HtmdxComponent } from '../src/components';

const query = (source: string, selector: string) => {
  const rendered = compile(source);
  const container = document.createElement('div');
  container.innerHTML = rendered.ok ? rendered.html : '';
  return container.querySelector(selector);
};

const definition = (
  value: Pick<HtmdxComponent, 'name' | 'body' | 'Component'>,
): HtmdxComponent => ({
  purpose: `Purpose for ${value.name}`,
  example: `<${value.name} />`,
  ...value,
});

describe('inline SVG', () => {
  test('renders a block-level graphic with its shape attributes', () => {
    const circle = query(
      '<svg viewBox="0 0 24 24" width="48" height="48">\n<circle cx="12" cy="12" r="10" fill="#0af" stroke="#036" stroke-width="2"></circle>\n</svg>',
      'svg circle',
    );

    expect(circle?.closest('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(circle?.getAttribute('cx')).toBe('12');
    expect(circle?.getAttribute('fill')).toBe('#0af');
    expect(circle?.getAttribute('stroke-width')).toBe('2');
  });

  test('renders a graphic written mid-sentence inside the paragraph', () => {
    const rendered = compile(
      'Rating <svg viewBox="0 0 10 10" width="12"><path d="M0 0 L10 10"/></svg> of five.',
    );

    expect(rendered.ok && rendered.html).toContain('<p>Rating <svg');
    expect(rendered.ok && rendered.html).toContain('<path d="M0 0 L10 10"></path>');
  });

  test('keeps case-sensitive element names', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 20">\n<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"></stop></linearGradient></defs>\n<rect width="100" height="20" fill="url(#g)"></rect>\n</svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<linearGradient id="g">');
    expect(rendered.ok && rendered.html).toContain('fill="url(#g)"');
  });

  // The XML parse keeps `linearGradient` as written, but a bare attribute
  // anywhere in the block forces the forgiving HTML parse, which uppercases
  // every tag name. The allowlist is what restores the canonical casing.
  test('restores canonical casing when the parse flattens it', () => {
    const rendered = compile(
      '<svg viewBox="0 0 20 20">\n<defs><lineargradient id="g"><stop offset="0"></stop></lineargradient></defs>\n<circle r="4" fill="url(#g)"></circle>\n</svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<linearGradient id="g">');
  });

  test('renders text content as written, without Markdown', () => {
    const text = query(
      '<svg viewBox="0 0 100 20"><text x="4" y="14" font-size="12" text-anchor="start">**Hello**</text></svg>',
      'svg text',
    );

    expect(text?.textContent).toBe('**Hello**');
    expect(text?.getAttribute('font-size')).toBe('12');
    expect(text?.querySelector('strong')).toBe(null);
  });

  test('keeps a graphic inside a raw HTML block alongside Markdown', () => {
    const wrapper = query(
      '<div class="chart">\n\n## Revenue\n\n<svg viewBox="0 0 10 10"><circle r="4"></circle></svg>\n\n</div>',
      'div.chart',
    );

    expect(wrapper?.querySelector('h2')?.textContent).toBe('Revenue');
    expect(wrapper?.querySelector('svg circle')?.getAttribute('r')).toBe('4');
  });

  test('renders a graphic inside a component body', () => {
    registerComponent(
      definition({
        name: 'SvgBody',
        body: 'htmdx',
        Component: ({ children }: { children?: ReactNode }) =>
          createElement('section', null, children),
      }),
    );
    const rendered = compile(
      '<SvgBody>\n<svg viewBox="0 0 10 10"><circle r="4" fill="#0af"></circle></svg>\n</SvgBody>',
    );

    expect(rendered.ok && rendered.html).toContain(
      '<svg viewBox="0 0 10 10"><circle r="4" fill="#0af"></circle></svg>',
    );
  });

  test('allows a same-document reference on textPath', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 20"><defs><path id="p" d="M0 10 H100"></path></defs><text><textPath href="#p">Curved</textPath></text></svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<textPath href="#p">Curved</textPath>');
  });

  test('drops a reference that leaves the document', () => {
    const rendered = compile(
      '<svg viewBox="0 0 100 20"><text><textPath href="https://evil.example/x#p">Curved</textPath></text></svg>',
    );

    expect(rendered.ok && rendered.html).toContain('<textPath>Curved</textPath>');
    expect(rendered.ok && rendered.html).not.toContain('evil.example');
  });

  test('drops a paint value pointing outside the document', () => {
    const rect = query(
      '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="url(https://evil.example/x)"></rect></svg>',
      'svg rect',
    );

    expect(rect?.hasAttribute('fill')).toBe(false);
  });

  test('sanitizes style declarations on a shape', () => {
    const circle = query(
      '<svg viewBox="0 0 10 10"><circle r="4" style="fill: red; background-image: url(javascript:alert(1))"></circle></svg>',
      'svg circle',
    );

    expect(circle?.getAttribute('style')).toBe('fill: red;');
  });

  test('rejects event handler attributes', () => {
    const rendered = compile(
      '<svg viewBox="0 0 10 10"><circle r="4" onclick="alert(1)"></circle></svg>',
    );

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('onclick');
  });

  // The elements that can reach out of the graphic — into script, into HTML,
  // or into another document — are not markup here, so they render as the text
  // they were written as rather than failing the document.
  test.each([
    ['script', '<script>alert(1)</script>'],
    ['foreignObject', '<foreignObject width="10" height="10"><div>x</div></foreignObject>'],
    ['use', '<use href="/sprite.svg#icon"></use>'],
    ['image', '<image href="https://evil.example/x.png"></image>'],
    ['animate', '<animate attributeName="href" to="javascript:alert(1)"></animate>'],
  ])('keeps <%s> literal inside a graphic', (name, markup) => {
    const rendered = compile(
      `<svg viewBox="0 0 10 10">\n${markup}\n<circle r="4"></circle>\n</svg>`,
    );

    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.html).toContain(`&lt;${name}`);
    expect(rendered.ok && rendered.html).toContain('<circle r="4">');
  });

  test('keeps an SVG element written outside a graphic as prose', () => {
    const rendered = compile('A bare <path d="M0 0"/> in prose.');

    expect(rendered.ok && rendered.html).toContain('&lt;path d="M0 0"/&gt;');
    expect(rendered.ok && rendered.html).not.toContain('<path');
  });

  test('keeps SVG inside code fences and spans literal', () => {
    const rendered = compile(
      '```html\n<svg><circle/></svg>\n```\n\nInline `<svg viewBox="0 0 1 1">` stays text.',
    );

    expect(rendered.ok && rendered.html).toContain(
      '<code>&lt;svg&gt;&lt;circle/&gt;&lt;/svg&gt;</code>',
    );
    expect(rendered.ok && rendered.html).toContain('<code>&lt;svg viewBox="0 0 1 1"&gt;</code>');
  });

  test('reports a registered component used inside a graphic', () => {
    registerComponent(
      definition({
        name: 'NotInSvg',
        body: 'none',
        Component: () => createElement('em', null, 'nope'),
      }),
    );
    const rendered = compile('<svg viewBox="0 0 10 10"><NotInSvg /></svg>');

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('<NotInSvg> is not allowed inside <svg>');
  });

  test('still reports an unknown capitalized tag inside a graphic', () => {
    const rendered = compile('<svg viewBox="0 0 10 10"><NotRegisteredAtAll /></svg>');

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('unknown component <NotRegisteredAtAll>');
  });

  test('reports event handlers in a graphic without rendering it', () => {
    const diagnostics = validate(
      '<svg viewBox="0 0 10 10"><circle onclick="go()"></circle></svg>\n',
    );

    expect(diagnostics.map(({ code }) => code)).toEqual(['event-handler-attribute']);
  });

  test('does not report a graphic that only degrades', () => {
    expect(validate('<svg viewBox="0 0 10 10">\n<script>alert(1)</script>\n</svg>\n')).toEqual([]);
  });

  test('snapshots a graphic as the elements it was written as', () => {
    expect(snapshot('<svg viewBox="0 0 10 10">\n<circle r="4"></circle>\n</svg>\n')).toBe(
      ['<svg viewBox="0 0 10 10">', '  <circle r="4" />'].join('\n'),
    );
  });
});
