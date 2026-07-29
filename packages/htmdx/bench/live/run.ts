// yarn eval — does the contract read change whether a model gets the edit right?
//
// contract.ts prices the three reads. This spends real money to find out
// whether the cheap one is also good enough, which is the claim
// adr/answer-the-component-contract-from-the-cli.md cannot make on token counts
// alone.
//
// Opt-in on purpose: it is non-deterministic, it costs money, and it depends on
// a CLI being authenticated on the machine. It is not in `yarn test` and not in
// CI. Run it with:
//
//   HTMDX_LIVE_EVAL=1 yarn eval
//   HTMDX_LIVE_EVAL=1 HTMDX_EVAL_RUNNER=codex HTMDX_EVAL_SAMPLES=5 yarn eval

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import type { Manifest } from '../../src/cli/components';
import { createComponentManifest } from '../../src/component-manifest';
import { CONTRACT_MODE_LABELS, CONTRACT_MODES, needsOf, type ContractMode } from '../contract';
import * as decisionBrief from '../scenarios/decision-brief/edits';
import * as executiveDecisionReport from '../scenarios/executive-decision-report/edits';
import { CODEX_DEFAULT_MODEL, createRunner, type Runner } from './models';
import {
  buildPrompt,
  buildRead,
  contractsFor,
  parseReply,
  scoreEdit,
  SYSTEM_PROMPT,
  type Score,
} from './protocol';

const BENCH_DIR = join(process.cwd(), 'bench');
const LIVE = process.env.HTMDX_LIVE_EVAL === '1';
const RUNNER_ID = process.env.HTMDX_EVAL_RUNNER ?? 'claude';
const MODEL =
  process.env.HTMDX_EVAL_MODEL ??
  (RUNNER_ID === 'codex' ? CODEX_DEFAULT_MODEL : 'claude-haiku-4-5-20251001');
const SAMPLES = Number(process.env.HTMDX_EVAL_SAMPLES ?? 3);
const CONCURRENCY = Number(process.env.HTMDX_EVAL_CONCURRENCY ?? 4);
// Narrows the grid to task ids containing this string — for checking the wiring
// on one cell before paying for the rest. A filtered run is not a result.
const ONLY = process.env.HTMDX_EVAL_ONLY ?? '';

const MANIFEST = createComponentManifest() as Manifest;

const SCENARIOS = [
  {
    id: 'decision-brief',
    title: decisionBrief.title,
    editTasks: decisionBrief.editTasks,
    // The case that separates the modes: --used cannot have seen a component
    // the file does not carry, so it has to ask or invent. The task names the
    // component on purpose — discovery is a separate question, already settled
    // deterministically by contract.ts, and leaving the name out lets a model
    // answer with something it already had and never exercise the read.
    introduces: {
      id: 'add-risk-table',
      description: 'Add a risk tier breakdown using the RiskTable component',
      name: 'RiskTable',
    },
  },
  {
    id: 'executive-decision-report',
    title: executiveDecisionReport.title,
    editTasks: executiveDecisionReport.editTasks,
    introduces: {
      id: 'add-data-table',
      description: 'Add a segment breakdown table using the DataTable component',
      name: 'DataTable',
    },
  },
];

type Task = { id: string; description: string; needs: string[]; introduces: boolean };

function tasksFor(scenario: (typeof SCENARIOS)[number]): Task[] {
  return [
    ...scenario.editTasks.map((task) => ({
      id: task.id,
      description: task.description,
      needs: needsOf(MANIFEST, task.htmdx.newString),
      introduces: false,
    })),
    {
      id: scenario.introduces.id,
      description: scenario.introduces.description,
      needs: [scenario.introduces.name],
      introduces: true,
    },
  ];
}

type Sample = {
  scenario: string;
  task: string;
  introduces: boolean;
  mode: ContractMode;
  sample: number;
  askedFor: string[];
  rounds: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  score: Score | null;
  // The document the model produced, kept so a failed cell can be re-checked
  // by hand instead of taken on trust.
  produced: string | null;
  error: string | null;
};

async function runSample(
  runner: Runner,
  source: string,
  mode: ContractMode,
  task: Task,
  sample: number,
  scenario: string,
): Promise<Sample> {
  const base: Sample = {
    scenario,
    task: task.id,
    introduces: task.introduces,
    mode,
    sample,
    askedFor: [],
    rounds: 1,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    score: null,
    produced: null,
    error: null,
  };

  try {
    const read = buildRead(MANIFEST, mode, source);
    let reply = await runner.run(SYSTEM_PROMPT, buildPrompt(read, source, task.description));
    base.inputTokens += reply.inputTokens;
    base.outputTokens += reply.outputTokens;
    base.costUsd = add(base.costUsd, reply.costUsd);

    let parsed = parseReply(reply.text);
    if ('need' in parsed) {
      base.askedFor = parsed.need;
      base.rounds = 2;
      const extra = contractsFor(MANIFEST, parsed.need)
        .map((entry) => `${entry.name}\n\n${entry.purpose}\n\nexample:\n${entry.example}\n`)
        .join('\n');
      reply = await runner.run(
        SYSTEM_PROMPT,
        buildPrompt(read, source, task.description, extra || 'no such component'),
      );
      base.inputTokens += reply.inputTokens;
      base.outputTokens += reply.outputTokens;
      base.costUsd = add(base.costUsd, reply.costUsd);
      parsed = parseReply(reply.text);
    }

    // A second NEED after the follow-up already came back is a non-answer, and
    // scoring it as an empty document would flatter it.
    if ('source' in parsed) {
      base.score = scoreEdit(MANIFEST, source, parsed.source, task.needs);
      // Only failures are worth keeping: a passing document was checked by the
      // validator, and storing all 72 puts a third of a megabyte in the repo.
      base.produced = base.score.pass ? null : parsed.source;
    } else {
      base.score = {
        compiles: false,
        errors: 0,
        messages: ['asked for contracts again instead of answering'],
        applied: false,
        preserved: false,
        pass: false,
      };
    }
  } catch (error) {
    base.error = (error as Error).message;
  }

  return base;
}

function add(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : left + right;
}

async function pool<T>(jobs: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = Array.from({ length: jobs.length });
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, jobs.length) }, async () => {
      while (next < jobs.length) {
        const index = next;
        next += 1;
        results[index] = await jobs[index]();
      }
    }),
  );
  return results;
}

test.skipIf(!LIVE)('live contract-read eval', async () => {
  const runner = createRunner(RUNNER_ID, MODEL);
  const jobs: (() => Promise<Sample>)[] = [];

  for (const scenario of SCENARIOS) {
    const source = readFileSync(join(BENCH_DIR, 'scenarios', scenario.id, 'source.htmdx'), 'utf8');
    for (const task of tasksFor(scenario).filter((entry) => entry.id.includes(ONLY))) {
      for (const mode of CONTRACT_MODES) {
        for (let sample = 0; sample < SAMPLES; sample += 1) {
          jobs.push(() => runSample(runner, source, mode, task, sample, scenario.id));
        }
      }
    }
  }

  process.stdout.write(
    `running ${jobs.length} calls: ${runner.id}/${runner.model}, ${SAMPLES} sample(s) per cell\n`,
  );
  const samples = await pool(jobs, CONCURRENCY);

  const meta = {
    runner: runner.id,
    model: runner.model,
    samples: SAMPLES,
    generated: new Date().toISOString(),
  };
  // Named per runner so a second model is a cross-check that lands beside the
  // first rather than an overwrite of it.
  writeFileSync(
    join(BENCH_DIR, 'live', `results-${runner.id}.json`),
    `${JSON.stringify({ ...meta, results: samples }, null, 2)}\n`,
  );
  writeFileSync(join(BENCH_DIR, 'live', `RESULTS-${runner.id}.md`), report(meta, samples));

  // The eval is allowed to find that the modes tie. It is not allowed to
  // report a tie because half the calls fell over.
  const failed = samples.filter((sample) => sample.error);
  expect(failed.map((sample) => sample.error).slice(0, 3)).toEqual([]);
  expect(samples.length).toBe(
    ONLY ? samples.length : SCENARIOS.length * 4 * CONTRACT_MODES.length * SAMPLES,
  );
});

type Meta = { runner: string; model: string; samples: number; generated: string };

function report(meta: Meta, samples: Sample[]): string {
  const lines = [
    '# Live contract-read eval',
    '',
    `Runner \`${meta.runner}\`, model \`${meta.model}\`, ${meta.samples} sample(s) per cell,`,
    `${samples.length} calls. Generated by \`HTMDX_LIVE_EVAL=1 yarn eval\`; not reproducible`,
    'run to run, and not part of `yarn test` or CI.',
    '',
    'Each cell gives the model one contract read, the artifact source, and one',
    'change to make. It may ask once for named contracts it was not given. The',
    "result is scored by this repo's own validator — it passes when the document",
    'compiles, lints clean, contains the components the change called for, and',
    'still contains everything it started with. No model judges another model.',
    '',
    '## By contract read',
    '',
    '| Read | Pass | Asked for more | Input tokens (mean) | Cost (mean) |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];

  for (const mode of CONTRACT_MODES) {
    const rows = samples.filter((sample) => sample.mode === mode);
    lines.push(
      `| ${CONTRACT_MODE_LABELS[mode]} | ${rate(rows)} | ${share(rows, (row) => row.rounds === 2)} | ${mean(rows, (row) => row.inputTokens)} | ${cost(rows)} |`,
    );
  }

  lines.push(
    '',
    '## The case that separates them',
    '',
    "Three of each scenario's four changes reuse a component the artifact already",
    'carries, where every read has the contract. The fourth introduces one it does',
    'not, which is exactly what `--used` cannot have seen.',
    '',
    '| Read | Reuses a component in the file | Introduces a new one |',
    '| --- | ---: | ---: |',
  );

  for (const mode of CONTRACT_MODES) {
    const rows = samples.filter((sample) => sample.mode === mode);
    lines.push(
      `| ${CONTRACT_MODE_LABELS[mode]} | ${rate(rows.filter((row) => !row.introduces))} | ${rate(rows.filter((row) => row.introduces))} |`,
    );
  }

  lines.push(
    '',
    '## Every cell',
    '',
    '| Scenario | Change | Read | Pass | Rounds | Input tokens |',
    '| --- | --- | --- | ---: | ---: | ---: |',
  );

  for (const scenario of SCENARIOS) {
    for (const task of tasksFor(scenario)) {
      for (const mode of CONTRACT_MODES) {
        const rows = samples.filter(
          (sample) =>
            sample.scenario === scenario.id && sample.task === task.id && sample.mode === mode,
        );
        lines.push(
          `| ${scenario.id} | ${task.id} | ${CONTRACT_MODE_LABELS[mode]} | ${rate(rows)} | ${mean(rows, (row) => row.rounds)} | ${mean(rows, (row) => row.inputTokens)} |`,
        );
      }
    }
  }

  // A cell that never reached a model is not a passing cell and not a failing
  // one; leaving it out of both tables is how a broken run reads as a clean one.
  const errored = samples.filter((sample) => sample.error);
  if (errored.length > 0) {
    lines.push(
      '',
      '## Calls that did not complete',
      '',
      `${errored.length} of ${samples.length}. Every rate above is out of the full`,
      'cell count, so these count against the read they belong to.',
      '',
      '| Scenario | Change | Read | Error |',
      '| --- | --- | --- | --- |',
    );
    for (const sample of errored) {
      lines.push(
        `| ${sample.scenario} | ${sample.task} | ${CONTRACT_MODE_LABELS[sample.mode]} | ${(sample.error ?? '').split('\n')[0].slice(0, 120)} |`,
      );
    }
  }

  const failures = samples.filter((sample) => sample.score && !sample.score.pass);
  lines.push(
    '',
    '## What failed',
    '',
    failures.length === 0
      ? 'No completed call produced an invalid document.'
      : '| Scenario | Change | Read | Compiles | Lint errors | Applied | Preserved | First diagnostic |',
  );
  if (failures.length > 0) {
    lines.push('| --- | --- | --- | :-: | ---: | :-: | :-: | --- |');
    for (const sample of failures) {
      const score = sample.score as Score;
      lines.push(
        `| ${sample.scenario} | ${sample.task} | ${CONTRACT_MODE_LABELS[sample.mode]} | ${mark(score.compiles)} | ${score.errors} | ${mark(score.applied)} | ${mark(score.preserved)} | ${score.messages[0] ?? '—'} |`,
      );
    }
  }

  lines.push(
    '',
    '## What this does not measure',
    '',
    `- ${meta.samples} sample(s) per cell. A one-cell difference is noise; read the`,
    '  totals per read, not individual rows.',
    '- One model. A stronger one knows more grammar without being told, which',
    '  flatters the cheap reads; a weaker one flatters the manifest.',
    '- Single edit, no repository. A real agent can run `htmdx lint` and try again,',
    '  so these are first-attempt rates, not the rate an agent loop achieves.',
    '- Input-token counts include whichever harness prompt the CLI injects. It is',
    '  the same for all three reads, so the columns compare to each other but not',
    '  to the numbers in `bench/RESULTS.md`.',
  );

  return `${lines.join('\n')}\n`;
}

function rate(rows: Sample[]): string {
  const passed = rows.filter((row) => row.score?.pass).length;
  return rows.length === 0 ? '—' : `${passed}/${rows.length}`;
}

function share(rows: Sample[], predicate: (row: Sample) => boolean): string {
  return rows.length === 0 ? '—' : `${rows.filter(predicate).length}/${rows.length}`;
}

function mean(rows: Sample[], pick: (row: Sample) => number): string {
  if (rows.length === 0) {
    return '—';
  }
  const total = rows.reduce((sum, row) => sum + pick(row), 0);
  const value = total / rows.length;
  return value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(1);
}

function cost(rows: Sample[]): string {
  const priced = rows.filter((row) => row.costUsd !== null);
  if (priced.length === 0) {
    return 'n/a';
  }
  const total = priced.reduce((sum, row) => sum + (row.costUsd ?? 0), 0);
  return `$${(total / priced.length).toFixed(4)}`;
}

function mark(value: boolean): string {
  return value ? '✓' : '✗';
}
