import type { HtmdxComponent } from './types';

export const sourceQuote = {
  name: 'SourceQuote',
  body: 'markdown',
  purpose: 'Display a quotation or excerpt attributed in the surrounding content.',
  example: '<SourceQuote>\n“Artifacts should remain editable.”\n</SourceQuote>',
} as const satisfies HtmdxComponent;
