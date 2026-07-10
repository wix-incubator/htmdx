import { renderMetricStrip } from './renderers';
import type { HtmdxComponent } from './types';

export const stat: HtmdxComponent = {
  name: 'Stat',
  body: 'label-value-list',
  purpose: 'Highlight one or more labeled statistics.',
  example: '<Stat>\n- Adoption: **72%**\n</Stat>',
  renderer: renderMetricStrip,
};
