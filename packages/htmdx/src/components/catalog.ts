import { parseComponentBody } from './body-contracts';
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

export type BuiltInRenderer = (name: string, body: string) => string;

export function createBuiltInRenderer(component: HtmdxComponent): BuiltInRenderer {
  return (name, rawBody) => {
    switch (component.body) {
      case 'markdown': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
      case 'label-value-list': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
      case 'label-number-list': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
      case 'gfm-table': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
      case 'markdown-list-cards': {
        const body = parseComponentBody(name, component.body, rawBody, component.validate);
        return component.renderer(name, body);
      }
    }
  };
}
