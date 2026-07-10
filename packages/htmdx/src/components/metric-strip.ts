import type { LabelValue } from './body-contracts';
import { componentShell, renderMetricsContent } from './rendering';
import type { HtmdxComponent } from './types';

export const metricStrip: HtmdxComponent = {
  name: 'MetricStrip',
  body: 'label-value-list',
  purpose: 'Show a compact set of labeled headline values.',
  example: '<MetricStrip>\n- Format: **HTML**\n- Source: **HTMDX**\n</MetricStrip>',
  renderer: renderMetricStrip,
};

function renderMetricStrip(name: string, body: LabelValue[]) {
  return componentShell(name, renderMetricsContent(body));
}
