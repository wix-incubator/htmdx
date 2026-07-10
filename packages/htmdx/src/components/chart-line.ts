import type { LabelNumber } from './body-contracts';
import { componentShell, renderBarChartContent } from './rendering';
import type { HtmdxComponent } from './types';

export const chartLine: HtmdxComponent = {
  name: 'ChartLine',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartLine>\n- Week 1: 8\n- Week 2: 13\n</ChartLine>',
  renderer: renderChartLine,
};

function renderChartLine(name: string, body: LabelNumber[]) {
  return componentShell(name, renderBarChartContent(name, body));
}
