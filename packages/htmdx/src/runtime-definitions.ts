// The definition registry every entry point shares: bundled components,
// components added at runtime via register(), and per-call overrides. Kept in
// its own module so the root entry and the /testing subpath resolve against
// one registry instead of each keeping a copy.

import {
  createDefinitionRegistry,
  type HtmdxComponent,
  type HtmdxComponentDefinitions,
} from './component-definition';
import * as builtinDefinitionExports from './components/builtins';
import * as shadcnDefinitionExports from './components/shadcn';

export const bundledDefinitions: HtmdxComponentDefinitions = [
  ...Object.values(builtinDefinitionExports),
  ...Object.values(shadcnDefinitionExports),
];
createDefinitionRegistry(bundledDefinitions);

export const globalDefinitions: HtmdxComponent[] = [];

export function runtimeOptionsFor(options: {
  definitions?: HtmdxComponentDefinitions;
  layout?: string;
}) {
  const definitions = [...bundledDefinitions, ...globalDefinitions, ...(options.definitions || [])];
  createDefinitionRegistry(definitions);
  return { definitions, layout: options.layout };
}
