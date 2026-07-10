import type { LabelValue } from './body-contracts';
import { componentShell, inline } from './rendering';
import type { HtmdxComponent } from './types';

export const decisionTable: HtmdxComponent = {
  name: 'DecisionTable',
  body: 'label-value-list',
  purpose: 'Present decision criteria and their corresponding outcomes.',
  example:
    '<DecisionTable>\n- Scope: Built-in components only\n- Delivery: Versioned manifest\n</DecisionTable>',
  renderer: renderDecisionTable,
};

function renderDecisionTable(name: string, body: LabelValue[]) {
  const rows = body
    .map(({ label, value }) => `<tr><th>${inline(label)}</th><td>${inline(value)}</td></tr>`)
    .join('');

  return componentShell(name, `<table><tbody>${rows}</tbody></table>`);
}
