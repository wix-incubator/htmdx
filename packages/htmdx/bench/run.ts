import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { compile } from '../src';
import { VERSION } from '../src/version';
import { applyEdit, deriveEditPairs, editCost, type EditPair, type EditTask } from './edits';
import * as decisionBrief from './scenarios/decision-brief/edits';
import * as executiveDecisionReport from './scenarios/executive-decision-report/edits';
import { wrapCompiled, wrapHtmdx } from './shell';
import { ALT_ENCODING, altTokens, ENCODING, measure, type Measure } from './tokenize';

const require = createRequire(join(process.cwd(), 'bench/run.ts'));
const tokenizerVersion: string = require('gpt-tokenizer/package.json').version;

// vitest rewrites import.meta.url under jsdom, so paths resolve from the
// package root; `yarn bench` always runs there.
const BENCH_DIR = join(process.cwd(), 'bench');

const SCENARIOS = [
  { id: 'decision-brief', title: decisionBrief.title, editTasks: decisionBrief.editTasks },
  {
    id: 'executive-decision-report',
    title: executiveDecisionReport.title,
    editTasks: executiveDecisionReport.editTasks,
  },
];

const FORMATS = ['htmdx', 'compiled', 'hand', 'jsx', 'md'] as const;
type FormatId = (typeof FORMATS)[number];

const FORMAT_LABELS: Record<FormatId, string> = {
  htmdx: 'htmdx source',
  compiled: 'compiled HTML (`compile()`)',
  hand: 'hand-written HTML + Tailwind',
  jsx: 'React/JSX source',
  md: 'plain markdown',
};

type EditResult = { id: string; description: string; cost: Measure | null };

type FormatResult = {
  format: FormatId;
  artifact: Measure;
  artifactAltTokens: number;
  payload: Measure | null;
  edits: EditResult[];
  editTotal: Measure | null;
};

type ScenarioResult = {
  id: string;
  title: string;
  formats: FormatResult[];
};

function fixture(scenarioId: string, file: string): string {
  return readFileSync(join(BENCH_DIR, 'scenarios', scenarioId, file), 'utf8');
}

function compileOrThrow(source: string, label: string): string {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(`${label}: compile failed: ${result.error}`);
  }
  return normalizeGeneratedIds(result.html);
}

// React useId values depend on how many roots rendered earlier in the
// process; renumber them by first appearance so compiled output is stable
// regardless of render order.
function normalizeGeneratedIds(html: string): string {
  const seen = new Map<string, string>();
  return html.replace(/_r_[0-9a-z]+_/g, (match) => {
    let replacement = seen.get(match);
    if (!replacement) {
      replacement = `_r_${seen.size}_`;
      seen.set(match, replacement);
    }
    return replacement;
  });
}

function sumCosts(edits: EditResult[]): Measure | null {
  const costs = edits.map((edit) => edit.cost).filter((cost): cost is Measure => cost !== null);
  if (costs.length === 0) {
    return null;
  }
  return costs.reduce((total, cost) => ({
    tokens: total.tokens + cost.tokens,
    chars: total.chars + cost.chars,
  }));
}

function buildScenario(scenario: (typeof SCENARIOS)[number]): ScenarioResult {
  const source = fixture(scenario.id, 'source.htmdx');
  const hand = fixture(scenario.id, 'hand.html');
  const jsx = fixture(scenario.id, 'artifact.jsx');
  const md = fixture(scenario.id, 'artifact.md');

  const compiledHtml = compileOrThrow(source, scenario.id);
  if (compileOrThrow(source, scenario.id) !== compiledHtml) {
    throw new Error(`${scenario.id}: compile() output is not deterministic`);
  }

  // Artifact = the complete file the agent emits (and later re-reads in
  // context). htmdx and compiled include the single-file HTML shell so the
  // headline comparison never credits htmdx for boilerplate someone else
  // provides. Payload = the content-only size where the shell is fixed
  // boilerplate a platform template could supply.
  const artifactTexts: Record<FormatId, string> = {
    htmdx: wrapHtmdx(source.trimEnd(), scenario.title),
    compiled: wrapCompiled(compiledHtml, scenario.title),
    hand,
    jsx,
    md,
  };
  const payloadTexts: Partial<Record<FormatId, string>> = {
    htmdx: source,
    compiled: compiledHtml,
  };

  const edits: Record<FormatId, EditResult[]> = {
    htmdx: [],
    compiled: [],
    hand: [],
    jsx: [],
    md: [],
  };
  for (const task of scenario.editTasks) {
    const label = `${scenario.id}/${task.id}`;
    const editedSource = applyEdit(source, task.htmdx, `${label}/htmdx`);
    const editedHtml = compileOrThrow(editedSource, `${label}/htmdx (edited)`);
    edits.htmdx.push(taskResult(task, editCost([task.htmdx])));

    const compiledPairs = deriveEditPairs(compiledHtml, editedHtml);
    replayEdits(compiledHtml, editedHtml, compiledPairs, `${label}/compiled`);
    edits.compiled.push(taskResult(task, editCost(compiledPairs)));

    edits.hand.push(taskResult(task, validatedCost(hand, task.hand, `${label}/hand`)));
    edits.jsx.push(taskResult(task, validatedCost(jsx, task.jsx, `${label}/jsx`)));
    edits.md.push(taskResult(task, validatedCost(md, task.md, `${label}/md`)));
  }

  return {
    id: scenario.id,
    title: scenario.title,
    formats: FORMATS.map((format) => {
      const payload = payloadTexts[format];
      return {
        format,
        artifact: measure(artifactTexts[format]),
        artifactAltTokens: altTokens(artifactTexts[format]),
        payload: payload === undefined ? null : measure(payload),
        edits: edits[format],
        editTotal: sumCosts(edits[format]),
      };
    }),
  };
}

function taskResult(task: EditTask, cost: Measure | null): EditResult {
  return { id: task.id, description: task.description, cost };
}

function validatedCost(text: string, edit: EditPair | null, label: string): Measure | null {
  if (edit === null) {
    return null;
  }
  applyEdit(text, edit, label);
  return editCost([edit]);
}

function replayEdits(before: string, after: string, pairs: EditPair[], label: string): void {
  let replayed = before;
  for (const pair of pairs) {
    replayed = applyEdit(replayed, pair, label);
  }
  if (replayed !== after) {
    throw new Error(`${label}: derived edit pairs do not reproduce the edited compiled HTML`);
  }
}

// What a self-contained JSX project must ship on top of the component module:
// shadcn/ui sources are copied into a repo, not imported from npm. Measured
// from this repo's own copies of the components the decision-brief uses.
const STANDALONE_JSX_DEPS = [
  'card.tsx',
  'badge.tsx',
  'button.tsx',
  'tabs.tsx',
  'accordion.tsx',
  'utils.ts',
];

function standaloneJsxDepsTokens(): number {
  return STANDALONE_JSX_DEPS.reduce(
    (total, file) =>
      total +
      measure(readFileSync(join(process.cwd(), 'src/components/shadcn', file), 'utf8')).tokens,
    0,
  );
}

function renderMarkdown(scenarios: ScenarioResult[]): string {
  const lines: string[] = [
    '# HTMDX Token-Efficiency Benchmark',
    '',
    'Generated by `yarn bench` (`bench/run.ts`). Do not edit by hand.',
    '',
    `- htmdx version: ${VERSION}`,
    `- tokenizer: gpt-tokenizer v${tokenizerVersion}, \`${ENCODING}\` encoding`,
    '',
    '## Metrics',
    '',
    '- **Artifact** — tokens of the complete file the agent emits and later',
    '  re-reads in context. htmdx and compiled HTML are measured inside the',
    '  single-file HTML shell used by `examples/decision-brief.html`, so the',
    '  headline ratio never credits htmdx for boilerplate someone else provides.',
    '  The JSX row is only the component module (see limitations).',
    '- **Payload** — content-only size for the formats whose shell is fixed',
    '  boilerplate a platform template could supply: raw htmdx source and raw',
    '  compiled markup. Blank where content and boilerplate are inseparable.',
    '- **Edit** — tokens of Edit-tool `oldString` + `newString` pairs summed over',
    "  the scenario's three edit tasks, using the smallest natural unique span in",
    '  each format. Compiled-HTML pairs are machine-derived by diffing',
    '  `compile(before)` against `compile(after)` and expanding context until each',
    '  `oldString` is unique.',
    '',
  ];

  for (const scenario of scenarios) {
    const htmdx = scenario.formats.find((format) => format.format === 'htmdx');
    if (!htmdx) {
      throw new Error(`${scenario.id}: missing htmdx row`);
    }
    lines.push(`## Scenario: ${scenario.title}`, '');
    lines.push(
      '| Format | Artifact tokens | vs htmdx | Payload tokens | Edit tokens (3 tasks) | Artifact chars |',
      '| --- | ---: | ---: | ---: | ---: | ---: |',
    );
    for (const row of scenario.formats) {
      const ratio = (row.artifact.tokens / htmdx.artifact.tokens).toFixed(2);
      lines.push(
        `| ${FORMAT_LABELS[row.format]} | ${row.artifact.tokens} | x${ratio} | ${
          row.payload ? row.payload.tokens : '—'
        } | ${row.editTotal ? row.editTotal.tokens : 'n/a'} | ${row.artifact.chars} |`,
      );
    }
    lines.push('', '### Edit-task token cost', '');
    lines.push(
      `| Task | ${FORMATS.map((format) => format).join(' | ')} |`,
      `| --- | ${FORMATS.map(() => '---:').join(' | ')} |`,
    );
    const taskCount = scenario.formats[0].edits.length;
    for (let index = 0; index < taskCount; index += 1) {
      const cells = scenario.formats.map((row) => {
        const cost = row.edits[index].cost;
        return cost ? String(cost.tokens) : 'n/a';
      });
      lines.push(`| ${scenario.formats[0].edits[index].id} | ${cells.join(' | ')} |`);
    }
    lines.push('');
  }

  lines.push('## Tokenizer sensitivity', '');
  lines.push(
    'Markup tokenizes differently across vocabularies, so the artifact ratios',
    `are computed under both \`${ENCODING}\` and \`${ALT_ENCODING}\`:`,
    '',
    `| Format | ${scenarios
      .map((scenario) => `${scenario.id} ${ENCODING} | ${scenario.id} ${ALT_ENCODING}`)
      .join(' | ')} |`,
    `| --- | ${scenarios.map(() => '---: | ---:').join(' | ')} |`,
  );
  for (const format of FORMATS) {
    const cells = scenarios.flatMap((scenario) => {
      const htmdx = scenario.formats.find((row) => row.format === 'htmdx');
      const row = scenario.formats.find((entry) => entry.format === format);
      if (!htmdx || !row) {
        throw new Error(`${scenario.id}: missing ${format} row`);
      }
      return [
        `x${(row.artifact.tokens / htmdx.artifact.tokens).toFixed(2)}`,
        `x${(row.artifactAltTokens / htmdx.artifactAltTokens).toFixed(2)}`,
      ];
    });
    lines.push(`| ${FORMAT_LABELS[format]} | ${cells.join(' | ')} |`);
  }
  lines.push('');

  lines.push(
    '## Methodology and limitations',
    '',
    '- The hand-written HTML, JSX, and markdown fixtures are author-judgment',
    '  equivalents of the same content; a different author would produce somewhat',
    '  different sizes. They aim for idiomatic, not adversarially terse or verbose.',
    '- As a check against inflating those baselines, the hand-written HTML and',
    '  JSX fixtures were compared with versions independently authored by another',
    '  agent from the same content spec, blind to this benchmark; the committed',
    '  fixtures measured equal or smaller.',
    '- Plain markdown is not feature-equivalent (no tabs, accordions, badges, or',
    '  buttons); it is included as a lower bound on content size.',
    '- The JSX baseline counts only the component module. Running it needs a',
    '  hosting runtime the agent never emits (bundler, React, installed shadcn/ui',
    '  components) — the charitable assumption that the platform provides it, as',
    '  Claude artifacts do. htmdx carries its own shell: its artifact figure',
    '  includes the full single-file HTML wrapper; the runtime is one CDN script.',
    '- Without a hosting platform, JSX stops being one file: shadcn/ui components',
    '  are copied into the project, not imported from npm. The five components the',
    `  decision-brief uses (card, badge, button, tabs, accordion, plus utils)`,
    `  measure ${standaloneJsxDepsTokens()} tokens in this repo's copies alone, before any`,
    '  vite/Tailwind/entry scaffolding — putting a self-contained JSX artifact in',
    '  compiled-HTML territory, and it still needs an install and build to view.',
    '- Compiled HTML is a static snapshot: collapsed accordion panels and inactive',
    '  tab panels are not present in the output, which understates its artifact',
    '  size and edit cost relative to a fully hydrated equivalent.',
    '- `o200k_base` approximates model tokenizers; absolute counts differ across',
    '  models, ratios are the signal. Character counts are reported alongside and',
    '  the tokenizer-sensitivity table cross-checks ratios under `cl100k_base`.',
    '- "n/a" marks an edit that is not expressible in that format.',
    '- This benchmark measures size and mechanical edit cost only. Established',
    '  format benchmarks pair size with a usability dimension: TOON measures',
    '  per-model retrieval accuracy alongside token counts, and aider measures',
    '  how often models emit well-formed edits per edit format. Whether models',
    '  author and edit htmdx more reliably than HTML/JSX is not measured here;',
    '  it is the natural follow-up and would require live model calls.',
    '',
  );

  return lines.join('\n');
}

test('token-efficiency benchmark', () => {
  const scenarios = SCENARIOS.map(buildScenario);

  const results = {
    metadata: {
      htmdxVersion: VERSION,
      encoding: ENCODING,
      gptTokenizerVersion: tokenizerVersion,
    },
    scenarios,
  };

  writeFileSync(join(BENCH_DIR, 'RESULTS.md'), renderMarkdown(scenarios));
  writeFileSync(join(BENCH_DIR, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);

  expect(scenarios).toHaveLength(SCENARIOS.length);
  for (const scenario of scenarios) {
    expect(scenario.formats).toHaveLength(FORMATS.length);
  }
});
