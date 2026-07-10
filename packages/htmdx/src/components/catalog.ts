import { callout } from './callout';
import { card } from './card';
import { chartArea } from './chart-area';
import { chartBar } from './chart-bar';
import { chartLine } from './chart-line';
import { chartPie } from './chart-pie';
import { compare } from './compare';
import { dataTable } from './data-table';
import { decisionTable } from './decision-table';
import { evidence } from './evidence';
import { executiveSummary } from './executive-summary';
import { finding } from './finding';
import { metricStrip } from './metric-strip';
import { riskTable } from './risk-table';
import { sourceQuote } from './source-quote';
import { stat } from './stat';
import { timeline } from './timeline';
import type { HtmdxComponent } from './types';

export const builtInComponents: readonly HtmdxComponent[] = [
  executiveSummary,
  card,
  callout,
  sourceQuote,
  metricStrip,
  stat,
  chartBar,
  chartArea,
  chartLine,
  chartPie,
  dataTable,
  compare,
  finding,
  evidence,
  riskTable,
  decisionTable,
  timeline,
];

const names = new Set<string>();
for (const component of builtInComponents) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(component.name)) {
    throw new Error(`invalid built-in component name "${component.name}"`);
  }

  const normalizedName = component.name.toLowerCase();
  if (names.has(normalizedName)) {
    throw new Error(`duplicate built-in component name "${component.name}"`);
  }
  names.add(normalizedName);
}
