import { describe, expect, test, vi } from 'vitest';
import {
  DEFAULT_TAG_NAME,
  DEFAULT_TAILWIND_BROWSER_SRC,
  canonicalComponentName,
  compile,
  register,
  registerComponent,
  registerComponents,
  registerTheme,
  renderHost,
  tokenizeBlocks,
} from '../src';

describe('htmdx', () => {
  test('renders markdown and artifact components', () => {
    const rendered = compile(`# Title

## Decision

<ExecutiveSummary>
Ship **one HTML file** with editable HTMDX source.
</ExecutiveSummary>

<MetricStrip>
- Format: **HTML**
- Source: **HTMDX**
</MetricStrip>`);

    expect(rendered).toMatchObject({
      ok: true,
      components: ['ExecutiveSummary', 'MetricStrip'],
    });
    // Only one `##` heading here, so the nav is omitted and the shell gets
    // the `htmdx-app--no-nav` modifier (see the interface contract in the
    // task brief) — match tolerates that modifier suffix.
    expect(rendered.ok && rendered.html).toMatch(/<div class="htmdx-app( htmdx-app--no-nav)?">/);
    expect(rendered.ok && rendered.html).toContain('<div class="htmdx-doc-section-card">');
    expect(rendered.ok && rendered.html).toContain('Ship <strong>one HTML file</strong>');
  });

  test('frontmatter theme stamps data-htmdx-theme on the app root', () => {
    const rendered = compile(`---
theme: blue
---

# Title

## One

Body.`);
    expect(rendered.ok && rendered.html).toContain('data-htmdx-theme="blue"');
  });

  test('absent or unknown theme adds no attribute (purple default)', () => {
    const none = compile(`# Title\n\n## One\n\nBody.`);
    expect(none.ok && none.html).not.toContain('data-htmdx-theme');

    const unknown = compile(`---\ntheme: chartreuse\n---\n\n# Title\n\n## One\n\nBody.`);
    expect(unknown.ok && unknown.html).not.toContain('data-htmdx-theme');

    const purple = compile(`---\ntheme: purple\n---\n\n# Title\n\n## One\n\nBody.`);
    expect(purple.ok && purple.html).not.toContain('data-htmdx-theme');
  });

  test('theme matching is case-insensitive', () => {
    const upper = compile(`---\ntheme: Blue\n---\n\n# T\n\n## One\n\nBody.`);
    expect(upper.ok && upper.html).toContain('data-htmdx-theme="blue"');
    const purpleCap = compile(`---\ntheme: Purple\n---\n\n# T\n\n## One\n\nBody.`);
    expect(purpleCap.ok && purpleCap.html).not.toContain('data-htmdx-theme');
  });

  test('keeps every built-in component available', () => {
    const components = [
      ['ExecutiveSummary', 'Summary.'],
      ['Card', 'Card body.'],
      ['Callout', 'Callout body.'],
      ['SourceQuote', 'Quoted body.'],
      ['MetricStrip', '- Metric: 1'],
      ['Stat', '- Metric: 1'],
      ['ChartBar', '- Metric: 1'],
      ['ChartArea', '- Metric: 1'],
      ['ChartLine', '- Metric: 1'],
      ['ChartPie', '- Metric: 1'],
      ['DataTable', '| Metric | Value |\n| --- | --- |\n| Users | 1 |'],
      ['Compare', '- Option: A'],
      ['Finding', '- Finding: A'],
      ['Evidence', '- Evidence: A'],
      ['RiskTable', '- **Must-have:** A'],
      ['DecisionTable', '- Decision: A'],
      ['Timeline', '- Today: A'],
    ];
    const source = components.map(([name, body]) => `<${name}>\n${body}\n</${name}>`).join('\n\n');

    const rendered = compile(source);

    expect(rendered).toMatchObject({
      ok: true,
      components: components.map(([name]) => name),
    });
  });

  test('renders the C Memo shell with masthead and section rail', () => {
    const rendered = compile(`---
title: "Competitor Research"
---

# Hidden body title

## Executive Summary

Summary.

## Situation

Context.`);

    expect(rendered.ok && rendered.html).toContain('<nav class="htmdx-nav"');
    expect(rendered.ok && rendered.html).toContain('class="htmdx-nav-link"');
    expect(rendered.ok && rendered.html).toContain('href="#executive-summary"');
    expect(rendered.ok && rendered.html).toContain(
      '<h2 class="htmdx-doc-section-title" id="situation">Situation</h2>',
    );
  });

  test('puts the title and lead paragraph in the hero, sections in cards', () => {
    const rendered = compile(
      '# My Page\n\nLead paragraph here.\n\n## First\n\nBody one.\n\n## Second\n\nBody two.',
    );
    expect(rendered.ok).toBe(true);
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('<h1 class="htmdx-hero-title">My Page</h1>');
    expect(html).toContain('<p class="htmdx-hero-desc">Lead paragraph here.</p>');
    // two sections, each wrapped in a card, lead not duplicated inside a card
    expect(html.match(/htmdx-doc-section-card/g)?.length).toBe(2);
    expect(html.indexOf('Lead paragraph here.')).toBe(html.lastIndexOf('Lead paragraph here.'));
  });

  test('renders the hero eyebrow and label pills', () => {
    const rendered = compile('# My Page\n\nLead.\n\n## First\n\nBody.');
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('<div class="htmdx-hero-inner">');
    expect(html).toContain('<p class="htmdx-hero-eyebrow">{Project Name}</p>');
    expect(html).toContain('<div class="htmdx-hero-labels">');
    expect(html).toContain('Owner <b>{name}</b>');
    expect(html).toContain('Phase <b>{Flow / Skill}</b>');
    expect(html).toContain('Updated <b>{Date}</b>');
  });

  test('builds left-nav pill links from the sections', () => {
    const rendered = compile('# T\n\n## Alpha\n\nA.\n\n## Beta\n\nB.');
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain(
      '<a class="htmdx-nav-link" href="#alpha" data-htmdx-target="alpha">Alpha</a>',
    );
    expect(html).toContain('data-htmdx-target="beta"');
  });

  test('frontmatter logo renders a nav logo image', () => {
    const rendered = compile(
      '---\nlogo: ./brand.svg\nlogo-alt: Brand\n---\n\n# T\n\n## Alpha\n\nA.\n\n## Beta\n\nB.',
    );
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('<img class="htmdx-nav-logo" src="./brand.svg" alt="Brand">');
  });

  test('named logo frontmatter resolves to the bundled data URI', () => {
    const rendered = compile(
      '---\nlogo: creator-kit\n---\n\n# T\n\n## Alpha\n\nA.\n\n## Beta\n\nB.',
    );
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('<img class="htmdx-nav-logo" src="data:image/svg+xml;base64,');
  });

  test('no logo frontmatter renders no nav logo', () => {
    const rendered = compile('# T\n\n## Alpha\n\nA.\n\n## Beta\n\nB.');
    expect(rendered.ok && rendered.html).not.toContain('htmdx-nav-logo');
  });

  test('escapes logo frontmatter values', () => {
    const rendered = compile(
      '---\nlogo: x.svg" onerror="alert(1)\n---\n\n# T\n\n## Alpha\n\nA.\n\n## Beta\n\nB.',
    );
    const html = rendered.ok ? rendered.html : '';
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain('src="x.svg&quot; onerror=&quot;alert(1)"');
  });

  test('keeps component names case-insensitive', () => {
    expect(canonicalComponentName('executivesummary')).toBe('ExecutiveSummary');
  });

  test('renders explicitly registered consumer components', () => {
    const rendered = compile(
      `<ProductCard>
**Launch plan**: Invite beta users first.
</ProductCard>`,
      {
        components: {
          ProductCard: ({ body, markdown }) =>
            `<aside class="product-card">${markdown(body)}</aside>`,
        },
      },
    );

    expect(rendered).toMatchObject({
      ok: true,
      components: ['ProductCard'],
    });
    expect(rendered.ok && rendered.html).toContain('<aside class="product-card">');
    expect(rendered.ok && rendered.html).toContain(
      '<strong>Launch plan</strong>: Invite beta users first.',
    );
  });

  test('renders globally registered consumer components', () => {
    registerComponent(
      'LaunchPlan',
      ({ body, markdown }) => `<aside class="launch-plan">${markdown(body)}</aside>`,
      { rerender: false },
    );

    const rendered = compile(`<LaunchPlan>
**Beta** first.
</LaunchPlan>`);

    expect(rendered).toMatchObject({
      ok: true,
      components: ['LaunchPlan'],
    });
    expect(rendered.ok && rendered.html).toContain('<aside class="launch-plan">');
  });

  test('registers multiple consumer components', () => {
    registerComponents(
      {
        ProductCard: ({ body, markdown }) =>
          `<aside class="product-card">${markdown(body)}</aside>`,
        ProductBadge: ({ body, inline }) => `<span class="product-badge">${inline(body)}</span>`,
      },
      { rerender: false },
    );

    const rendered = compile(`<ProductCard>
Card body.
</ProductCard>

<ProductBadge>Preview</ProductBadge>`);

    expect(rendered).toMatchObject({
      ok: true,
      components: ['ProductCard', 'ProductBadge'],
    });
    expect(rendered.ok && rendered.html).toContain('class="product-card"');
    expect(rendered.ok && rendered.html).toContain('class="product-badge"');
  });

  test('rejects invalid consumer component names', () => {
    expect(() => {
      registerComponent('bad-name', ({ body }) => body, { rerender: false });
    }).toThrow('invalid component name "bad-name"');
  });

  test('keeps consumer component names case-insensitive', () => {
    expect(
      canonicalComponentName('productcard', {
        components: {
          ProductCard: ({ body, markdown }) => markdown(body),
        },
      }),
    ).toBe('ProductCard');
  });

  test('loads Tailwind when the browser entry is included', async () => {
    document.getElementById('htmdx-tailwind-browser')?.remove();
    vi.resetModules();

    await import('../src/browser');

    const script = document.getElementById('htmdx-tailwind-browser');
    expect(window.Htmdx).toBeDefined();
    expect(customElements.get(DEFAULT_TAG_NAME)).toBeDefined();
    expect(script).toBeInstanceOf(HTMLScriptElement);
    expect(script?.getAttribute('src')).toBe(DEFAULT_TAILWIND_BROWSER_SRC);
  });

  test('registers htmdx-code by default', () => {
    register();

    expect(customElements.get(DEFAULT_TAG_NAME)).toBeDefined();
  });

  test('loads Tailwind browser support by default', () => {
    document.getElementById('htmdx-tailwind-browser')?.remove();
    register({ tagName: 'htmdx-tailwind-default' });

    const script = document.getElementById('htmdx-tailwind-browser');
    expect(script).toBeInstanceOf(HTMLScriptElement);
    expect(script?.getAttribute('src')).toBe(DEFAULT_TAILWIND_BROWSER_SRC);
  });

  test('allows hosts to disable Tailwind browser support', () => {
    document.getElementById('htmdx-tailwind-browser')?.remove();
    register({ tagName: 'htmdx-tailwind-off', tailwind: false });

    expect(document.getElementById('htmdx-tailwind-browser')).toBeNull();
  });

  test('allows hosts to provide a Tailwind browser mirror', () => {
    document.getElementById('htmdx-tailwind-browser')?.remove();
    register({ tagName: 'htmdx-tailwind-mirror', tailwind: { src: './tailwind-browser.js' } });

    expect(document.getElementById('htmdx-tailwind-browser')?.getAttribute('src')).toBe(
      './tailwind-browser.js',
    );
  });

  test('registers trusted theme CSS from host code', () => {
    registerTheme({
      id: 'brand',
      css: 'htmdx-themed { --htmdx-accent: #0057ff; }',
    });
    register({ tagName: 'htmdx-themed' });

    expect(customElements.get('htmdx-themed')).toBeDefined();
    expect(document.getElementById('htmdx-theme-brand')?.textContent).toContain('--htmdx-accent');
  });

  test('rerenders existing hosts after a consumer component script loads', async () => {
    register({ tagName: 'htmdx-late-extension' });
    document.body.innerHTML = `<htmdx-late-extension>
      <template type="text/htmdx">
<LateCard>
Loaded after runtime.
</LateCard>
      </template>
    </htmdx-late-extension>`;

    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('htmdx-late-extension')?.innerHTML).toContain(
      'unknown component',
    );

    await registerComponent('LateCard', ({ body, markdown }) => `<aside>${markdown(body)}</aside>`);

    expect(document.querySelector('htmdx-late-extension')?.innerHTML).toContain(
      'Loaded after runtime.',
    );
    expect(document.querySelector('htmdx-late-extension')?.innerHTML).not.toContain(
      'unknown component',
    );
  });

  test('scrolls TOC targets explicitly instead of relying on hash nav', async () => {
    const scrollIntoView = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    const host = document.createElement('div');
    host.innerHTML = `<script type="text/htmdx">---
title: "Nav"
---

## Executive Summary

Summary.

## Situation

Context.</script>`;
    document.body.append(host);

    await renderHost(host);

    const link = host.querySelector<HTMLAnchorElement>(
      '.htmdx-nav-link[data-htmdx-target="situation"]',
    );
    expect(link).not.toBeNull();

    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    link?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    HTMLElement.prototype.scrollIntoView = original;
    host.remove();
  });

  test('rejects unknown components', () => {
    expect(() => tokenizeBlocks('<Nope>content</Nope>')).toThrow('unknown component <Nope>');
  });

  test('rejects raw nested HTML inside component bodies', () => {
    expect(() =>
      tokenizeBlocks(`<Card>
<div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">Test</div>
</Card>`),
    ).toThrow(
      'Invalid body for <Card> at body line 1, column 1: nested JSX is not allowed; expected one-level HTMDX without nested JSX.',
    );
  });

  test('strips unsafe link schemes', () => {
    const rendered = compile('[bad](javascript:alert(1)) [good](https://wix.com)');

    expect(rendered.ok && rendered.html).toContain('bad');
    expect(rendered.ok && rendered.html).not.toContain('javascript:');
    expect(rendered.ok && rendered.html).toContain('<a href="https://wix.com">good</a>');
  });

  test('injects the Figtree + Roboto fonts stylesheet once on register', () => {
    register({ tailwind: false });
    register({ tailwind: false });
    const links = document.querySelectorAll('link#htmdx-fonts');
    expect(links.length).toBe(1);
    const href = links[0].getAttribute('href') ?? '';
    expect(href).toContain('Figtree');
    expect(href).toContain('Roboto');
  });

  test('bar chart tags each bar with a cycling data-series index', () => {
    const rendered = compile('<ChartBar>\n- A: 1\n- B: 2\n- C: 3\n</ChartBar>');
    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('data-series="0"');
    expect(html).toContain('data-series="1"');
    expect(html).toContain('data-series="2"');
  });

  test('does not hoist a paragraph out of a component preceding the first section', () => {
    const rendered = compile(
      '# Report\n\n<Callout>\nCallout body paragraph.\n</Callout>\n\n## First\n\nBody.',
    );
    expect(rendered.ok).toBe(true);
    const html = rendered.ok ? rendered.html : '';
    expect(html).not.toContain('htmdx-hero-desc');
    expect(html).toContain('Callout body paragraph.');
    expect(html).not.toContain('<div class="htmdx-component-body"></div>');
  });

  test('nav-active colors are tokenized, not hard-coded literals', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    // Vite rewrites `new URL('…', import.meta.url)` into an asset URL, so read
    // via a path derived from import.meta.url instead.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../src/index.ts'),
      'utf8',
    );
    expect(src).toContain('--md-sys-color-nav-active-container: #DCDAF7;');
    expect(src).toContain('--md-sys-color-on-nav-active-container: #24172C;');
    // The nav rule must reference the tokens, not the raw hex.
    const navRule = src.slice(
      src.indexOf('.htmdx-nav-item.is-active .htmdx-nav-link'),
      src.indexOf('.htmdx-nav-item.is-active .htmdx-nav-link') + 200,
    );
    expect(navRule).toContain('var(--md-sys-color-nav-active-container)');
    expect(navRule).toContain('var(--md-sys-color-on-nav-active-container)');
    expect(navRule).not.toMatch(/#DCDAF7|#24172C/);
  });
});
