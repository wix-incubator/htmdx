import type { HtmdxComponent } from '../../../component-definition';
import { Callout as Component } from './Callout';

export const Callout = {
  name: 'Callout',
  purpose: 'Emphasize an important note, warning, or takeaway using a Markdown body.',
  example: '<Callout>\n**Important:** Validate the artifact before publishing.\n</Callout>',
  body: 'markdown',
  Component,
} as const satisfies HtmdxComponent;
