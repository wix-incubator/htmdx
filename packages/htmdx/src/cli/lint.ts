// Linting one file: pull the HTMDX source out of it, hand it to the runtime's
// validate(), and add the two findings only an artifact can carry — how it
// loads the runtime, and which version it pins.

import type { HtmdxDiagnostic } from '../diagnostics';
import { installDom } from './dom';

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

const HTMDX_SCRIPT = /<script\s+type="text\/htmdx"[^>]*>([\s\S]*?)<\/script>/;
const RUNTIME_SCRIPT = /<script[^>]+src=["']([^"']*@wix\/htmdx[^"']*)["']/i;
const PINNED_VERSION = /@wix\/htmdx@(\d+\.\d+\.\d+(?:-[\w.]+)?)/;

type Runtime = typeof import('../index');

let runtimeCache: Promise<Runtime> | undefined;

// react-dom decides whether it has a DOM when its module first evaluates, so
// the globals have to exist before the runtime is imported — hence the lazy
// import rather than a static one at the top of the file.
async function loadRuntime(): Promise<Runtime> {
  installDom();
  runtimeCache ??= import('../index');
  return runtimeCache;
}

export async function lintFile(file: string, content: string): Promise<LintFileResult> {
  const runtime = await loadRuntime();
  const isArtifact = /\.html?$/i.test(file) || HTMDX_SCRIPT.test(content);
  const source = isArtifact ? extractEmbeddedSource(content) : content;

  if (source === undefined) {
    return { file, diagnostics: [] };
  }

  const offset = isArtifact ? content.indexOf(source) : 0;
  const diagnostics: LintDiagnostic[] = runtime
    .validate(source)
    .map((diagnostic) => rebase(diagnostic, content, offset));

  if (isArtifact) {
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

function extractEmbeddedSource(content: string): string | undefined {
  return content.match(HTMDX_SCRIPT)?.[1];
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
