import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { countTokens } from 'gpt-tokenizer/encoding/o200k_base';
import { describe, expect, test } from 'vitest';
import { compile } from '../src';

// Loose guard around bench/RESULTS.md: htmdx source cost 0.20x / 0.31x of the
// compiled HTML when first measured; fail if the advantage collapses below 2x.
const MAX_TOKEN_RATIO = 0.5;

const SCENARIOS = ['decision-brief', 'executive-decision-report'];

describe('token efficiency', () => {
  for (const scenario of SCENARIOS) {
    test(`htmdx source stays well under compiled HTML tokens (${scenario})`, () => {
      const source = readFileSync(
        join(process.cwd(), 'bench/scenarios', scenario, 'source.htmdx'),
        'utf8',
      );

      const compiled = compile(source);
      if (!compiled.ok) {
        throw new Error(compiled.error);
      }

      expect(countTokens(source)).toBeLessThan(countTokens(compiled.html) * MAX_TOKEN_RATIO);
    });
  }
});
