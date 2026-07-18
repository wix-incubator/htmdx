import type { HtmdxComponent } from '../../../component-definition';
import { Compare as Component } from './Compare';

export const Compare = {
  name: 'Compare',
  purpose:
    'Place alternatives or contrasting concepts side by side. Write one or more `- item` rows; use `**Title:** details` to label a card.',
  example:
    '<Compare>\n- **Current:** Manual component discovery\n- **Proposed:** Versioned manifest\n</Compare>',
  body: 'markdown',
  Component,
} as const satisfies HtmdxComponent;
