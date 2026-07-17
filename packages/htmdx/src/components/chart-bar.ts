import type { HtmdxComponent } from './types';

export const chartBar = {
  name: 'ChartBar',
  body: 'label-number-list',
  purpose: 'Compare non-negative numeric values with a bar chart.',
  example: '<ChartBar>\n- Free users: 48\n- Paid users: 12\n</ChartBar>',
} as const satisfies HtmdxComponent;
