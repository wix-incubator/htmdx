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
    expect(rendered.ok && rendered.html).toContain('<article class="htmdx-article">');
    expect(rendered.ok && rendered.html).toContain('Ship <strong>one HTML file</strong>');
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

    expect(rendered.ok && rendered.html).toContain('<header class="htmdx-masthead">');
    expect(rendered.ok && rendered.html).toContain('<div class="htmdx-shell">');
    expect(rendered.ok && rendered.html).toContain('class="htmdx-toc-link"');
    expect(rendered.ok && rendered.html).toContain('href="#executive-summary"');
    expect(rendered.ok && rendered.html).toContain('<h2 id="situation">Situation</h2>');
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

  test('rejects unknown components', () => {
    expect(() => tokenizeBlocks('<Nope>content</Nope>')).toThrow('unknown component <Nope>');
  });

  test('rejects raw nested HTML inside component bodies', () => {
    expect(() =>
      tokenizeBlocks(`<Card>
<div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">Test</div>
</Card>`),
    ).toThrow('nested JSX inside <Card> is not supported in htmdx@1');
  });

  test('strips unsafe link schemes', () => {
    const rendered = compile('[bad](javascript:alert(1)) [good](https://wix.com)');

    expect(rendered.ok && rendered.html).toContain('bad');
    expect(rendered.ok && rendered.html).not.toContain('javascript:');
    expect(rendered.ok && rendered.html).toContain('<a href="https://wix.com">good</a>');
  });
});
