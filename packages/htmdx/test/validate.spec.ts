import { describe, expect, test } from 'vitest';
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
});
