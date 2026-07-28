import { execFile } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, test } from 'vitest';
import { SKILL_TOPICS } from '../src/cli/skill';

const run = promisify(execFile);
const packageDir = resolve(import.meta.dirname, '..');
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

describe('htmdx validate', () => {
  test('is an alias for lint', async () => {
    const file = fixture('alias.htmdx', BROKEN);
    const linted = await cli('lint', '--format', 'json', file);
    const validated = await cli('validate', '--format', 'json', file);

    expect(validated.code).toBe(linted.code);
    expect(validated.stdout).toBe(linted.stdout);
  });
});

describe('htmdx compile', () => {
  test('prints the static HTML snapshot of a source file', async () => {
    const result = await cli('compile', fixture('compile-clean.htmdx', CLEAN));

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('data-htmdx-component="Callout"');
    expect(result.stdout).toContain('All good.');
  });

  test('compiles the embedded source of an HTML artifact', async () => {
    const artifact = [
      '<!doctype html>',
      '<html><body>',
      '<script type="text/htmdx">',
      CLEAN,
      '</script>',
      '</body></html>',
      '',
    ].join('\n');
    const result = await cli('compile', fixture('compile-artifact.html', artifact));

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('data-htmdx-component="Callout"');
  });

  test('writes to a file with --out', async () => {
    const out = join(fixtures, 'out.html');
    const result = await cli('compile', fixture('compile-out.htmdx', CLEAN), '--out', out);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(readFileSync(out, 'utf8')).toContain('data-htmdx-component="Callout"');
  });

  test('honors --layout', async () => {
    const file = fixture('compile-layout.htmdx', CLEAN);
    const blank = await cli('compile', file, '--layout', 'blank');
    const standard = await cli('compile', file);

    expect(blank.code).toBe(0);
    expect(blank.stdout).not.toBe(standard.stdout);
    expect(blank.stdout).not.toContain('htmdx-hero');
  });

  test('exits 1 with the reason when the source does not compile', async () => {
    const result = await cli('compile', fixture('compile-broken.htmdx', BROKEN));

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Nope');
  });

  test('exits 2 when no file is given', async () => {
    const result = await cli('compile');

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Usage');
  });
});

describe('htmdx components', () => {
  test('lists the catalog grouped by source', async () => {
    const result = await cli('components');

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/\d+ components in @wix\/htmdx@/);
    expect(result.stdout).toContain('built-in');
    expect(result.stdout).toContain('shadcn');
    expect(result.stdout).toContain('Callout');
  });

  test('describes one component with its props and example', async () => {
    const result = await cli('components', 'Foldout');

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('body: htmdx');
    expect(result.stdout).toContain('title: string');
    expect(result.stdout).toContain('<Foldout');
  });

  test('matches the name case-insensitively', async () => {
    const result = await cli('components', 'callout');

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Callout');
  });

  test('emits the raw manifest entry as JSON', async () => {
    const result = await cli('components', 'Callout', '--format', 'json');

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ name: 'Callout', source: 'built-in' });
  });

  test('emits the whole manifest as JSON when no name is given', async () => {
    const result = await cli('components', '--format', 'json');

    expect(result.code).toBe(0);
    const manifest = JSON.parse(result.stdout);
    expect(manifest.format).toBe('htmdx@2');
    expect(manifest.components.length).toBeGreaterThan(0);
  });

  test('suggests a near match for a typo', async () => {
    const result = await cli('components', 'Calout');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Callout');
  });

  test('exits 1 for a name with nothing close', async () => {
    const result = await cli('components', 'Zzzzzzzz');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown component');
  });

  test('describes several named components in one call', async () => {
    const result = await cli('components', 'Callout', 'Foldout');

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('<Callout');
    expect(result.stdout).toContain('<Foldout');
  });

  test('emits an array for several names and a bare entry for one', async () => {
    const many = await cli('components', 'Callout', 'Foldout', '--format', 'json');
    const one = await cli('components', 'Callout', '--format', 'json');

    expect(JSON.parse(many.stdout).map((entry: { name: string }) => entry.name)).toEqual([
      'Callout',
      'Foldout',
    ]);
    expect(Array.isArray(JSON.parse(one.stdout))).toBe(false);
  });

  test('fails the whole call when one of several names is unknown', async () => {
    const result = await cli('components', 'Callout', 'Zzzzzzzz');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown component');
  });

  test('--used describes only what an artifact contains', async () => {
    const artifact = fixture(
      'used.html',
      [
        '<!doctype html>',
        '<script type="text/htmdx">',
        '# Report',
        '',
        '<Callout>Ship it.</Callout>',
        '</script>',
      ].join('\n'),
    );
    const result = await cli('components', '--used', artifact);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Callout');
    expect(result.stdout).not.toContain('Foldout');
  });

  test('--used reads a bare source file too', async () => {
    const result = await cli('components', '--used', fixture('used.htmdx', CLEAN));

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Callout');
  });

  test('--used answers for source that does not compile', async () => {
    const broken = fixture('used-broken.htmdx', '<Callout>Unclosed\n\n<Nope>unknown</Nope>\n');
    const result = await cli('components', '--used', broken);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Callout');
  });

  test('--used says so when an artifact uses no components', async () => {
    const result = await cli('components', '--used', fixture('used-plain.htmdx', '# Just prose\n'));

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('no components');
  });

  test('--used exits 2 for a file it cannot read', async () => {
    const result = await cli('components', '--used', join(fixtures, 'missing.html'));

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('cannot read');
  });
});

describe('htmdx skill', () => {
  test('prints the authoring topic by default', async () => {
    const result = await cli('skill');

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('# HTMDX authoring');
  });

  test('lists the topics with --list', async () => {
    const result = await cli('skill', '--list');

    expect(result.code).toBe(0);
    for (const topic of ['authoring', 'components', 'integration', 'starter']) {
      expect(result.stdout).toContain(topic);
    }
  });

  test('prints a named topic', async () => {
    const result = await cli('skill', 'components');

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('# Component grammar');
  });

  test('leaves the release and formatter bookkeeping out of the output', async () => {
    const result = await cli('skill', 'components');

    expect(result.stdout).not.toContain('x-release-please');
    expect(result.stdout).not.toMatch(/^<!-- prettier-ignore -->$/m);
    expect(result.stdout).toContain('```mdx');
  });

  test('writes a usable artifact with the starter topic', async () => {
    const starter = await cli('skill', 'starter');
    const linted = await cli('lint', fixture('starter.html', starter.stdout), '--strict');

    expect(starter.stdout).toContain('<script type="text/htmdx"');
    expect(linted.code).toBe(0);
  });

  test('concatenates every topic with --full', async () => {
    const result = await cli('skill', '--full');

    expect(result.stdout).toContain('<!-- BEGIN authoring.md -->');
    expect(result.stdout).toContain('<!-- END artifact.html -->');
  });

  test('reports the runtime alongside the topics with --json', async () => {
    const result = await cli('skill', '--full', '--json');

    const payload = JSON.parse(result.stdout);
    expect(payload.runtime).toMatch(/^@wix\/htmdx@\d+\.\d+\.\d+/);
    expect(payload.topics.map((topic: { name: string }) => topic.name)).toEqual([
      'authoring',
      'components',
      'integration',
      'starter',
    ]);
  });

  // A typo'd flag that quietly prints the default topic reads as an answer.
  test('exits 2 for an unknown flag instead of falling back to a topic', async () => {
    const result = await cli('skill', '--topics');

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('unknown option "--topics"');
  });

  test('exits 2 and names the valid topics for an unknown one', async () => {
    const result = await cli('skill', 'nope');

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('unknown skill topic "nope"');
    expect(result.stderr).toContain('components');
  });
});

// `skill` reads its topics from ../skill relative to dist/cli.js, so an agent
// only gets the guidance if the bin and the topic files both survive `npm
// pack`. Nothing else in the suite exercises the published layout, and the
// failure mode — dropping the files entry, moving the bundle — is silent until
// someone runs the command off npm. Pack for real and run it out of the
// extracted tarball.
describe('published package', () => {
  let published: string;

  beforeAll(async () => {
    const destination = mkdtempSync(join(tmpdir(), 'htmdx-pack-'));
    const { stdout } = await run('npm', ['pack', '--pack-destination', destination], {
      cwd: packageDir,
      shell: true,
    });
    const tarball = join(destination, stdout.trim().split('\n').at(-1) ?? '');
    await run('tar', ['-xzf', tarball, '-C', destination]);
    published = join(destination, 'package');
    // The tarball carries no node_modules, and the bin imports jsdom. Point it
    // at the installed tree so the run exercises the packed file layout rather
    // than npm's install step.
    symlinkSync(resolve(packageDir, '../../node_modules'), join(published, 'node_modules'), 'dir');
  }, 300_000);

  test('ships every guidance topic alongside the bin', () => {
    expect(readdirSync(join(published, 'dist'))).toContain('cli.js');
    expect(readdirSync(join(published, 'skill'))).toEqual(
      expect.arrayContaining(SKILL_TOPICS.map((topic) => topic.file)),
    );
  });

  test('serves the guidance from the published layout', async () => {
    const { stdout } = await run(process.execPath, [
      join(published, 'dist/cli.js'),
      'skill',
      'components',
    ]);

    expect(stdout).toContain('# Component grammar');
  });
});
