import { createElement, type ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { compile, registerComponent, tokenizeBlocks, validate } from '../src';
import { snapshot } from '../src/testing';
import type { HtmdxComponent } from '../src/components';

const query = (source: string, selector: string, options?: Parameters<typeof compile>[1]) => {
  const rendered = compile(source, options);
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

describe('raw HTML', () => {
  test('renders inline anchors alongside Markdown links', () => {
    const rendered = compile('Read the [docs](https://wix.com) or <a href="/guide">the guide</a>.');

    expect(rendered.ok && rendered.html).toContain('<a href="https://wix.com">docs</a>');
    expect(rendered.ok && rendered.html).toContain('<a href="/guide">the guide</a>');
  });

  test('renders a video with nested source and track elements', () => {
    const video = query(
      '<video controls width="640" poster="poster.png">\n<source src="clip.webm" type="video/webm">\n<track kind="captions" src="clip.vtt" srclang="en" label="English" default>\n</video>',
      'video',
    );

    expect(video?.getAttribute('width')).toBe('640');
    expect(video?.getAttribute('poster')).toBe('poster.png');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.querySelector('source')?.getAttribute('src')).toBe('clip.webm');
    expect(video?.querySelector('track')?.getAttribute('srclang')).toBe('en');
  });

  test('renders an iframe with allowlisted attributes and drops srcdoc', () => {
    const iframe = query(
      '<iframe src="https://example.com/embed" width="560" height="315" allowfullscreen title="Demo" srcdoc="<script>alert(1)</script>"></iframe>',
      'iframe',
    );

    expect(iframe?.getAttribute('src')).toBe('https://example.com/embed');
    expect(iframe?.getAttribute('width')).toBe('560');
    expect(iframe?.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe?.hasAttribute('srcdoc')).toBe(false);
  });

  test('renders block wrappers containing Markdown and components', () => {
    registerComponent(
      definition({
        name: 'WrappedBadge',
        body: 'none',
        Component: () => createElement('em', null, 'badge'),
      }),
    );
    const wrapper = query(
      '<div class="grid">\n\n## Heading\n\n<WrappedBadge />\n\n</div>',
      'div.grid',
    );

    expect(wrapper?.querySelector('h2')?.textContent).toBe('Heading');
    expect(wrapper?.querySelector('em')?.textContent).toBe('badge');
  });

  test('reports components nested inside a raw HTML block', () => {
    registerComponent(
      definition({
        name: 'NestedInHtml',
        body: 'none',
        Component: () => createElement('em', null, 'nested'),
      }),
    );
    const rendered = compile('<section>\n\n<NestedInHtml />\n\n</section>');

    expect(rendered.ok && rendered.components).toContain('NestedInHtml');
  });

  test('tokenizes a block element as an html token', () => {
    expect(tokenizeBlocks('<p>Hello</p>')).toEqual([{ type: 'html', value: '<p>Hello</p>' }]);
  });

  test('keeps table markup intact', () => {
    const table = query(
      '<table>\n<thead><tr><th scope="col">Name</th></tr></thead>\n<tbody><tr><td colspan="2">Value</td></tr></tbody>\n</table>',
      'table',
    );

    expect(table?.querySelector('th')?.getAttribute('scope')).toBe('col');
    expect(table?.querySelector('td')?.getAttribute('colspan')).toBe('2');
  });

  test('sanitizes style declarations', () => {
    const paragraph = query(
      '<p style="color: red; background-image: url(javascript:alert(1)); width: expression(alert(1))">x</p>',
      'p[style]',
    );

    expect(paragraph?.getAttribute('style')).toBe('color: red;');
  });

  test('drops unsafe URL attributes', () => {
    const rendered = compile('<a href="javascript:alert(1)">bad</a>');

    expect(rendered.ok && rendered.html).toContain('<a>bad</a>');
    expect(rendered.ok && rendered.html).not.toContain('javascript:');
  });

  test('rejects event handler attributes', () => {
    const rendered = compile('<p onclick="alert(1)">x</p>');

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('onclick');
  });

  // A stray tag the allowlist does not cover is not markup, so it renders as
  // the text it already was outside an HTML block — never as an element, and
  // never by failing the whole document.
  test('keeps non-allowlisted elements literal inside an HTML block', () => {
    const rendered = compile('<div>\n<script>alert(1)</script>\n</div>');

    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered.ok && rendered.html).not.toContain('<script>');
  });

  test('keeps unsupported but harmless elements literal inside an HTML block', () => {
    const rendered = compile('<div>\n<form action="/x">Search</form>\n</div>');

    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.html).toContain('&lt;form action="/x"&gt;Search&lt;/form&gt;');
  });

  // Component bodies passed every lowercase tag straight to createElement
  // before the allowlist existed. That stays true, so documents written against
  // it keep rendering — except for the elements that turn source into code.
  test('keeps rendering non-allowlisted elements inside a component body', () => {
    registerComponent(
      definition({
        name: 'BodyPassthrough',
        body: 'htmdx',
        Component: ({ children }: { children?: ReactNode }) =>
          createElement('section', null, children),
      }),
    );
    const rendered = compile(
      '<BodyPassthrough>\n<form action="/x"><label>Name</label></form>\n</BodyPassthrough>',
    );

    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.html).toContain(
      '<form action="/x"><label><span>Name</span></label></form>',
    );
  });

  test('rejects elements that turn a component body into code', () => {
    registerComponent(
      definition({
        name: 'BodyScript',
        body: 'htmdx',
        Component: ({ children }: { children?: ReactNode }) =>
          createElement('section', null, children),
      }),
    );
    const rendered = compile('<BodyScript>\n<script>alert(1)</script>\n</BodyScript>');

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('<script> is not allowed');
  });

  test.each(['<script>alert(1)</script>', 'Use <mytag> here', 'A < B and C > D'])(
    'keeps non-allowlisted markup literal: %j',
    (source) => {
      const rendered = compile(source);

      expect(rendered.ok).toBe(true);
      expect(rendered.ok && rendered.html).toContain('&lt;');
    },
  );

  test('keeps HTML inside code fences and spans literal', () => {
    const rendered = compile('```html\n<p>hi</p>\n```\n\nInline `<video controls>` stays text.');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('pre')?.textContent).toBe('<p>hi</p>');
    expect(container.querySelector('p')?.innerHTML).toContain(
      '<code>&lt;video controls&gt;</code>',
    );
    expect(container.querySelector('pre > code')?.className).toBe('language-html');
  });

  test('renders inline HTML inside list items and headings', () => {
    const rendered = compile('## Watch <em>this</em>\n\n- item <br> two\n- <a href="#x">link</a>');

    expect(rendered.ok && rendered.html).toContain('<em>this</em>');
    expect(rendered.ok && rendered.html).toContain('<br>');
    expect(rendered.ok && rendered.html).toContain('<a href="#x">link</a>');
  });

  // A bare attribute forces the HTML fallback parse, which uppercases tag names
  // and drops the stray `<td>`, so parsed elements stop lining up with source
  // tags. The allowlist has to decide before casing does.
  test('renders allowlisted elements when the source pairing cannot be recovered', () => {
    const rendered = compile(
      '<div>\n<video controls>\n<td>cell</td>\n<p>after</p>\n</video>\n</div>',
    );

    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.html).toContain('<p>after</p>');
  });

  test('still reports unknown capitalized tags as missing components', () => {
    const rendered = compile('<NotRegistered />');

    expect(rendered.ok).toBe(false);
    expect(!rendered.ok && rendered.error).toContain('unknown component <NotRegistered>');
  });

  test('renders components nested in inline HTML', () => {
    registerComponent(
      definition({
        name: 'InlineHtmlChild',
        body: 'htmdx',
        Component: ({ children }: { children?: ReactNode }) =>
          createElement('mark', null, children),
      }),
    );
    const rendered = compile('Wrapped <span><InlineHtmlChild>hi</InlineHtmlChild></span> here.');

    expect(rendered.ok && rendered.html).toContain('<span><mark>hi</mark></span>');
  });

  test('does not report literal markup inside a raw HTML block', () => {
    expect(validate('<div>\n<script>alert(1)</script>\n</div>\n')).toEqual([]);
  });

  // A raw HTML block only fails while it renders, so validate() needs a probe
  // for it the same way it has one per component block.
  test('reports event handler attributes inside a raw HTML block', () => {
    const diagnostics = validate('<div onclick="go()">Click</div>\n');

    expect(diagnostics.map(({ code }) => code)).toEqual(['event-handler-attribute']);
  });

  test('accepts allowlisted raw HTML', () => {
    expect(validate('Read <a href="/guide">the guide</a>.\n')).toEqual([]);
  });

  test('snapshots raw HTML as the elements it was written as', () => {
    expect(snapshot('<div class="grid">\n\n<a href="/guide">Guide</a>\n\n</div>\n')).toBe(
      ['<div class="grid">', '  <a href="/guide">', '    text "Guide"'].join('\n'),
    );
  });
});
