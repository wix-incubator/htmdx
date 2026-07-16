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
import { ENCODING, measure, type Measure } from './tokenize';

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
  authoring: Measure;
  read: Measure;
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

  const texts: Record<FormatId, string> = { htmdx: source, compiled: compiledHtml, hand, jsx, md };
  const readTexts: Record<FormatId, string> = {
    htmdx: wrapHtmdx(source.trimEnd(), scenario.title),
    compiled: wrapCompiled(compiledHtml, scenario.title),
    hand,
    jsx,
    md,
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
    formats: FORMATS.map((format) => ({
      format,
      authoring: measure(texts[format]),
      read: measure(readTexts[format]),
      edits: edits[format],
      editTotal: sumCosts(edits[format]),
    })),
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
    '- **Authoring** — tokens the agent emits to produce the artifact content:',
    '  htmdx source, `compile()` HTML output, the full hand-written HTML file,',
    '  the JSX module, or the markdown file.',
    '- **Read** — tokens of the complete artifact file as it would sit in context.',
    '  htmdx and compiled HTML are measured inside the single-file HTML shell used',
    '  by `examples/decision-brief.html`; the other formats are already whole files.',
    '- **Edit** — tokens of Edit-tool `oldString` + `newString` pairs summed over the',
    "  scenario's three edit tasks. Compiled-HTML pairs are machine-derived by",
    '  diffing `compile(before)` against `compile(after)` and expanding context',
    '  until each `oldString` is unique.',
    '',
  ];

  for (const scenario of scenarios) {
    const htmdx = scenario.formats.find((format) => format.format === 'htmdx');
    if (!htmdx) {
      throw new Error(`${scenario.id}: missing htmdx row`);
    }
    lines.push(`## Scenario: ${scenario.title}`, '');
    lines.push(
      '| Format | Authoring tokens | Read tokens | Edit tokens (3 tasks) | Authoring chars | Authoring vs htmdx |',
      '| --- | ---: | ---: | ---: | ---: | ---: |',
    );
    for (const row of scenario.formats) {
      const ratio = (row.authoring.tokens / htmdx.authoring.tokens).toFixed(2);
      lines.push(
        `| ${FORMAT_LABELS[row.format]} | ${row.authoring.tokens} | ${row.read.tokens} | ${
          row.editTotal ? row.editTotal.tokens : 'n/a'
        } | ${row.authoring.chars} | x${ratio} |`,
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

  lines.push(
    '## Methodology and limitations',
    '',
    '- The hand-written HTML, JSX, and markdown fixtures are author-judgment',
    '  equivalents of the same content; a different author would produce somewhat',
    '  different sizes. They aim for idiomatic, not adversarially terse or verbose.',
    '- Plain markdown is not feature-equivalent (no tabs, accordions, badges, or',
    '  buttons); it is included as a lower bound on content size.',
    '- The JSX baseline counts only the component module. Running it needs a',
    '  hosting runtime the agent never emits (bundler, React, installed shadcn/ui',
    '  components) — the charitable assumption that the platform provides it, as',
    '  Claude artifacts do. htmdx carries its own shell: the read metric includes',
    '  the full single-file HTML wrapper, and the runtime is one CDN script tag.',
    '- Compiled HTML is a static snapshot: collapsed accordion panels and inactive',
    '  tab panels are not present in the output, which understates its authoring',
    '  size and edit cost relative to a fully hydrated equivalent.',
    '- `o200k_base` approximates model tokenizers; absolute counts differ across',
    '  models, ratios are the signal. Character counts are reported alongside.',
    '- "n/a" marks an edit that is not expressible in that format.',
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
