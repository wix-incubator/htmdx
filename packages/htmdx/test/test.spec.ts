import { createElement, type ReactNode } from 'react';
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

    expect(rendered.ok && rendered.html).toContain('<header class="htmdx-hero">');
    expect(rendered.ok && rendered.html).toContain('<div class="htmdx-shell">');
    expect(rendered.ok && rendered.html).toContain('class="htmdx-toc-link"');
    expect(rendered.ok && rendered.html).toContain('href="#executive-summary"');
    expect(rendered.ok && rendered.html).toContain('<h2 id="situation">Situation</h2>');
    expect(rendered.ok && rendered.html).toMatch(
      /<h2 id="situation">Situation<\/h2><div class="htmdx-doc-section-card">/,
    );
  });

  test('renders frontmatter fields in the hero labels', () => {
    const rendered = compile(`---
title: "Rollout Memo"
project: Atlas
owner: Dana
phase: Discovery
updated: 2026-07-01
---

## First

One.

## Second

Two.`);

    expect(rendered.ok && rendered.html).toContain('<p class="htmdx-hero-eyebrow">Atlas</p>');
    expect(rendered.ok && rendered.html).toContain('Owner <b>Dana</b>');
    expect(rendered.ok && rendered.html).toContain('Phase <b>Discovery</b>');
    expect(rendered.ok && rendered.html).toContain('Updated <b>2026-07-01</b>');
  });

  test('falls back to hero placeholders when frontmatter fields are missing', () => {
    const rendered = compile(`# Bare Title

## First

One.`);

    expect(rendered.ok && rendered.html).toContain('{Project Name}');
    expect(rendered.ok && rendered.html).toContain('Owner <b>{name}</b>');
    expect(rendered.ok && rendered.html).toContain('Phase <b>{Flow / Skill}</b>');
    expect(rendered.ok && rendered.html).toContain('Updated <b>{Date}</b>');
  });

  test('moves the lead paragraph into the hero description', () => {
    const rendered = compile(`# Lead Memo

This memo sets the **stage**.

## First

Body.`);

    expect(rendered.ok && rendered.html).toContain(
      '<p class="htmdx-hero-desc">This memo sets the <strong>stage</strong>.</p>',
    );
    const html = rendered.ok ? rendered.html : '';
    expect(html.split('This memo sets the').length).toBe(2);
  });

  test('renders component blocks inside their section card', () => {
    const rendered = compile(`# Component Memo

## Decision

<ExecutiveSummary>
Ship it.
</ExecutiveSummary>`);

    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';
    expect(
      container.querySelector('.htmdx-doc-section-card .htmdx-executive-summary'),
    ).not.toBeNull();
  });

  test('renders no hero or sticky header without a title', () => {
    const rendered = compile('Just a paragraph without any heading.');

    expect(rendered.ok && rendered.html).not.toContain('htmdx-hero');
    expect(rendered.ok && rendered.html).not.toContain('htmdx-sticky-header');
    expect(rendered.ok && rendered.html).toContain('Just a paragraph without any heading.');
  });

  test('renders the sticky header with the title and aria-hidden', () => {
    const rendered = compile(`---
title: "Sticky Memo"
project: Atlas
---

## First

One.`);

    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('<div class="htmdx-sticky-header" aria-hidden="true">');
    expect(html).toContain('<span class="htmdx-sticky-title">Sticky Memo</span>');
    expect(html).toContain('<span class="htmdx-sticky-project">Atlas</span>');
  });

  test('parses CRLF frontmatter', () => {
    const rendered = compile(
      '---\r\ntitle: "Windows Memo"\r\nproject: Atlas\r\n---\r\n\r\n## First\r\n\r\nOne.',
    );

    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('Windows Memo');
    expect(html).toContain('<p class="htmdx-hero-eyebrow">Atlas</p>');
  });

  test('navigates headings whose slugs start with a digit', async () => {
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const host = document.createElement('div');
    host.innerHTML = `<script type="text/htmdx"># Numbered

## 1. Overview

One.

## 2. Detail

Two.</script>`;
    document.body.append(host);

    await renderHost(host);

    expect(host.querySelector('.htmdx-error')).toBeNull();
    const link = host.querySelector<HTMLAnchorElement>(
      '.htmdx-toc-link[data-htmdx-target="1-overview"]',
    );
    link?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(
      host.querySelector<HTMLAnchorElement>('.htmdx-toc-item.is-active a')?.dataset.htmdxTarget,
    ).toBe('1-overview');
    HTMLElement.prototype.scrollIntoView = original;
    host.remove();
  });

  test('frontmatter logo renders a nav logo image', () => {
    const rendered = compile(
      '---\nlogo: ./brand.svg\nlogo-alt: Brand\n---\n\n# T\n\n## Alpha\n\nA.\n\n## Beta\n\nB.',
    );

    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('class="htmdx-nav-logo"');
    expect(html).toContain('src="./brand.svg"');
    expect(html).toContain('alt="Brand"');
  });

  test('named logo frontmatter resolves to the bundled data URI', () => {
    const rendered = compile(
      '---\nlogo: creator-kit\n---\n\n# T\n\n## Alpha\n\nA.\n\n## Beta\n\nB.',
    );

    expect(rendered.ok && rendered.html).toContain('src="data:image/svg+xml;base64,');
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
          ProductCard: (props: { children?: ReactNode }) =>
            createElement('aside', { className: 'product-card' }, props.children),
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
      (props: { children?: ReactNode }) =>
        createElement('aside', { className: 'launch-plan' }, props.children),
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
        ProductCard: (props: { children?: ReactNode }) =>
          createElement('aside', { className: 'product-card' }, props.children),
        ProductBadge: (props: { children?: ReactNode }) =>
          createElement('span', { className: 'product-badge' }, props.children),
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
      <script type="text/htmdx">
<LateCard>
Loaded after runtime.
</LateCard>
      </script>
    </htmdx-late-extension>`;

    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('htmdx-late-extension')?.innerHTML).toContain(
      'unknown component',
    );

    await registerComponent('LateCard', (props: { children?: ReactNode }) =>
      createElement('aside', null, props.children),
    );

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

  test('allows nested HTML inside composable component bodies', () => {
    const rendered = compile(`<Card>
<div class="rounded-lg border p-4">Test</div>
</Card>`);

    expect(rendered).toMatchObject({ ok: true, components: ['Card'] });
    expect(rendered.ok && rendered.html).toContain('class="rounded-lg border p-4"');
  });

  test('strips unsafe link schemes', () => {
    const rendered = compile('[bad](javascript:alert(1)) [good](https://wix.com)');

    expect(rendered.ok && rendered.html).toContain('bad');
    expect(rendered.ok && rendered.html).not.toContain('javascript:');
    expect(rendered.ok && rendered.html).toContain('<a href="https://wix.com">good</a>');
  });
});
