import { act, createElement, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { HtmdxComponent } from '../src/component-definition';
import { compileToReact, Htmdx } from '../src/react';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const definition = (
  name: string,
  Component: HtmdxComponent['Component'],
  props?: HtmdxComponent['props'],
): HtmdxComponent => ({
  name,
  purpose: `Test ${name}.`,
  example: `<${name} />`,
  body: name === 'Counter' || name === 'CaseProbe' ? 'none' : 'htmdx',
  ...(props ? { props } : {}),
  Component,
});

const definitions: HtmdxComponent[] = [
  definition('CardFixture', ({ children }: { children?: ReactNode }) =>
    createElement('section', null, children),
  ),
  definition('LabelFixture', ({ children }: { children?: ReactNode }) =>
    createElement('mark', null, children),
  ),
  definition(
    'Counter',
    ({ start }: { start?: number }) => {
      const [count, setCount] = useState(start ?? 0);
      return createElement(
        'button',
        { type: 'button', onClick: () => setCount((current) => current + 1) },
        `count:${count}`,
      );
    },
    [{ name: 'start', type: 'number' }],
  ),
  definition(
    'CaseProbe',
    ({ defaultValue }: { defaultValue?: string }) =>
      createElement('output', null, `got:${defaultValue}`),
    [{ name: 'defaultValue', type: 'string' }],
  ),
];

describe('React renderer definition boundary', () => {
  test('interleaves Markdown with definition-backed components', () => {
    const html = renderToStaticMarkup(
      compileToReact('## Decision\n\nSome **bold** text.\n\n<LabelFixture>shipped</LabelFixture>', {
        definitions,
      }),
    );

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<mark>shipped</mark>');
    expect(html.indexOf('shipped')).toBeGreaterThan(html.indexOf('Decision'));
  });

  test('handles nested same-name tags and self-closing typed props', () => {
    const nested = renderToStaticMarkup(
      compileToReact('<CardFixture>outer<CardFixture>inner</CardFixture></CardFixture>', {
        definitions,
      }),
    );
    expect(nested).toContain('outer');
    expect(nested).toContain('inner');

    const counter = renderToStaticMarkup(compileToReact('<Counter start="5" />', { definitions }));
    expect(counter).toContain('count:5');
  });

  test('mounts live React state', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);

    act(() => root.render(createElement(Htmdx, { source: '<Counter start="5" />', definitions })));
    expect(host.textContent).toContain('count:5');

    act(() => {
      host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('count:6');

    act(() => root.unmount());
    host.remove();
  });

  test('keeps component syntax in code fences inert and rejects unclosed tags', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        '```html\n<CardFixture>sample</CardFixture>\n```\n\n<LabelFixture>real</LabelFixture>',
        {
          definitions,
        },
      ),
    );
    expect(html).toContain('&lt;CardFixture&gt;sample&lt;/CardFixture&gt;');
    expect(html).toContain('<mark>real</mark>');
    expect(() => compileToReact('<CardFixture>never closed', { definitions })).toThrow(
      'unclosed component <CardFixture>',
    );
  });

  test('preserves camelCase attributes in nested definition tags', () => {
    const html = renderToStaticMarkup(
      compileToReact('<CardFixture><CaseProbe defaultValue="alpha" /></CardFixture>', {
        definitions,
      }),
    );
    expect(html).toContain('got:alpha');
  });

  test('sanitizes HTML images nested in component bodies', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        '<CardFixture><img src="screenshots/result.png" alt="1 > 0" onerror="alert(1)"></CardFixture>',
        { definitions },
      ),
    );

    expect(html).toContain(
      '<img src="screenshots/result.png" alt="1 &gt; 0" class="htmdx-image"/>',
    );
    expect(html).not.toContain('onerror');
  });
});
