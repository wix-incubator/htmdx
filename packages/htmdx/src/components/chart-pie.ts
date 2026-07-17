import type { HtmdxComponent } from './types';

export const chartPie = {
  name: 'ChartPie',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartPie>\n- Direct: 62\n- Referral: 38\n</ChartPie>',
} as const satisfies HtmdxComponent;
