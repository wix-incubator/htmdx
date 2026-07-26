// Linting one file: pull the HTMDX source out of it, hand it to the runtime's
// validate(), and add the two findings only an artifact can carry — how it
// loads the runtime, and which version it pins.

import type { HtmdxDiagnostic } from '../diagnostics';
import { extractEmbeddedSource, isArtifact, loadRuntime } from './runtime';

export type LintDiagnosticCode =
  | HtmdxDiagnostic['code']
  | 'unpinned-runtime'
  | 'runtime-version-mismatch';

export type LintDiagnostic = Omit<HtmdxDiagnostic, 'code'> & { code: LintDiagnosticCode };

export type LintFileResult = {
  file: string;
  diagnostics: LintDiagnostic[];
};

export type LintReport = {
  files: LintFileResult[];
  errorCount: number;
  warningCount: number;
};

const RUNTIME_SCRIPT = /<script[^>]+src=["']([^"']*@wix\/htmdx[^"']*)["']/i;
const PINNED_VERSION = /@wix\/htmdx@(\d+\.\d+\.\d+(?:-[\w.]+)?)/;

export async function lintFile(file: string, content: string): Promise<LintFileResult> {
  const runtime = await loadRuntime();
  const artifact = isArtifact(file, content);
  const source = artifact ? extractEmbeddedSource(content) : content;

  if (source === undefined) {
    return { file, diagnostics: [] };
  }

  const offset = artifact ? content.indexOf(source) : 0;
  const diagnostics: LintDiagnostic[] = runtime
    .validate(source)
    .map((diagnostic) => rebase(diagnostic, content, offset));

  if (artifact) {
    diagnostics.push(...runtimeScriptDiagnostics(content, runtime.VERSION));
  }

  return { file, diagnostics: diagnostics.toSorted((left, right) => left.offset - right.offset) };
}

export function summarize(files: LintFileResult[]): LintReport {
  const all = files.flatMap((result) => result.diagnostics);
  return {
    files,
    errorCount: all.filter((diagnostic) => diagnostic.severity === 'error').length,
    warningCount: all.filter((diagnostic) => diagnostic.severity === 'warning').length,
  };
}

// validate() sees only the embedded source, so its positions are relative to
// the <script> body. Shift them back onto the artifact the user will open.
function rebase(diagnostic: HtmdxDiagnostic, content: string, offset: number): LintDiagnostic {
  if (offset <= 0) {
    return diagnostic;
  }
  const absolute = offset + diagnostic.offset;
  const lineStart = content.lastIndexOf('\n', absolute - 1) + 1;
  return {
    ...diagnostic,
    offset: absolute,
    line: content.slice(0, absolute).split('\n').length,
    column: absolute - lineStart + 1,
  };
}

function runtimeScriptDiagnostics(content: string, runtimeVersion: string): LintDiagnostic[] {
  const match = content.match(RUNTIME_SCRIPT);
  if (!match) {
    return [];
  }

  const offset = content.indexOf(match[1]);
  const position = positionAt(content, offset);
  const pinned = match[1].match(PINNED_VERSION)?.[1];

  if (!pinned) {
    return [
      {
        code: 'unpinned-runtime',
        severity: 'warning',
        message: `runtime is not pinned to a version; a future release can change this artifact (pin @wix/htmdx@${runtimeVersion})`,
        offset,
        length: match[1].length,
        ...position,
      },
    ];
  }

  if (pinned !== runtimeVersion) {
    return [
      {
        code: 'runtime-version-mismatch',
        severity: 'warning',
        message: `artifact pins @wix/htmdx@${pinned} but was linted against ${runtimeVersion}; results may not match what ships`,
        offset,
        length: match[1].length,
        ...position,
      },
    ];
  }

  return [];
}

function positionAt(content: string, offset: number) {
  const lineStart = content.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  return { line: content.slice(0, offset).split('\n').length, column: offset - lineStart + 1 };
}
