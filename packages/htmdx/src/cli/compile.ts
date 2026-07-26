// htmdx compile — the static HTML snapshot of a source file or artifact,
// the same output compile() returns to a JS caller.

import { extractEmbeddedSource, isArtifact, loadRuntime } from './runtime';

export type CompileFileResult = { ok: true; html: string } | { ok: false; error: string };

export async function compileFile(
  file: string,
  content: string,
  layout?: string,
): Promise<CompileFileResult> {
  const runtime = await loadRuntime();
  const source = isArtifact(file, content) ? extractEmbeddedSource(content) : content;

  if (source === undefined) {
    return { ok: false, error: 'no <script type="text/htmdx"> block found' };
  }

  const result = runtime.compile(source, layout ? { layout } : {});
  return result.ok ? { ok: true, html: result.html } : { ok: false, error: result.error };
}
