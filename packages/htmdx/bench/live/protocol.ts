// The question contract.ts cannot answer: given a contract read, does a model
// actually produce a valid edit?
//
// contract.ts measures what each read *contains*. This measures what a model
// does with it. Everything in this file is pure — prompt in, verdict out — so
// the wiring is testable without spending anything; models.ts owns the calls.
//
// Scoring never asks a model anything. htmdx ships a validator, so an
// LLM-as-judge would only add a second source of noise on top of the one the
// eval is already trying to measure.

import { compile, validate } from '../../src';
import {
  componentsUsedIn,
  formatComponents,
  formatList,
  type Manifest,
  type ManifestComponent,
  usedFooter,
} from '../../src/cli/components';
import type { ContractMode } from '../contract';

// One round of follow-up, requested by name. Without it the comparison is
// rigged: `list` never carries grammar and `--used` never carries a component
// the file lacks, so both would fail by construction rather than on merit.
// This is the same read-plus-follow-up shape contract.ts prices.
export const NEED_PREFIX = 'NEED:';

export const SYSTEM_PROMPT = `You edit HTMDX documents.

HTMDX is Markdown plus a fixed set of registered components. A component that is not registered, or whose body does not match its grammar, makes the document invalid.

You are given a component contract, a document, and one change to make.

Reply with exactly one of:

1. The complete edited document in a single \`\`\`mdx fence, and nothing else. Change only what the task asks for.
2. The single line \`${NEED_PREFIX} Name, Name\` and nothing else, when the contract does not give you the grammar of a component you need. You may do this once; the contracts come back and you then reply with the document.`;

export function buildRead(manifest: Manifest, mode: ContractMode, source: string): string {
  if (mode === 'manifest') {
    return JSON.stringify(manifest, null, 2);
  }
  if (mode === 'list') {
    return formatList(manifest.components, manifest.runtime);
  }
  const used = componentsUsedIn(manifest, source);
  return `${used.length ? formatComponents(used) : 'no components\n'}${usedFooter(manifest, used)}`;
}

export function buildPrompt(read: string, source: string, task: string, extra = ''): string {
  return [
    '## Component contract',
    '',
    read,
    '',
    '## Document',
    '',
    '```mdx',
    source,
    '```',
    '',
    ...(extra ? ['## Additional contracts', '', extra, ''] : []),
    '## Change',
    '',
    task,
    '',
  ].join('\n');
}

export function contractsFor(manifest: Manifest, names: string[]): ManifestComponent[] {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return manifest.components.filter((entry) => wanted.has(entry.name.toLowerCase()));
}

export type Reply = { need: string[] } | { source: string };

export function parseReply(text: string): Reply {
  const trimmed = text.trim();
  // A fence means the model answered, even if it also narrated a NEED it then
  // decided it could do without. Prose is not the deliverable; the document is.
  const fenced = extractFence(trimmed);
  if (fenced !== undefined) {
    return { source: fenced };
  }

  const need = trimmed.split('\n').find((line) => line.trim().startsWith(NEED_PREFIX));
  if (need) {
    return {
      need: need
        .trim()
        .slice(NEED_PREFIX.length)
        .split(',')
        .map((name) => name.trim().replace(/[^A-Za-z0-9]/g, ''))
        .filter(Boolean),
    };
  }

  return { source: trimmed };
}

// Outermost fence, so a document that itself contains a code block survives.
function extractFence(text: string): string | undefined {
  const open = text.indexOf('```');
  const close = text.lastIndexOf('```');
  if (open === -1 || close <= open) {
    return undefined;
  }
  const body = text.slice(open + 3, close);
  const newline = body.indexOf('\n');
  return newline === -1 ? body.trim() : body.slice(newline + 1);
}

export type Score = {
  compiles: boolean;
  errors: number;
  // What the validator actually said. A pass rate nobody can audit is a number,
  // not evidence — these are what make a failure checkable after the fact.
  messages: string[];
  // Every component the task called for is in the result.
  applied: boolean;
  // Nothing the document already carried was dropped on the way.
  preserved: boolean;
  pass: boolean;
};

export function scoreEdit(
  manifest: Manifest,
  before: string,
  after: string,
  needs: string[],
): Score {
  const present = new Set(componentsUsedIn(manifest, after).map((entry) => entry.name));
  const applied = needs.every((name) => present.has(name));
  const preserved = componentsUsedIn(manifest, before).every((entry) => present.has(entry.name));
  const errors = validate(after).filter((diagnostic) => diagnostic.severity === 'error');
  const compiles = compile(after).ok;

  return {
    compiles,
    errors: errors.length,
    messages: errors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    applied,
    preserved,
    pass: compiles && errors.length === 0 && applied && preserved,
  };
}
