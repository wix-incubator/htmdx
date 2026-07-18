import { describe, expect, test } from 'vitest';
import { validateCanonicalExamples } from '../build/canonical-example-validation.js';
import { compile } from '../src';

describe('canonical example build validation', () => {
  test('rejects malformed structured Markdown from the merged manifest catalog', () => {
    expect(() =>
      validateCanonicalExamples(
        [{ name: 'Compare', example: '<Compare>\nCurrent: Manual review\n</Compare>' }],
        compile,
      ),
    ).toThrow('canonical example for <Compare> failed to compile');
  });

  test.each([
    ['inline code', '`<Compare></Compare>`'],
    ['an HTML comment', '<!-- <Compare></Compare> -->'],
  ])('rejects a target mentioned only in %s', (_syntax, example) => {
    expect(() => validateCanonicalExamples([{ name: 'Compare', example }], compile)).toThrow(
      'canonical example for <Compare> does not contain its target',
    );
  });
});
