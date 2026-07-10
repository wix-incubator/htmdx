import type { LabelNumber } from './body-contracts';
import { componentShell, renderBarChartContent } from './rendering';
import type { HtmdxComponent } from './types';

export const chartPie: HtmdxComponent = {
  name: 'ChartPie',
  body: 'label-number-list',
  purpose:
    'Compare non-negative numeric values; currently rendered with the shared bar-chart visualization.',
  example: '<ChartPie>\n- Direct: 62\n- Referral: 38\n</ChartPie>',
  renderer: renderChartPie,
};

function renderChartPie(name: string, body: LabelNumber[]) {
  return componentShell(name, renderBarChartContent(name, body));
}
