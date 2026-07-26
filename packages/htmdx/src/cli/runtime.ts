// Shared plumbing for the commands that need the runtime: loading it against a
// DOM, and pulling the HTMDX source out of whatever file the user pointed at.

import { installDom } from './dom';

export type Runtime = typeof import('../index');

const HTMDX_SCRIPT = /<script\s+type="text\/htmdx"[^>]*>([\s\S]*?)<\/script>/;

let runtimeCache: Promise<Runtime> | undefined;

// react-dom decides whether it has a DOM when its module first evaluates, so
// the globals have to exist before the runtime is imported — hence the lazy
// import rather than a static one at the top of the file.
export async function loadRuntime(): Promise<Runtime> {
  installDom();
  runtimeCache ??= import('../index');
  return runtimeCache;
}

export function isArtifact(file: string, content: string): boolean {
  return /\.html?$/i.test(file) || HTMDX_SCRIPT.test(content);
}

export function extractEmbeddedSource(content: string): string | undefined {
  return content.match(HTMDX_SCRIPT)?.[1];
}
