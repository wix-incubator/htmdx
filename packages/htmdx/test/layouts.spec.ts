import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { compile, register, registerLayout, rerender, type HtmdxLayoutProps } from '../src';
import { compileDocument } from '../src/react';

const layoutFixtureComponent = ({ children, slots }: HtmdxLayoutProps) =>
  createElement('main', { 'data-browser-slot': slots.label }, children);

describe('document layouts', () => {
  test('explicit default produces the same artifact as the implicit default', () => {
    const source = '# Existing artifact\n\n## First\n\nOne.\n\n## Second\n\nTwo.';

    expect(compile(source, { layout: 'default' })).toEqual(compile(source));
  });

  test('blank preserves source order without document chrome or section grouping', () => {
    const rendered = compile(`---
layout: blank
---

# Checkout migration

Opening context.

## Decision

Ship it.`);

    expect(rendered.ok).toBe(true);
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('class="htmdx-app htmdx-app--blank"');
    expect(html).toContain('<h1>Checkout migration</h1>');
    expect(html.indexOf('Opening context.')).toBeLessThan(html.indexOf('Decision'));
    expect(html).not.toContain('htmdx-hero');
    expect(html).not.toContain('htmdx-sticky-header');
    expect(html).not.toContain('htmdx-toc');
    expect(html).not.toContain('htmdx-doc-section');
  });

  test('registered layouts receive only declared slots and source-order content', () => {
    registerLayout(
      {
        name: 'decision-fixture',
        slots: {
          eyebrow: { from: 'project' },
          byline: { from: 'owner' },
          status: { from: 'phase' },
        },
        Component: ({ children, slots }: HtmdxLayoutProps) =>
          createElement(
            'main',
            { 'data-layout': 'decision' },
            createElement(
              'output',
              { 'data-status': String(slots.status) },
              JSON.stringify({ keys: Object.keys(slots), ...slots }),
            ),
            children,
          ),
      },
      { rerender: false },
    );

    const rendered = compile(`---
layout: decision-fixture
project: Payments
owner: Dana
private-note: hidden
---

# Checkout migration`);

    expect(rendered.ok).toBe(true);
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('data-layout="decision"');
    expect(html).toContain(
      '{"keys":["eyebrow","byline","status"],"eyebrow":"Payments","byline":"Dana"}',
    );
    expect(html).toContain('data-status="undefined"');
    expect(html).not.toContain('private-note');
    expect(html).toContain('<h1>Checkout migration</h1>');
  });

  test('host layout options override frontmatter', () => {
    const blank = compile('---\nlayout: default\n---\n\n# Forced blank', { layout: 'blank' });
    const defaultLayout = compile('---\nlayout: blank\n---\n\n# Forced default', {
      layout: 'default',
    });

    expect(blank.ok && blank.html).toContain('htmdx-app--blank');
    expect(defaultLayout.ok && defaultLayout.html).toContain('htmdx-hero');
  });

  test('blank keeps the component catalog and theme behavior', () => {
    const rendered = compile(`---
layout: blank
theme: blue
---

<Button>Continue</Button>`);

    expect(rendered).toMatchObject({ ok: true, components: ['Button'] });
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('data-htmdx-theme="blue"');
    expect(html).toContain('data-slot="button"');
  });

  test('register layout options override frontmatter in browser rendering', async () => {
    const tagName = 'htmdx-layout-host-fixture';
    const host = document.createElement(tagName);
    host.innerHTML = `<script type="text/htmdx">---
layout: default
---

# Browser blank</script>`;
    document.body.append(host);

    const rendered = new Promise<void>((resolve) => {
      host.addEventListener('htmdx:rendered', () => resolve(), { once: true });
    });
    register({ tagName, layout: 'blank', automount: false });
    await rendered;

    expect(host.querySelector('.htmdx-app--blank')).not.toBeNull();
    expect(host.querySelector('.htmdx-hero')).toBeNull();

    await rerender({ tagName });

    expect(host.querySelector('.htmdx-app--blank')).not.toBeNull();
    expect(host.querySelector('.htmdx-hero')).toBeNull();
    host.remove();
  });

  test('registered layouts render from frontmatter in browser hosts', async () => {
    const layoutName = 'browser-decision-fixture';
    registerLayout(
      {
        name: layoutName,
        slots: { eyebrow: { from: 'project' } },
        Component: ({ children, slots }: HtmdxLayoutProps) =>
          createElement('main', { 'data-eyebrow': slots.eyebrow }, children),
      },
      { rerender: false },
    );

    const tagName = 'htmdx-custom-layout-host-fixture';
    const host = document.createElement(tagName);
    host.innerHTML = `<script type="text/htmdx">---
layout: ${layoutName}
project: Payments
---

# Browser custom</script>`;
    document.body.append(host);

    const rendered = new Promise<void>((resolve) => {
      host.addEventListener('htmdx:rendered', () => resolve(), { once: true });
    });
    register({ tagName, automount: false });
    await rendered;

    expect(host.querySelector('[data-htmdx-layout="browser-decision-fixture"]')).not.toBeNull();
    expect(host.querySelector('[data-eyebrow="Payments"]')?.textContent).toContain(
      'Browser custom',
    );
    host.remove();
  });

  test('unknown layouts fail clearly', () => {
    expect(compile('---\nlayout: missing-fixture\n---\n\n# Missing')).toEqual({
      ok: false,
      error: 'unknown layout "missing-fixture"',
    });
  });

  test('registered layouts render through the browser and React document entrypoint', async () => {
    registerLayout(
      {
        name: 'browser-react-fixture',
        slots: { label: { from: 'project' } },
        Component: layoutFixtureComponent,
      },
      { rerender: false },
    );

    const source = `---
layout: browser-react-fixture
project: Atlas
---

# Shared layout`;
    const reactHtml = renderToStaticMarkup(compileDocument(source).element);
    expect(reactHtml).toContain('data-browser-slot="Atlas"');

    const tagName = 'htmdx-custom-layout-fixture';
    const host = document.createElement(tagName);
    host.innerHTML = `<script type="text/htmdx">${source}</script>`;
    document.body.append(host);
    const rendered = new Promise<void>((resolve) => {
      host.addEventListener('htmdx:rendered', () => resolve(), { once: true });
    });
    register({ tagName, automount: false });
    await rendered;

    expect(host.querySelector('[data-browser-slot="Atlas"]')).not.toBeNull();
    host.remove();
  });

  test('layout names cannot collide case-insensitively or with built-ins', () => {
    registerLayout({ name: 'CaseFixture', Component: layoutFixtureComponent }, { rerender: false });

    expect(() =>
      registerLayout(
        { name: 'casefixture', Component: layoutFixtureComponent },
        { rerender: false },
      ),
    ).toThrow('layout name "casefixture" is already registered');
    expect(() =>
      registerLayout({ name: 'Blank', Component: layoutFixtureComponent }, { rerender: false }),
    ).toThrow('layout name "Blank" collides with built-in layout "blank"');
  });
});
