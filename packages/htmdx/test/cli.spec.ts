import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, test } from 'vitest';

const run = promisify(execFile);
const CLI = resolve(import.meta.dirname, '../dist/cli.js');
const fixtures = mkdtempSync(join(tmpdir(), 'htmdx-cli-'));

function fixture(name: string, content: string): string {
  const path = join(fixtures, name);
  writeFileSync(path, content);
  return path;
}

type CliResult = { code: number; stdout: string; stderr: string };

async function cli(...args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await run(process.execPath, [CLI, ...args]);
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

const CLEAN = ['# Report', '', '<Callout>All good.</Callout>', ''].join('\n');
const BROKEN = ['# Report', '', '<Nope>unknown</Nope>', ''].join('\n');

beforeAll(async () => {
  // The bin is the artifact under test; a stale dist would test nothing.
  await run('yarn', ['build:library'], { cwd: resolve(import.meta.dirname, '..'), shell: true });
}, 300_000);

describe('htmdx lint', () => {
  test('exits 0 and says so for a clean source file', async () => {
    const result = await cli('lint', fixture('clean.htmdx', CLEAN));

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('no problems');
  });

  test('exits 1 and points at the failure for a broken source file', async () => {
    const result = await cli('lint', fixture('broken.htmdx', BROKEN));

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('3:1');
    expect(result.stdout).toContain('unknown-component');
  });

  test('emits machine-readable results with --format json', async () => {
    const result = await cli('lint', '--format', 'json', fixture('json.htmdx', BROKEN));

    const report = JSON.parse(result.stdout);
    expect(report.errorCount).toBe(1);
    expect(report.files[0].diagnostics[0]).toMatchObject({
      code: 'unknown-component',
      severity: 'error',
      line: 3,
      column: 1,
    });
  });

  test('extracts the source from an HTML artifact', async () => {
    const artifact = [
      '<!doctype html>',
      '<script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.5.1/dist/browser.js"></script>',
      '<script type="text/htmdx">',
      BROKEN,
      '</script>',
      '',
    ].join('\n');

    const result = await cli('lint', fixture('artifact.html', artifact));

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('unknown-component');
  });

  test('warns about an unpinned runtime and stays green without --strict', async () => {
    const artifact = [
      '<script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@latest/dist/browser.js"></script>',
      '<script type="text/htmdx">',
      CLEAN,
      '</script>',
      '',
    ].join('\n');
    const path = fixture('unpinned.html', artifact);

    const warned = await cli('lint', path);
    expect(warned.code).toBe(0);
    expect(warned.stdout).toContain('unpinned-runtime');

    const strict = await cli('lint', '--strict', path);
    expect(strict.code).toBe(1);
  });

  test('warns when the artifact pins a different runtime than the one linting it', async () => {
    const artifact = [
      '<script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@1.0.0/dist/browser.js"></script>',
      '<script type="text/htmdx">',
      CLEAN,
      '</script>',
      '',
    ].join('\n');

    const result = await cli('lint', '--format', 'json', fixture('mismatch.html', artifact));

    const report = JSON.parse(result.stdout);
    expect(report.files[0].diagnostics.map((d: { code: string }) => d.code)).toContain(
      'runtime-version-mismatch',
    );
  });

  // React remembers which nesting warnings it has already logged, in react-dom
  // module state that no API resets. Linting many files in one process
  // therefore reports each distinct violation once, on the first file that has
  // it. Locked here so the behavior is known rather than discovered.
  test('reports a repeated nesting violation once per process', async () => {
    const nested = '<Foldout title="t">\n<p>Outer <div>inner</div></p>\n</Foldout>\n';
    const first = fixture('nested-a.htmdx', nested);
    const second = fixture('nested-b.htmdx', nested);

    const together = await cli('lint', '--format', 'json', first, second);
    const report = JSON.parse(together.stdout);
    expect(report.warningCount).toBe(1);

    const alone = await cli('lint', '--format', 'json', second);
    expect(JSON.parse(alone.stdout).warningCount).toBe(1);
  });

  test('exits 2 when a file cannot be read', async () => {
    const result = await cli('lint', join(fixtures, 'does-not-exist.htmdx'));

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('does-not-exist.htmdx');
  });

  test('exits 2 with usage when no files are given', async () => {
    const result = await cli('lint');

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Usage');
  });
});
