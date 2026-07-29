// How much does an agent pay to learn the component contract an edit needs?
//
// The size benchmark in run.ts measures the artifact. This measures the other
// half of the edit loop: the reference read that precedes the edit. Three modes
// answer the same question at very different prices, and the cheapest one
// depends on how many components the artifact already carries.
//
// Deterministic — this measures what each mode *contains*, not whether a model
// uses it well. That second question needs live model calls and is not answered
// here or anywhere else in this repo.

import { componentsUsedIn, formatComponents, formatList } from '../src/cli/components';
import type { Manifest, ManifestComponent } from '../src/cli/components';
import { measure, type Measure } from './tokenize';

export const CONTRACT_MODES = ['manifest', 'list', 'used'] as const;
export type ContractMode = (typeof CONTRACT_MODES)[number];

export const CONTRACT_MODE_LABELS: Record<ContractMode, string> = {
  manifest: '`components.json`',
  list: '`htmdx components`',
  used: '`htmdx components --used`',
};

export type ContractTask = {
  id: string;
  description: string;
  // The component tags the edit writes. Derived from the edit's newString where
  // one exists, so it stays honest about what the edit actually touches rather
  // than crediting a mode for everything else in the file.
  needs: string[];
};

export type ContractRead = {
  mode: ContractMode;
  // What the mode costs to read before the agent knows anything.
  read: Measure;
  // Contracts the read does not supply and the agent must fetch by name.
  missing: string[];
  followUp: Measure;
  total: number;
  // Whether the read names every component in the catalog. A mode that does not
  // cannot suggest a component the agent has not already thought of.
  discovers: boolean;
};

function contractsFor(manifest: Manifest, names: string[]): ManifestComponent[] {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return manifest.components.filter((entry) => wanted.has(entry.name.toLowerCase()));
}

function cost(entries: ManifestComponent[]): Measure {
  return entries.length === 0 ? { tokens: 0, chars: 0 } : measure(formatComponents(entries));
}

// `list` supplies every name and purpose but no props or example, so it never
// satisfies a contract on its own — it always pays a follow-up. That is the
// trade it makes for being the only cheap mode that also discovers.
export function evaluateRead(
  manifest: Manifest,
  mode: ContractMode,
  source: string,
  task: ContractTask,
): ContractRead {
  const supplied =
    mode === 'manifest'
      ? manifest.components
      : mode === 'used'
        ? componentsUsedIn(manifest, source)
        : [];
  const read =
    mode === 'manifest'
      ? measure(JSON.stringify(manifest, null, 2))
      : mode === 'used'
        ? cost(supplied)
        : measure(formatList(manifest.components, manifest.runtime));

  const have = new Set(supplied.map((entry) => entry.name.toLowerCase()));
  const missing = task.needs.filter((name) => !have.has(name.toLowerCase()));
  const followUp = cost(contractsFor(manifest, missing));

  return {
    mode,
    read,
    missing,
    followUp,
    total: read.tokens + followUp.tokens,
    discovers: mode !== 'used',
  };
}

export function evaluateTask(
  manifest: Manifest,
  source: string,
  task: ContractTask,
): ContractRead[] {
  return CONTRACT_MODES.map((mode) => evaluateRead(manifest, mode, source, task));
}

// The components an edit writes, read straight out of the edit it applies.
export function needsOf(manifest: Manifest, newString: string): string[] {
  return componentsUsedIn(manifest, newString).map((entry) => entry.name);
}
