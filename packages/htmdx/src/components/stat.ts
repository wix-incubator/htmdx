import type { LabelValue } from './body-contracts';
import { componentShell, renderMetricsContent } from './rendering';
import type { HtmdxComponent } from './types';

export const stat: HtmdxComponent = {
  name: 'Stat',
  body: 'label-value-list',
  purpose: 'Highlight one or more labeled statistics.',
  example: '<Stat>\n- Adoption: **72%**\n</Stat>',
  renderer: renderStat,
};

function renderStat(name: string, body: LabelValue[]) {
  return componentShell(name, renderMetricsContent(body));
}
