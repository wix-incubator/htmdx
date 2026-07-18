// The built-in catalog as React components.
//
// Unmigrated structured Built-ins own their body: they parse it through the
// body contracts and render native shadcn/Tailwind JSX. Migrated components
// flow through the definition catalog instead.
import { builtInComponents } from '../../components/catalog';
import type { HtmdxReactComponent, HtmdxReactComponents } from '../index';
import { Audience } from './audience';
import { Compare, Evidence, Finding, RiskTable, Timeline } from './cards';
import { DecisionMatrix } from './decision-matrix';
import { IntentList } from './intents';
import { OpenQuestions } from './open-questions';
import { SignalGrid } from './signal-grid';
import { Sources } from './sources';
import { DataTable, DecisionTable } from './tables';

type StructuredBuiltInName = (typeof builtInComponents)[number]['name'];

const structured = {
  DataTable,
  Compare,
  Finding,
  Evidence,
  Sources,
  Audience,
  IntentList,
  SignalGrid,
  DecisionMatrix,
  OpenQuestions,
  RiskTable,
  DecisionTable,
  Timeline,
} satisfies Record<StructuredBuiltInName, HtmdxReactComponent>;

export const builtInReactComponents: HtmdxReactComponents = Object.fromEntries(
  builtInComponents.map((component) => [component.name, structured[component.name]]),
);
