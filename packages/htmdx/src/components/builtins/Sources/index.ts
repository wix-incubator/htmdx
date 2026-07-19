import type { HtmdxComponent } from '../../../component-definition';
import { Sources as Component } from './Sources';

export const Sources = {
  name: 'Sources',
  purpose:
    'Show research artifacts as provenance pills prefixed with ↗. Write one or more `- source` rows.',
  example: '<Sources>\n- Data Analysis\n- User Voice\n- Product Strategy\n</Sources>',
  body: 'markdown',
  Component,
} as const satisfies HtmdxComponent;
