import { renderRiskTable } from './renderers';
import type { HtmdxComponent } from './types';

export const riskTable: HtmdxComponent = {
  name: 'RiskTable',
  body: 'markdown-list-cards',
  purpose: 'Classify priorities using the canonical product-planning tiers.',
  example:
    '<RiskTable>\n- **Must-have:** Publish exact-version metadata.\n- **Not now:** Describe host components.\n</RiskTable>',
  renderer: renderRiskTable,
};
