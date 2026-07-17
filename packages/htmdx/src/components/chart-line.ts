import type { HtmdxComponent } from './types';

export const chartLine = {
  name: 'ChartLine',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartLine>\n- Week 1: 8\n- Week 2: 13\n</ChartLine>',
} as const satisfies HtmdxComponent;
