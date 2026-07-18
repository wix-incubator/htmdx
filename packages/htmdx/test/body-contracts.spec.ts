import { describe, expect, test } from 'vitest';
import { compile, renderHost } from '../src';
import {
  parseComponentBody,
  parseGfmTable,
  parseLabelNumberList,
  parseLabelValueList,
  parseMarkdownListCards,
} from '../src/components/body-contracts';

describe('component body contracts', () => {
  test('parses label-value rows at the first colon', () => {
    expect(parseLabelValueList('- Endpoint: https://example.com:443')).toEqual([
      { label: 'Endpoint', value: 'https://example.com:443' },
    ]);
  });

  test.each(['', '- Missing separator', '- : value', '- Label:', 'not a list row'])(
    'rejects malformed label-value row %j',
    (body) => {
      expect(() => parseLabelValueList(body)).toThrow();
    },
  );

  test('parses finite non-negative decimal values without coercion', () => {
    expect(parseLabelNumberList('- Zero: 0\n- Fraction: 12.5')).toEqual([
      { label: 'Zero', value: 0 },
      { label: 'Fraction', value: 12.5 },
    ]);
  });

  test.each([
    '',
    '- : 1',
    '- Users:',
    '- Users: -1',
    '- Users: 1,000',
    '- Users: 2%',
    '- Users: nope',
    '- Users: 1e3',
  ])('rejects invalid numeric value in %j', (body) => {
    expect(() => parseLabelNumberList(body)).toThrow();
  });

  test('parses a structurally valid GFM table', () => {
    expect(parseGfmTable('| Plan | Users |\n| :--- | ---: |\n| Free | 48 |')).toEqual({
      header: ['Plan', 'Users'],
      rows: [['Free', '48']],
    });
  });

  test('preserves escaped pipes inside GFM table cells', () => {
    expect(
      parseGfmTable('| Choice \\| fallback | Result |\n| --- | --- |\n| A \\| B | Works |'),
    ).toEqual({
      header: ['Choice | fallback', 'Result'],
      rows: [['A | B', 'Works']],
    });
  });

  test.each([
    '| Plan |\n| --- |',
    '| | Users |\n| --- | --- |\n| Free | 48 |',
    '| Plan | Users |\n| nope | --- |\n| Free | 48 |',
    '| Plan | Users |\n| --- | --- |\n| Free |',
  ])('rejects malformed GFM table %j', (body) => {
    expect(() => parseGfmTable(body)).toThrow();
  });

  test('parses non-empty Markdown list cards', () => {
    expect(parseMarkdownListCards('- **Title:** Detail\n- Plain item')).toEqual({
      items: ['**Title:** Detail', 'Plain item'],
      lines: [1, 2],
    });
  });

  test.each(['', '- ', '- Valid\nignored prose'])(
    'rejects malformed Markdown list cards %j',
    (body) => {
      expect(() => parseMarkdownListCards(body)).toThrow();
    },
  );

  test('accepts non-empty Markdown', () => {
    expect(parseComponentBody('Card', 'markdown', '**Useful** content')).toBe('**Useful** content');
  });

  test.each([
    ['`{name}`', '<code>{name}</code>'],
    ['\\{name\\}', '\\{name\\}'],
    ['`<Card>`', '<code>&lt;Card&gt;</code>'],
    ['<https://wix.com>', '&lt;https://wix.com&gt;'],
    ['```tsx\n<Card />\n```', '&lt;Card /&gt;'],
  ])('allows Markdown literal syntax in component bodies: %j', (body, renderedText) => {
    const rendered = compile(`<Card>\n${body}\n</Card>`);

    expect(rendered).toMatchObject({ ok: true });
    expect(rendered.ok && rendered.html).toContain(renderedText);
  });

  test.each([
    ['', 'body is empty'],
    ['import data from "./data.js"', 'import statements are not allowed'],
    ['export const value = 1', 'export statements are not allowed'],
    ['Hello {name}', 'MDX expressions are not allowed'],
    ['<Card>nested</Card>', 'nested component tags are not allowed'],
    ['<>fragment</>', 'nested component tags are not allowed'],
  ])('rejects global body violation in %j', (body, violation) => {
    expect(() => parseComponentBody('Callout', 'markdown', body)).toThrow(
      new RegExp(`Invalid body for <Callout>.*${violation}.*expected`),
    );
  });

  test.each(['<MetricStrip></MetricStrip>', '<MetricStrip />'])(
    'rejects an empty structured component body through compilation: %s',
    (source) => {
      const rendered = compile(source);

      expect(rendered).toMatchObject({ ok: false });
      expect(!rendered.ok && rendered.error).toContain(
        'Invalid body for <MetricStrip>: body is empty',
      );
    },
  );

  test('allows empty composable component bodies', () => {
    const rendered = compile('<Card />');
    expect(rendered).toMatchObject({ ok: true, components: ['Card'] });
  });

  test('fails the whole compilation with component, rule, expected shape, and body line', () => {
    const rendered = compile('<ChartBar>\n- Users: 1,000\n</ChartBar>');

    expect(rendered).toMatchObject({ ok: false });
    expect(!rendered.ok && rendered.error).toMatch(
      /<ChartBar>.*body line 1.*not a non-negative decimal.*expected.*- label: number/,
    );
  });

  test('applies RiskTable validation through compilation', () => {
    const rendered = compile(
      '<RiskTable>\n- **Must-have:** First\n- **Must-have:** Second\n</RiskTable>',
    );

    expect(rendered).toMatchObject({ ok: false });
    expect(!rendered.ok && rendered.error).toContain('tier "Must-have" is repeated');
  });

  test('shows the whole-artifact browser fallback and raw source for an invalid body', async () => {
    const host = document.createElement('div');
    host.innerHTML = `<template type="text/htmdx"><ChartBar>
- Users: many
</ChartBar></template>`;

    await renderHost(host);

    expect(host.textContent).toContain('Invalid body for <ChartBar>');
    expect(host.textContent).toContain('- Users: many');
  });
});
