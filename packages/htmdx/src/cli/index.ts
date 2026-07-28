// htmdx <command> — validates, compiles, and describes HTMDX artifacts, and
// prints the authoring guidance shipped with this runtime.
// The build prepends the shebang and sets the executable bit; see rollup.config.js.
//
// Exit codes: 0 clean, 1 problems found, 2 the command could not run.

import { readFile, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { compileFile } from './compile';
import {
  componentsUsedIn,
  findComponent,
  formatComponents,
  formatList,
  loadManifest,
  suggestNames,
  type ManifestComponent,
} from './components';
import { lintFile, summarize, type LintDiagnostic, type LintReport } from './lint';
import { extractEmbeddedSource, isArtifact } from './runtime';
import {
  DEFAULT_SKILL_TOPIC,
  formatTopicList,
  formatTopics,
  readAllSkillTopics,
  readSkillTopic,
  toJson,
  UnknownSkillTopicError,
} from './skill';

const USAGE = `Usage: htmdx <command> [options]

Commands:
  lint <files...>      Report problems in artifacts and source files
  validate <files...>  Alias for lint
  compile <file>       Print the static HTML snapshot
  components [name...] List the component catalog, or describe named components
  skill [topic]        Print the authoring guidance for this runtime

Options:
  --format <pretty|json>  Output format for lint and components (default: pretty)
  --strict                Treat lint warnings as failures
  -o, --out <file>        Write compile output to a file instead of stdout
  --layout <name>         Document layout for compile
  --used <file>           Describe only the components that <file> already uses
  --list, --full, --json  Topic selection and format for skill
  -h, --help              Show this message

Run against the version an artifact pins: npx @wix/htmdx@<version> lint <file>`;

type Args = {
  files: string[];
  format: 'pretty' | 'json';
  strict: boolean;
  out?: string;
  layout?: string;
  used?: string;
};

async function main(argv: string[]): Promise<number> {
  if (argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const [command, ...rest] = argv;
  // skill owns its own flags, so it takes the raw arguments; parseArgs would
  // read --list and --full as file paths.
  if (command === 'skill') {
    return runSkill(rest);
  }

  const args = parseArgs(rest);

  if (command === 'lint' || command === 'validate') {
    return runLint(args);
  }
  if (command === 'compile') {
    return runCompile(args);
  }
  if (command === 'components') {
    return runComponents(args);
  }

  process.stderr.write(`${command ? `unknown command "${command}"\n\n` : ''}${USAGE}\n`);
  return 2;
}

async function runLint(args: Args): Promise<number> {
  if (args.files.length === 0) {
    process.stderr.write(`no files given\n\n${USAGE}\n`);
    return 2;
  }

  const results = [];
  for (const file of args.files) {
    const content = await read(file);
    if (content === undefined) {
      return 2;
    }
    results.push(await lintFile(file, content));
  }

  const report = summarize(results);
  process.stdout.write(
    args.format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : formatPretty(report),
  );

  if (report.errorCount > 0) {
    return 1;
  }
  return args.strict && report.warningCount > 0 ? 1 : 0;
}

async function runCompile(args: Args): Promise<number> {
  const [file] = args.files;
  if (!file) {
    process.stderr.write(`no file given\n\n${USAGE}\n`);
    return 2;
  }

  const content = await read(file);
  if (content === undefined) {
    return 2;
  }

  const result = await compileFile(file, content, args.layout);
  if (!result.ok) {
    process.stderr.write(`${file}: ${result.error}\n`);
    return 1;
  }

  if (!args.out) {
    process.stdout.write(`${result.html}\n`);
    return 0;
  }

  try {
    await writeFile(args.out, `${result.html}\n`, 'utf8');
  } catch {
    process.stderr.write(`cannot write ${args.out}\n`);
    return 2;
  }
  return 0;
}

async function runComponents(args: Args): Promise<number> {
  let manifest;
  try {
    manifest = await loadManifest();
  } catch {
    process.stderr.write('cannot read the component manifest\n');
    return 2;
  }

  if (args.used !== undefined) {
    const content = await read(args.used);
    if (content === undefined) {
      return 2;
    }
    const source = isArtifact(args.used, content) ? extractEmbeddedSource(content) : content;
    if (source === undefined) {
      process.stderr.write(`${args.used}: no <script type="text/htmdx"> block found\n`);
      return 2;
    }
    return writeComponents(componentsUsedIn(manifest, source), args.format);
  }

  if (args.files.length === 0) {
    process.stdout.write(
      args.format === 'json'
        ? `${JSON.stringify(manifest, null, 2)}\n`
        : formatList(manifest.components, manifest.runtime),
    );
    return 0;
  }

  const entries: ManifestComponent[] = [];
  for (const name of args.files) {
    const entry = findComponent(manifest, name);
    if (!entry) {
      const near = suggestNames(manifest, name);
      process.stderr.write(
        `unknown component "${name}"${near.length ? `; did you mean ${near.join(', ')}?` : ''}\n`,
      );
      return 1;
    }
    entries.push(entry);
  }

  // One name has always emitted the bare entry; keep scripts that read it working.
  const payload = entries.length === 1 ? entries[0] : entries;
  return writeComponents(entries, args.format, payload);
}

function writeComponents(
  entries: ManifestComponent[],
  format: Args['format'],
  payload: unknown = entries,
): number {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 0;
  }

  // Silence would read as "this file uses nothing", which is also what a bad
  // --used path looks like from the caller's side.
  process.stdout.write(entries.length ? formatComponents(entries) : 'no components\n');
  return 0;
}

const SKILL_FLAGS = new Set(['--list', '--full', '--json']);

async function runSkill(argv: string[]): Promise<number> {
  const flags = new Set(argv.filter((argument) => argument.startsWith('--')));
  const [requested] = argv.filter((argument) => !argument.startsWith('--'));

  // Printing the default topic for a mistyped flag looks like an answer.
  const unknown = [...flags].find((flag) => !SKILL_FLAGS.has(flag));
  if (unknown) {
    process.stderr.write(
      `unknown option "${unknown}"; expected one of ${[...SKILL_FLAGS].join(', ')}\n`,
    );
    return 2;
  }

  if (flags.has('--list')) {
    process.stdout.write(formatTopicList());
    return 0;
  }

  try {
    const topics = flags.has('--full')
      ? await readAllSkillTopics()
      : [await readSkillTopic(requested ?? DEFAULT_SKILL_TOPIC)];
    process.stdout.write(flags.has('--json') ? toJson(topics) : formatTopics(topics));
    return 0;
  } catch (error) {
    const message =
      error instanceof UnknownSkillTopicError
        ? error.message
        : `cannot read the guidance shipped with this package: ${(error as Error).message}`;
    process.stderr.write(`${message}\n`);
    return 2;
  }
}

async function read(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    process.stderr.write(`cannot read ${file}\n`);
    return undefined;
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = { files: [], format: 'pretty', strict: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--strict') {
      args.strict = true;
      continue;
    }
    if (argument === '--format') {
      index += 1;
      args.format = argv[index] === 'json' ? 'json' : 'pretty';
      continue;
    }
    if (argument === '-o' || argument === '--out') {
      index += 1;
      args.out = argv[index];
      continue;
    }
    if (argument === '--layout') {
      index += 1;
      args.layout = argv[index];
      continue;
    }
    if (argument === '--used') {
      index += 1;
      args.used = argv[index];
      continue;
    }
    args.files.push(argument);
  }

  return args;
}

function formatPretty(report: LintReport): string {
  const lines: string[] = [];

  for (const result of report.files) {
    if (result.diagnostics.length === 0) {
      continue;
    }
    lines.push(relative(process.cwd(), result.file) || result.file);
    for (const diagnostic of result.diagnostics) {
      lines.push(`  ${location(diagnostic)}  ${diagnostic.severity}  ${diagnostic.code}`);
      lines.push(`    ${diagnostic.message}`);
    }
    lines.push('');
  }

  if (lines.length === 0) {
    return `no problems in ${report.files.length} file${report.files.length === 1 ? '' : 's'}\n`;
  }

  lines.push(`${report.errorCount} error(s), ${report.warningCount} warning(s)`);
  return `${lines.join('\n')}\n`;
}

function location(diagnostic: LintDiagnostic): string {
  return `${diagnostic.line}:${diagnostic.column}`.padEnd(7);
}

process.exitCode = await main(process.argv.slice(2));
