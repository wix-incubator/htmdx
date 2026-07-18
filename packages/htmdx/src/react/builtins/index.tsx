// The built-in catalog as React components.
//
// Unmigrated structured Built-ins own their body: they parse it through the
// body contracts and render native shadcn/Tailwind JSX. Migrated components
// flow through the definition catalog instead.
import { builtInComponents } from '../../components/catalog';
import type { HtmdxReactComponent, HtmdxReactComponents } from '../index';
import { Audience } from './audience';
import { Compare, Evidence, Finding } from './cards';
import { IntentList } from './intents';
import { OpenQuestions } from './open-questions';
import { SignalGrid } from './signal-grid';
import { Sources } from './sources';

type StructuredBuiltInName = (typeof builtInComponents)[number]['name'];

const structured = {
  Compare,
  Finding,
  Evidence,
  Sources,
  Audience,
  IntentList,
  SignalGrid,
  OpenQuestions,
} satisfies Record<StructuredBuiltInName, HtmdxReactComponent>;

export const builtInReactComponents: HtmdxReactComponents = Object.fromEntries(
  builtInComponents.map((component) => [component.name, structured[component.name]]),
);
