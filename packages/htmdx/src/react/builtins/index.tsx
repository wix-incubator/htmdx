// The built-in catalog as React components.
//
// Unmigrated structured Built-ins own their body: they parse it through the
// body contracts and render native shadcn/Tailwind JSX. Migrated components
// flow through the definition catalog instead.
import { builtInComponents } from '../../components/catalog';
import type { HtmdxReactComponent, HtmdxReactComponents } from '../index';
import { IntentList } from './intents';
import { OpenQuestions } from './open-questions';
import { SignalGrid } from './signal-grid';

type StructuredBuiltInName = (typeof builtInComponents)[number]['name'];

const structured = {
  IntentList,
  SignalGrid,
  OpenQuestions,
} satisfies Record<StructuredBuiltInName, HtmdxReactComponent>;

export const builtInReactComponents: HtmdxReactComponents = Object.fromEntries(
  builtInComponents.map((component) => [component.name, structured[component.name]]),
);
