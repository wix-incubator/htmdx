import type { LabelNumber } from './body-contracts';
import { componentShell, renderBarChartContent } from './rendering';
import type { HtmdxComponent } from './types';

export const chartBar: HtmdxComponent = {
  name: 'ChartBar',
  body: 'label-number-list',
  purpose: 'Compare non-negative numeric values with a bar chart.',
  example: '<ChartBar>\n- Free users: 48\n- Paid users: 12\n</ChartBar>',
  renderer: renderChartBar,
};

function renderChartBar(name: string, body: LabelNumber[]) {
  return componentShell(name, renderBarChartContent(name, body));
}
