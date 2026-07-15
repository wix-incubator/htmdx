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
    expect(rendered.ok && rendered.html).toContain('<article class="htmdx-article">');
    expect(rendered.ok && rendered.html).toContain('Ship <strong>one HTML file</strong>');
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

  test('auto-mounts bare source scripts into generated hosts by default', async () => {
    document.body.innerHTML = `<script type="text/htmdx">
# Bare source

Rendered without an authored host.
</script>`;

    register({ tagName: 'htmdx-automount' });

    await Promise.resolve();
    await Promise.resolve();

    const host = document.querySelector('htmdx-automount');
    expect(host).not.toBeNull();
    expect(document.body.querySelector(':scope > script[type="text/htmdx"]')).toBeNull();
    expect(host?.innerHTML).toContain('Rendered without an authored host.');
  });

  test('copies src from a bare source script to the generated host', () => {
    document.body.innerHTML = '<script type="text/htmdx" src="./artifact.mdx"></script>';

    register({ tagName: 'htmdx-automount-src' });

    expect(document.querySelector('htmdx-automount-src')?.getAttribute('src')).toBe(
      './artifact.mdx',
    );
  });

  test('leaves sources inside registered hosts alone when auto-mounting', () => {
    register({ tagName: 'htmdx-automount-wrapped' });
    document.body.innerHTML = `<htmdx-automount-wrapped><script type="text/htmdx"># Wrapped</script></htmdx-automount-wrapped>`;

    register({ tagName: 'htmdx-automount-wrapped' });

    expect(document.querySelectorAll('htmdx-automount-wrapped').length).toBe(1);
  });

  test('skips auto-mounting when automount is disabled', () => {
    document.body.innerHTML = '<script type="text/htmdx"># Manual</script>';

    register({ tagName: 'htmdx-automount-off', automount: false });

    expect(document.querySelector('htmdx-automount-off')).toBeNull();
    expect(document.body.querySelector(':scope > script[type="text/htmdx"]')).not.toBeNull();
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
      '.htmdx-toc-link[data-htmdx-target="situation"]',
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
});
