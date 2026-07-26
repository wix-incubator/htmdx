import { describe, expect, test, vi } from 'vitest';
import { validate } from '../src';

// Three failures from three different phases: the tokenizer scan, attribute
// parsing, and component render. Reporting all three is the whole point of
// validate() over compile(), which stops at the first.
const THREE_PHASE_FAILURE = [
  '# Report',
  '',
  '<Nope>unknown component</Nope>',
  '',
  '<Callout tone="x">Body.</Callout>',
  '',
  '<Stat>not a label-value list</Stat>',
  '',
].join('\n');

describe('validate', () => {
  test('reports every independent failure, not just the first', () => {
    const codes = validate(THREE_PHASE_FAILURE).map((diagnostic) => diagnostic.code);

    expect(codes).toEqual(['unknown-component', 'unknown-prop', 'body-contract']);
  });

  test('anchors each diagnostic to its source position', () => {
    const positions = validate(THREE_PHASE_FAILURE).map(({ code, line, column }) => ({
      code,
      line,
      column,
    }));

    expect(positions).toEqual([
      { code: 'unknown-component', line: 3, column: 1 },
      { code: 'unknown-prop', line: 5, column: 10 },
      { code: 'body-contract', line: 7, column: 1 },
    ]);
  });

  test('returns no diagnostics for valid source', () => {
    expect(validate('# Title\n\n<Callout>All good.</Callout>\n')).toEqual([]);
  });

  test('warns about images with no alt text', () => {
    const source = ['![](chart.png)', '', '<img src="logo.png">', ''].join('\n');

    const diagnostics = validate(source);

    expect(diagnostics.map(({ code, severity, line }) => ({ code, severity, line }))).toEqual([
      { code: 'image-missing-alt', severity: 'warning', line: 1 },
      { code: 'image-missing-alt', severity: 'warning', line: 3 },
    ]);
  });

  test('does not warn when alt text is present', () => {
    expect(validate('![Revenue by quarter](chart.png)\n')).toEqual([]);
  });

  // React only reports invalid nesting through console.error during render, so
  // validate() has to listen for it rather than re-deriving HTML content models.
  test('reports invalid HTML nesting React only logs at render time', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const diagnostics = validate(
        '<Foldout title="t">\n<p>Outer <div>inner</div></p>\n</Foldout>\n',
      );

      expect(diagnostics.map(({ code, severity }) => ({ code, severity }))).toEqual([
        { code: 'invalid-html-nesting', severity: 'warning' },
      ]);
      // React passes its substitutions as separate console.error arguments;
      // a raw "%s cannot be a descendant of <%s>" message names nothing.
      expect(diagnostics[0].message).not.toContain('%s');
      expect(diagnostics[0].message).toContain('<div>');
    } finally {
      consoleError.mockRestore();
    }
  });

  // A nested component's attribute offset is relative to the nested tag, not
  // the outer block, so rebasing it against the outer tag would point at a
  // character that has nothing to do with the failure. Anchoring to the block
  // is less precise but never misleading.
  test('anchors a nested failure to its enclosing block instead of a rebased offset', () => {
    const source = ['<Card>', '  <Callout tone="x">Nope.</Callout>', '</Card>', ''].join('\n');

    const diagnostics = validate(source);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: 'unknown-prop', line: 1, column: 1, offset: 0 });
  });
});
