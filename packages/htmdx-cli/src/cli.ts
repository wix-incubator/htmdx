#!/usr/bin/env node
// htmdx lint <files...> — validates HTMDX artifacts and source files.
//
// Exit codes: 0 clean, 1 problems found, 2 the command could not run.

import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { lintFile, summarize, type LintDiagnostic, type LintReport } from './lint.js';

const USAGE = `Usage: htmdx lint <files...> [options]

Options:
  --format <pretty|json>  Output format (default: pretty)
  --strict                Treat warnings as failures
  --runtime <specifier>   Validate against a specific @wix/htmdx build
  -h, --help              Show this message`;

type Args = {
  files: string[];
  format: 'pretty' | 'json';
  strict: boolean;
  runtime?: string;
};

async function main(argv: string[]): Promise<number> {
  if (argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const [command, ...rest] = argv;
  if (command !== 'lint') {
    process.stderr.write(`${command ? `unknown command "${command}"\n\n` : ''}${USAGE}\n`);
    return 2;
  }

  const args = parseArgs(rest);
  if (args.files.length === 0) {
    process.stderr.write(`no files given\n\n${USAGE}\n`);
    return 2;
  }

  const results = [];
  for (const file of args.files) {
    let content: string;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      process.stderr.write(`cannot read ${file}\n`);
      return 2;
    }
    results.push(await lintFile(file, content, { runtime: args.runtime }));
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
    if (argument === '--runtime') {
      index += 1;
      args.runtime = argv[index];
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
