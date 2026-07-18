import type { HtmdxComponent } from '../../../component-definition';
import { Finding as Component } from './Finding';

export const Finding = {
  name: 'Finding',
  purpose:
    'Present key findings as a scannable card list. Write one or more `- item` rows; use `**Title:** details` to label a finding.',
  example: '<Finding>\n- **Drift:** Runtime support is not machine-discoverable.\n</Finding>',
  body: 'markdown',
  Component,
} as const satisfies HtmdxComponent;
