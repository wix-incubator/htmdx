// Diagnostic vocabulary shared by the renderer's validation throws and by
// validate(). The renderer keeps throwing the same messages it always has —
// compile() surfaces them verbatim — while carrying a stable code and source
// offset so validate() can report position without re-deriving it.

export type HtmdxSeverity = 'error' | 'warning';

export type HtmdxDiagnosticCode =
  | 'unknown-component'
  | 'unclosed-component'
  | 'unknown-prop'
  | 'missing-required-prop'
  | 'prop-type-string'
  | 'prop-type-number'
  | 'prop-type-boolean'
  | 'prop-type-json'
  | 'brace-expression-prop'
  | 'brace-expression-body'
  | 'import-export-body'
  | 'markdown-body-nested-tags'
  | 'body-not-allowed'
  | 'event-handler-attribute'
  | 'unknown-layout'
  | 'body-contract'
  | 'render-failed'
  | 'unknown-theme'
  | 'unknown-frontmatter-field';

export type HtmdxDiagnostic = {
  code: HtmdxDiagnosticCode;
  severity: HtmdxSeverity;
  message: string;
  /** 1-based line in the original source. */
  line: number;
  /** 1-based column in the original source. */
  column: number;
  /** 0-based offset into the original source. */
  offset: number;
  length: number;
};

export class HtmdxSourceError extends Error {
  constructor(
    readonly code: HtmdxDiagnosticCode,
    message: string,
    readonly offset?: number,
    readonly length?: number,
  ) {
    super(message);
  }
}

export function positionAt(source: string, offset: number) {
  const clamped = Math.max(0, Math.min(offset, source.length));
  let line = 1;
  let lineStart = 0;
  for (let index = 0; index < clamped; index += 1) {
    if (source[index] === '\n') {
      line += 1;
      lineStart = index + 1;
    }
  }
  return { line, column: clamped - lineStart + 1 };
}

export function toDiagnostic(
  source: string,
  code: HtmdxDiagnosticCode,
  message: string,
  offset: number,
  length: number,
  severity: HtmdxSeverity = 'error',
): HtmdxDiagnostic {
  return { code, severity, message, ...positionAt(source, offset), offset, length };
}
