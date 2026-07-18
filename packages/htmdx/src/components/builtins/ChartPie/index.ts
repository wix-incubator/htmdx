import type { HtmdxComponent } from '../../../component-definition';
import { ChartPie as Component } from './ChartPie';

export const ChartPie = {
  name: 'ChartPie',
  body: 'markdown',
  purpose:
    "Compare non-negative numeric values written as '- label: number' rows; currently rendered with the shared bar-chart visualization.",
  example: '<ChartPie>\n- Direct: 62\n- Referral: 38\n</ChartPie>',
  Component,
} as const satisfies HtmdxComponent;
