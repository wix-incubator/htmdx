import type { LabelNumber } from './body-contracts';
import { componentShell, renderBarChartContent } from './rendering';
import type { HtmdxComponent } from './types';

export const chartArea: HtmdxComponent = {
  name: 'ChartArea',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartArea>\n- January: 18\n- February: 27\n</ChartArea>',
  renderer: renderChartArea,
};

function renderChartArea(name: string, body: LabelNumber[]) {
  return componentShell(name, renderBarChartContent(name, body));
}
