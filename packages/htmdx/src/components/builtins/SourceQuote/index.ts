import type { HtmdxComponent } from '../../../component-definition';
import { SourceQuote as Component } from './SourceQuote';

export const SourceQuote = {
  name: 'SourceQuote',
  purpose:
    'Display a source quotation or excerpt as Markdown, with attribution supplied in the surrounding content.',
  example: '<SourceQuote>\n“Artifacts should remain editable.”\n</SourceQuote>',
  body: 'markdown',
  Component,
} as const satisfies HtmdxComponent;
