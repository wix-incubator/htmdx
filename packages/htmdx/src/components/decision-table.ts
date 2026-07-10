import { renderDecisionTable } from './renderers';
import type { HtmdxComponent } from './types';

export const decisionTable: HtmdxComponent = {
  name: 'DecisionTable',
  body: 'label-value-list',
  purpose: 'Present decision criteria and their corresponding outcomes.',
  example:
    '<DecisionTable>\n- Scope: Built-in components only\n- Delivery: Versioned manifest\n</DecisionTable>',
  renderer: renderDecisionTable,
};
