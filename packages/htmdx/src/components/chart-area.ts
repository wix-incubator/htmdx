import type { HtmdxComponent } from './types';

export const chartArea = {
  name: 'ChartArea',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartArea>\n- January: 18\n- February: 27\n</ChartArea>',
} as const satisfies HtmdxComponent;
