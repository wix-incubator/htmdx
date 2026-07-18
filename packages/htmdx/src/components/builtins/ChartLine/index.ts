import type { HtmdxComponent } from '../../../component-definition';
import { ChartLine as Component } from './ChartLine';

export const ChartLine = {
  name: 'ChartLine',
  body: 'markdown',
  purpose:
    "Compare non-negative numeric values written as '- label: number' rows; currently rendered with the shared bar-chart visualization.",
  example: '<ChartLine>\n- Week 1: 8\n- Week 2: 13\n</ChartLine>',
  Component,
} as const satisfies HtmdxComponent;
