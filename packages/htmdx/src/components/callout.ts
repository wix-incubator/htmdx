import type { HtmdxComponent } from './types';

export const callout = {
  name: 'Callout',
  body: 'markdown',
  purpose: 'Emphasize an important note, warning, or takeaway.',
  example: '<Callout>\n**Important:** Validate the artifact before publishing.\n</Callout>',
} as const satisfies HtmdxComponent;
