import type { HtmdxComponent } from '../../../component-definition';
import { RiskTable as Component } from './RiskTable';

export const RiskTable = {
  name: 'RiskTable',
  body: 'markdown',
  purpose:
    "Classify priorities written as Markdown list rows. Each row must start with one unique, case-sensitive bold tier—`Must-have`, `Differentiator`, `Not now`, or `Won't do`—followed by non-empty text.",
  example:
    '<RiskTable>\n- **Must-have:** Publish exact-version metadata.\n- **Not now:** Describe host components.\n</RiskTable>',
  Component,
} as const satisfies HtmdxComponent;
