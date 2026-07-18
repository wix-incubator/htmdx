import { describe, expect, test } from 'vitest';
import { validateCanonicalExamples } from '../build/canonical-example-validation.js';
import { compile } from '../src';
import { canonicalExamples } from '../src/component-manifest';

describe('canonical example build validation', () => {
  test('rejects malformed structured Markdown from the merged manifest catalog', () => {
    const examples: { name: string; example: string }[] = canonicalExamples.map((example) => ({
      ...example,
    }));
    const compare = examples.find((component) => component.name === 'Compare');
    if (!compare) {
      throw new Error('test setup requires Compare in the merged manifest catalog');
    }
    compare.example = '<Compare>\nCurrent: Manual review\n</Compare>';

    expect(() => validateCanonicalExamples(examples, compile)).toThrow(
      'canonical example for <Compare> failed to compile',
    );
  });
});
