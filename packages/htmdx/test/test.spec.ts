import { act, createElement, type ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import {
  DEFAULT_TAG_NAME,
  DEFAULT_TAILWIND_BROWSER_SRC,
  canonicalComponentName,
  compile,
  register,
  registerComponent,
  registerTheme,
  renderHost,
  tokenizeBlocks,
} from '../src';
import { shadcnThemeCss } from '../src/components/shadcn/shared/theme';

const readPre = (rendered: ReturnType<typeof compile>) => {
  const container = document.createElement('div');
  container.innerHTML = rendered.ok ? rendered.html : '';
  return container.querySelector('pre')?.outerHTML ?? null;
};

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

    expect(rendered.ok && rendered.html).toContain('Atlas');
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

    expect(rendered.ok && rendered.html).toContain('This memo sets the <strong>stage</strong>.');
    const html = rendered.ok ? rendered.html : '';
    expect(html.split('This memo sets the').length).toBe(2);
  });

  test('parses CRLF frontmatter', () => {
    const rendered = compile(
      '---\r\ntitle: "Windows Memo"\r\nproject: Atlas\r\n---\r\n\r\n## First\r\n\r\nOne.',
    );

    const html = rendered.ok ? rendered.html : '';
    expect(html).toContain('Windows Memo');
    expect(html).toContain('Atlas');
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

    // The tag is unknown until the component registers, so the page degrades
    // rather than disappearing behind a full-page error.
    expect(document.querySelector('htmdx-late-extension .htmdx-degraded')?.textContent).toContain(
      '1 block on this page didn’t render',
    );

    await registerComponent({
      name: 'LateCard',
      purpose: 'Show content registered after the runtime starts.',
      example: '<LateCard>Late content.</LateCard>',
      body: 'htmdx',
      Component: (props: { children?: ReactNode }) => createElement('aside', null, props.children),
    });

    expect(document.querySelector('htmdx-late-extension')?.innerHTML).toContain(
      'Loaded after runtime.',
    );
    expect(document.querySelector('htmdx-late-extension .htmdx-degraded')).toBeNull();
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
    const rendered = compile('<Card><div>Nested HTML</div></Card>');

    expect(rendered).toMatchObject({ ok: true, components: ['Card'] });
    expect(rendered.ok && rendered.html).toContain('Nested HTML');
  });

  test('strips unsafe link schemes', () => {
    const rendered = compile('[bad](javascript:alert(1)) [good](https://wix.com)');

    expect(rendered.ok && rendered.html).toContain('bad');
    expect(rendered.ok && rendered.html).not.toContain('javascript:');
    expect(rendered.ok && rendered.html).toContain('<a href="https://wix.com">good</a>');
  });

  test('renders Markdown images with safe attributes', () => {
    const rendered = compile('![A "quoted" < B](screenshots/result.png "Full result")');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';
    const image = container.querySelector('img.htmdx-image');

    expect(image?.getAttribute('src')).toBe('screenshots/result.png');
    expect(image?.getAttribute('alt')).toBe('A "quoted" < B');
    expect(image?.getAttribute('title')).toBe('Full result');
  });

  test('renders allowlisted HTML image attributes and drops event handlers', () => {
    const rendered = compile(
      '<IMG SRC="screenshots/result.png" ALT="Screenshot" WIDTH="640" LOADING="lazy" ONERROR="alert(1)">',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';
    const image = container.querySelector('img.htmdx-image');

    expect(image?.getAttribute('src')).toBe('screenshots/result.png');
    expect(image?.getAttribute('width')).toBe('640');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.hasAttribute('onerror')).toBe(false);
  });

  test('accepts whitespace around top-level HTML image assignments', () => {
    const rendered = compile('<img src = "screenshots/result.png" alt = "Screenshot">');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('img')?.getAttribute('src')).toBe('screenshots/result.png');
  });

  test('decodes entities in top-level HTML image text attributes', () => {
    const rendered = compile(
      '<img src="screenshots/a&amp;b.png" alt="A &amp; B" title="T &quot; Q">',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';
    const image = container.querySelector('img');

    expect(image?.getAttribute('src')).toBe('screenshots/a&b.png');
    expect(image?.getAttribute('alt')).toBe('A & B');
    expect(image?.getAttribute('title')).toBe('T " Q');
  });

  test('rejects unsafe image sources and preserves safe data images', () => {
    const rendered = compile(`![Bad](javascript:alert(1))

<img src="data:text/html;base64,PHNjcmlwdD4=" alt="Unsafe HTML">

<img src="data:image/png;base64,iVBORw0KGgo=" alt="Embedded" onerror="alert(1)">`);
    const html = rendered.ok ? rendered.html : '';

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:text/html');
    expect(html).not.toContain('onerror');
    expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
  });

  test('supports balanced parentheses in Markdown image sources', () => {
    const rendered = compile('![Diagram](https://example.com/diagram_(final).png)');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/diagram_(final).png',
    );
    expect(container.textContent).toBe('');
  });

  test('keeps images literal inside code fences containing blank lines', () => {
    const rendered = compile(
      '```md\nFirst example line.\n\n![Screenshot](screenshots/result.png)\n```',
    );
    const html = rendered.ok ? rendered.html : '';

    expect(html).not.toContain('<img');
    expect(html).toContain('![Screenshot](screenshots/result.png)');
  });

  test('keeps fenced angle placeholders literal inside component bodies', () => {
    const rendered = compile(
      '<Card>\n<CardHeader><CardTitle>T</CardTitle></CardHeader>\n<CardContent>\n\n```md\nobjective: <observable outcome>\n```\n\n</CardContent>\n</Card>\n',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(rendered).toMatchObject({ ok: true });
    expect(container.querySelector('pre')?.textContent).toBe('objective: <observable outcome>');
  });

  test('does not turn comma-bearing fenced placeholders into attributes', () => {
    const rendered = compile(
      '<Card>\n<CardHeader><CardTitle>T</CardTitle></CardHeader>\n<CardContent>\n\n```md\nscope: <surfaces, workflows>\n```\n\n</CardContent>\n</Card>\n',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(rendered).toMatchObject({ ok: true });
    expect(container.querySelector('pre')?.textContent).toBe('scope: <surfaces, workflows>');
    expect(rendered.ok && rendered.html).not.toContain('=""');
  });

  test('compiles multi-line fenced placeholders inside htmdx bodies', () => {
    const rendered = compile(
      '<Tabs defaultValue="a">\n<TabsList>\n<TabsTrigger value="a">A</TabsTrigger>\n</TabsList>\n\n<TabsContent value="a">\n\n```markdown\n## Goal Contract\n- Implementation objective: <observable outcome>\n- Scope: <surfaces, workflows, files, or systems>\n```\n\n</TabsContent>\n</Tabs>\n',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(rendered).toMatchObject({ ok: true });
    expect(container.querySelector('pre')?.textContent).toBe(
      '## Goal Contract\n- Implementation objective: <observable outcome>\n- Scope: <surfaces, workflows, files, or systems>',
    );
  });

  test('keeps inline code spans literal inside component bodies', () => {
    const rendered = compile(
      '<Card>\n<CardHeader><CardTitle>T</CardTitle></CardHeader>\n<CardContent>\n\nUse `<port>` here.\n\n</CardContent>\n</Card>\n',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(rendered).toMatchObject({ ok: true });
    expect(container.querySelector('code')?.textContent).toBe('<port>');
    expect(container.textContent).toContain('Use <port> here.');
  });

  test('keeps escaped angle brackets literal inside component bodies', () => {
    const rendered = compile(
      '<Card>\n<CardHeader><CardTitle>T</CardTitle></CardHeader>\n<CardContent>\n\nUse \\<port\\> here.\n\n</CardContent>\n</Card>\n',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    const topLevel = compile('Use \\<port\\> here.\n');
    const topLevelContainer = document.createElement('div');
    topLevelContainer.innerHTML = topLevel.ok ? topLevel.html : '';

    expect(rendered).toMatchObject({ ok: true });
    expect(container.textContent).toContain(topLevelContainer.textContent ?? '');
  });

  test('renders fenced bodies the same way inside a component and at top level', () => {
    const fence = '```md\nobjective: <observable outcome>\n```\n';
    const inBody = compile(
      `<Card>\n<CardHeader><CardTitle>T</CardTitle></CardHeader>\n<CardContent>\n\n${fence}\n</CardContent>\n</Card>\n`,
    );
    const topLevel = compile(fence);

    expect(readPre(inBody)).toBe(readPre(topLevel));
  });

  test('does not double-decode entities inside fenced component bodies', () => {
    const rendered = compile(
      '<Card>\n<CardHeader><CardTitle>T</CardTitle></CardHeader>\n<CardContent>\n\n```md\nA &amp; B\n```\n\n</CardContent>\n</Card>\n',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(rendered).toMatchObject({ ok: true });
    expect(container.querySelector('pre')?.textContent).toBe('A &amp; B');
  });

  test('labels a fenced block with its language and keeps the info string out of the code', () => {
    const rendered = compile('```ts\nconst x: number = 1;\n```\n');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';
    const figure = container.querySelector('figure.htmdx-code-figure');

    expect(figure?.getAttribute('data-language')).toBe('ts');
    expect(figure?.querySelector('.htmdx-code-language')?.textContent).toBe('ts');
    expect(figure?.querySelector('pre > code')?.className).toBe('language-ts');
    expect(figure?.querySelector('pre')?.textContent).toBe('const x: number = 1;');
  });

  test('drops an unusable fence info string instead of emitting a class', () => {
    const rendered = compile('```{= no/thanks }\nplain\n```\n');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';
    const figure = container.querySelector('figure.htmdx-code-figure');

    expect(figure?.hasAttribute('data-language')).toBe(false);
    expect(figure?.querySelector('pre > code')?.hasAttribute('class')).toBe(false);
    expect(figure?.querySelector('pre')?.textContent).toBe('plain');
  });

  test('highlights a fenced block it has a grammar for and leaves the rest plain', () => {
    const rendered = compile(
      '```ts\n// note\nconst count = 1;\n```\n\n```wat\nconst count = 1;\n```',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';
    const [highlighted, plain] = container.querySelectorAll('pre > code');

    expect(highlighted.querySelector('.htmdx-tok-comment')?.textContent).toBe('// note');
    expect(highlighted.querySelector('.htmdx-tok-keyword')?.textContent).toBe('const');
    expect(highlighted.querySelector('.htmdx-tok-number')?.textContent).toBe('1');
    expect(highlighted.textContent).toBe('// note\nconst count = 1;');
    expect(plain.querySelector('span')).toBeNull();
  });

  test('highlights markup without letting a tag escape the code block', () => {
    const rendered = compile('```html\n<div class="a">hi</div>\n```\n');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('div.a')).toBeNull();
    expect(container.querySelector('.htmdx-tok-tag')?.textContent).toBe('<div');
    expect(container.querySelector('.htmdx-tok-attribute')?.textContent).toBe('class');
    expect(container.querySelector('pre')?.textContent).toBe('<div class="a">hi</div>');
  });

  test('gives a raw pre the same chrome as a fence and reads its language class', () => {
    const rendered = compile(
      '<pre><code class="language-json">{"a": 1}</code></pre>\n\n<pre>plain block</pre>',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';
    const [fromCode, bare] = container.querySelectorAll('figure.htmdx-code-figure');

    expect(fromCode.getAttribute('data-language')).toBe('json');
    expect(fromCode.querySelector('.htmdx-tok-property')?.textContent).toBe('"a"');
    expect(fromCode.querySelector('pre')?.textContent).toBe('{"a": 1}');
    expect(bare.hasAttribute('data-language')).toBe(false);
    expect(bare.querySelector('pre')?.textContent).toBe('plain block');
    // compile() output carries no runtime, so the copy button — which only works
    // with React attached — stays out of it. renderHost() renders it instead.
    expect(container.querySelectorAll('.htmdx-code-copy')).toHaveLength(0);
  });

  test('leaves a pre that wraps real markup as a plain pre element', () => {
    const rendered = compile('<pre>keep <strong>this</strong> markup</pre>');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('figure.htmdx-code-figure')).toBeNull();
    expect(container.querySelector('pre > strong')?.textContent).toBe('this');
  });

  // The chrome carries a language and nothing else, so a block that was written
  // with an anchor or a styling hook keeps the element it was written as rather
  // than losing the attribute to the figure.
  test('leaves a pre carrying its own attributes as a plain pre element', () => {
    const rendered = compile(
      '<pre id="example">snippet</pre>\n\n<pre><code class="language-ts theme-dark">const x = 1;</code></pre>',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('figure.htmdx-code-figure')).toBeNull();
    expect(container.querySelector('pre#example')?.textContent).toBe('snippet');
    expect(container.querySelector('pre > code')?.className).toBe('language-ts theme-dark');
  });

  // An inline span is a chip; a block is already a card. The chip rules run on
  // an inline box, so one that also matched the block's <code> would repaint its
  // background once per wrapped line. Both stylesheets carry the same guard.
  test('keeps the inline code chip off a code block', () => {
    register({ automount: false });
    const runtimeCss = document.getElementById('htmdx-runtime-v1-styles')?.textContent ?? '';
    const sheet = document.createElement('style');
    sheet.textContent = runtimeCss + shadcnThemeCss;
    document.head.append(sheet);

    const rendered = compile('## Code\n\nAn inline `span`.\n\n```ts\nconst x = 1;\n```\n');
    const host = document.createElement('div');
    host.innerHTML = rendered.ok ? rendered.html : '';
    document.body.append(host);

    const inline = host.querySelector('p code');
    const block = host.querySelector('.htmdx-code-block code');
    const chipSelectors = Array.from(sheet.sheet?.cssRules ?? [])
      .filter(
        (rule): rule is CSSStyleRule =>
          rule instanceof CSSStyleRule &&
          rule.selectorText.includes('code:not([data-slot])') &&
          rule.style.background !== '',
      )
      .map((rule) => rule.selectorText);

    expect(chipSelectors.length).toBeGreaterThan(0);
    expect(chipSelectors.filter((selector) => inline?.matches(selector))).toHaveLength(
      chipSelectors.length,
    );
    expect(chipSelectors.filter((selector) => block?.matches(selector))).toHaveLength(0);

    host.remove();
    sheet.remove();
  });

  test('copies the block source to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    register({ automount: false });
    const host = document.createElement('div');
    host.innerHTML = '<script type="text/htmdx">```ts\nconst x = 1;\n```\n</script>';
    document.body.append(host);

    await renderHost(host);
    const button = host.querySelector<HTMLButtonElement>('.htmdx-code-copy');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(writeText).toHaveBeenCalledWith('const x = 1;');
    expect(button?.textContent).toBe('Copied');
    expect(button?.getAttribute('aria-label')).toBe('Code copied');

    host.remove();
    vi.unstubAllGlobals();
  });

  test('renders inline code spans as code elements', () => {
    const rendered = compile('Run `npm run build` before `git push`.\n');
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect([...container.querySelectorAll('p > code')].map((node) => node.textContent)).toEqual([
      'npm run build',
      'git push',
    ]);
  });

  test('styles fenced and inline code in the rendered document', async () => {
    register({ automount: false });
    const host = document.createElement('div');
    host.innerHTML =
      '<script type="text/htmdx">Use `name` here.\n\n```ts\nconst x = 1;\n```\n</script>';
    document.body.append(host);

    await renderHost(host);

    const pre = host.querySelector('pre.htmdx-code-block');
    const inline = host.querySelector('p > code');
    expect(pre).not.toBeNull();
    expect(getComputedStyle(pre!).overflowX).toBe('auto');
    expect(getComputedStyle(pre!).maxWidth).toBe('100%');
    expect(getComputedStyle(inline!).fontFamily).toBe('var(--htmdx-mono)');

    host.remove();
  });

  test('does not leak fence markers as text inside component bodies', () => {
    const rendered = compile(
      '<Card>\n<CardHeader><CardTitle>T</CardTitle></CardHeader>\n<CardContent>\n\n```md\nobjective: <observable outcome>\n```\n\n</CardContent>\n</Card>\n',
    );
    const container = document.createElement('div');
    container.innerHTML = rendered.ok ? rendered.html : '';

    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.textContent).not.toContain('```');
  });

  test('keeps rendered images within the content width', async () => {
    register({ automount: false });
    const host = document.createElement('div');
    host.innerHTML = '<script type="text/htmdx">![Screenshot](screenshots/result.png)</script>';
    document.body.append(host);

    await renderHost(host);

    const image = host.querySelector('img.htmdx-image');
    expect(image).not.toBeNull();
    expect(getComputedStyle(image!).maxWidth).toBe('100%');
    expect(getComputedStyle(image!).height).toBe('auto');
    host.remove();
  });
});
