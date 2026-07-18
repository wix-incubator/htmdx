import type { HtmdxComponent } from '../../../component-definition';
import { ChartArea as Component } from './ChartArea';

export const ChartArea = {
  name: 'ChartArea',
  body: 'markdown',
  purpose:
    "Compare non-negative numeric values written as '- label: number' rows; currently rendered with the shared bar-chart visualization.",
  example: '<ChartArea>\n- January: 18\n- February: 27\n</ChartArea>',
  Component,
} as const satisfies HtmdxComponent;
