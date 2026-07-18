import { parseComponentBody } from './body-contracts';
import { audience } from './audience';
import { chartArea } from './chart-area';
import { chartBar } from './chart-bar';
import { chartLine } from './chart-line';
import { chartPie } from './chart-pie';
import { compare } from './compare';
import { dataTable } from './data-table';
import { decisionMatrix } from './decision-matrix';
import { decisionTable } from './decision-table';
import { evidence } from './evidence';
import { finding } from './finding';
import { intentList } from './intent-list';
import { metricStrip } from './metric-strip';
import { openQuestions } from './open-questions';
import { riskTable } from './risk-table';
import { signalGrid } from './signal-grid';
import { sources } from './sources';
import { stat } from './stat';
import { timeline } from './timeline';
import type { HtmdxComponent } from './types';

export const builtInComponents = [
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
  sources,
  audience,
  intentList,
  signalGrid,
  decisionMatrix,
  openQuestions,
  riskTable,
  decisionTable,
  timeline,
] as const satisfies readonly HtmdxComponent[];

const names = new Set<string>();
for (const component of builtInComponents) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(component.name)) {
    throw new Error(`invalid built-in component name "${component.name}"`);
  }
  if (!component.purpose.trim() || !component.example.trim()) {
    throw new Error(`built-in component "${component.name}" has incomplete manifest metadata`);
  }

  const normalizedName = component.name.toLowerCase();
  if (names.has(normalizedName)) {
    throw new Error(`duplicate built-in component name "${component.name}"`);
  }
  names.add(normalizedName);
  validateExample(component);
}

function validateExample(component: HtmdxComponent) {
  const match = component.example.match(
    new RegExp(`^<${component.name}>\\r?\\n([\\s\\S]+)\\r?\\n<\\/${component.name}>$`),
  );
  if (!match) {
    throw new Error(
      `invalid example for built-in component "${component.name}": expected one complete <${component.name}> element`,
    );
  }

  const body = match[1];
  switch (component.body) {
    case 'markdown':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
    case 'label-value-list':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
    case 'label-number-list':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
    case 'gfm-table':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
    case 'markdown-list-cards':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
  }
}
