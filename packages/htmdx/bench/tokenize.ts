import { countTokens } from 'gpt-tokenizer/encoding/o200k_base';

export const ENCODING = 'o200k_base';

export type Measure = { tokens: number; chars: number };

export function measure(text: string): Measure {
  return { tokens: countTokens(text), chars: text.length };
}
