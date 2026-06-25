import { describe, expect, test } from 'vitest';
import {
  DEFAULT_TAG_NAME,
  canonicalComponentName,
  compile,
  register,
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

  test('registers htmdx-code by default', () => {
    register();

    expect(customElements.get(DEFAULT_TAG_NAME)).toBeDefined();
  });

  test('rejects unknown components', () => {
    expect(() => tokenizeBlocks('<Nope>content</Nope>')).toThrow('unknown component <Nope>');
  });

  test('strips unsafe link schemes', () => {
    const rendered = compile('[bad](javascript:alert(1)) [good](https://wix.com)');

    expect(rendered.ok && rendered.html).toContain('bad');
    expect(rendered.ok && rendered.html).not.toContain('javascript:');
    expect(rendered.ok && rendered.html).toContain('<a href="https://wix.com">good</a>');
  });
});
