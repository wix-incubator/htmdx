import { countTokens as countCl100k } from 'gpt-tokenizer/encoding/cl100k_base';
import { countTokens } from 'gpt-tokenizer/encoding/o200k_base';

export const ENCODING = 'o200k_base';
export const ALT_ENCODING = 'cl100k_base';

export type Measure = { tokens: number; chars: number };

export function measure(text: string): Measure {
  return { tokens: countTokens(text), chars: text.length };
}

// Second encoding for the tokenizer-sensitivity check: markup-heavy text
// tokenizes differently across vocabularies, so the report shows the ratios
// hold rather than resting the claim on one tokenizer.
export function altTokens(text: string): number {
  return countCl100k(text);
}
