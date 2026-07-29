// Two adapters over CLIs that are already authenticated on the machine running
// the eval, so nothing here holds a key or adds an SDK dependency.
//
// Both are told to do nothing but answer: no tools, no file access, no session
// on disk. What is left of each harness's own system prompt still costs input
// tokens, but it is identical across the three contract-read arms, so it moves
// every arm equally and cancels out of the comparison. The reported token
// counts are therefore useful against each other and not as absolute prices.

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type ModelReply = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  // Only claude reports a price; codex reports usage alone.
  costUsd: number | null;
};

export type Runner = {
  id: string;
  model: string;
  run(system: string, prompt: string): Promise<ModelReply>;
};

const TIMEOUT_MS = 240_000;
// A manifest read is ~55KB of prompt; the default 1MB buffer is not enough
// headroom once a reply carries the whole document back.
const MAX_BUFFER = 32 * 1024 * 1024;

function exec(file: string, args: string[], stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${file} failed: ${error.message}\n${stderr.slice(0, 500)}`));
          return;
        }
        resolve(stdout);
      },
    );
    child.stdin?.end(stdin);
  });
}

// Everything the Claude Code harness would otherwise inject — project
// instructions, MCP servers, dynamic sections — is contamination the eval did
// not ask for and cannot hold constant across machines.
const CLAUDE_ISOLATION = [
  '--exclude-dynamic-system-prompt-sections',
  '--setting-sources',
  '',
  '--strict-mcp-config',
  '--no-session-persistence',
  '--disallowed-tools',
  'Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,Task,TodoWrite,NotebookEdit',
];

export function claudeRunner(model: string): Runner {
  return {
    id: 'claude',
    model,
    async run(system, prompt) {
      const stdout = await exec(
        'claude',
        [
          '-p',
          '--output-format',
          'json',
          '--model',
          model,
          '--system-prompt',
          system,
          ...CLAUDE_ISOLATION,
        ],
        prompt,
      );
      const payload = JSON.parse(stdout) as {
        result?: string;
        is_error?: boolean;
        total_cost_usd?: number;
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        };
      };
      if (payload.is_error) {
        throw new Error(`claude reported an error: ${String(payload.result).slice(0, 300)}`);
      }
      const usage = payload.usage ?? {};
      return {
        text: payload.result ?? '',
        inputTokens:
          (usage.input_tokens ?? 0) +
          (usage.cache_creation_input_tokens ?? 0) +
          (usage.cache_read_input_tokens ?? 0),
        outputTokens: usage.output_tokens ?? 0,
        costUsd: payload.total_cost_usd ?? null,
      };
    },
  };
}

export const CODEX_DEFAULT_MODEL = 'default';

export function codexRunner(model: string): Runner {
  return {
    id: 'codex',
    model,
    async run(system, prompt) {
      // codex exec has no system-prompt flag, so the instructions ride in the
      // message. Its own harness prompt stays, which is why codex numbers are
      // comparable within the codex run and not against the claude one.
      const directory = await mkdtemp(join(tmpdir(), 'htmdx-eval-'));
      const last = join(directory, 'reply.txt');
      try {
        const stdout = await exec(
          'codex',
          [
            'exec',
            '--ephemeral',
            '--ignore-user-config',
            '--skip-git-repo-check',
            '--sandbox',
            'read-only',
            // An empty model means "whatever this install defaults to"; a
            // ChatGPT-plan account rejects every name it is asked for.
            ...(model === CODEX_DEFAULT_MODEL ? [] : ['--model', model]),
            '--json',
            '--output-last-message',
            last,
            '-',
          ],
          `${system}\n\n---\n\n${prompt}`,
        );
        // codex exec reports a refused model or a failed turn in its event
        // stream and still exits 0, so a silent empty reply would otherwise be
        // scored as a model that produced nothing.
        const failure = codexFailure(stdout);
        if (failure) {
          throw new Error(`codex turn failed: ${failure.slice(0, 300)}`);
        }
        return {
          text: await readFile(last, 'utf8'),
          ...codexUsage(stdout),
          costUsd: null,
        };
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  };
}

export function codexFailure(stdout: string): string | undefined {
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('{')) {
      continue;
    }
    const event = JSON.parse(line) as {
      type?: string;
      message?: string;
      error?: { message?: string };
    };
    if (event.type === 'turn.failed') {
      return event.error?.message ?? 'no reason given';
    }
    if (event.type === 'error') {
      return event.message ?? 'no reason given';
    }
  }
  return undefined;
}

function codexUsage(stdout: string): { inputTokens: number; outputTokens: number } {
  for (const line of stdout.split('\n').toReversed()) {
    if (!line.startsWith('{')) {
      continue;
    }
    const event = JSON.parse(line) as {
      type?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    if (event.type === 'turn.completed' && event.usage) {
      return {
        inputTokens: event.usage.input_tokens ?? 0,
        outputTokens: event.usage.output_tokens ?? 0,
      };
    }
  }
  return { inputTokens: 0, outputTokens: 0 };
}

export function createRunner(id: string, model: string): Runner {
  if (id === 'claude') {
    return claudeRunner(model);
  }
  if (id === 'codex') {
    return codexRunner(model);
  }
  throw new Error(`unknown runner "${id}"; expected claude or codex`);
}
