import type { HtmdxComponent } from '../../../component-definition';
import { DecisionTable as Component, bodyFormat } from './DecisionTable';

export const DecisionTable = {
  name: 'DecisionTable',
  body: 'markdown',
  bodyFormat,
  purpose:
    "Present decision criteria and outcomes written as '- label: value' rows, splitting each row at its first colon.",
  example:
    '<DecisionTable>\n- Scope: Built-in components only\n- Delivery: Versioned manifest\n</DecisionTable>',
  Component,
} as const satisfies HtmdxComponent;
