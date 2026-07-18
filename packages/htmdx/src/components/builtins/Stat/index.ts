import type { HtmdxComponent } from '../../../component-definition';
import { Stat as Component } from './Stat';

export const Stat = {
  name: 'Stat',
  body: 'markdown',
  purpose: "Highlight one or more labeled statistics written as '- label: value' rows.",
  example: '<Stat>\n- Adoption: **72%**\n</Stat>',
  Component,
} as const satisfies HtmdxComponent;
