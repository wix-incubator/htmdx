import type { HtmdxComponent } from '../../../component-definition';
import { ChartBar as Component, bodyFormat } from './ChartBar';

export const ChartBar = {
  name: 'ChartBar',
  body: 'markdown',
  bodyFormat,
  purpose: "Compare non-negative numeric values with a bar chart using '- label: number' rows.",
  example: '<ChartBar>\n- Free users: 48\n- Paid users: 12\n</ChartBar>',
  Component,
} as const satisfies HtmdxComponent;
