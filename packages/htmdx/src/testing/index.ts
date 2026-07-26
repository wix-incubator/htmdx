// Test helpers for consumers who keep HTMDX documents in their repo: pull the
// source out of a shipped artifact, then snapshot it. Lives in the runtime
// package because a consumer already has the pinned runtime installed and
// their test environment already supplies the DOM.

import { compile, validate, type HtmdxCompileOptions } from '../index';
import { structureOf, type HtmdxStructureNode } from '../react';
import { runtimeOptionsFor } from '../runtime-definitions';

const HTMDX_SCRIPT = /<script\s+type="text\/htmdx"[^>]*>([\s\S]*?)<\/script>/;

export type HtmdxSnapshotMode = 'structure' | 'html';

export type HtmdxSnapshotOptions = HtmdxCompileOptions & {
  mode?: HtmdxSnapshotMode;
};

export function extractSource(html: string): string {
  const source = html.match(HTMDX_SCRIPT)?.[1];
  if (source === undefined) {
    throw new Error('no <script type="text/htmdx"> block found');
  }
  return source;
}

export function snapshot(source: string, options: HtmdxSnapshotOptions = {}): string {
  const { mode = 'structure', ...compileOptions } = options;

  // A snapshot of a broken document is worse than no snapshot: it records the
  // breakage as expected output. Fail with every diagnostic instead.
  const errors = validate(source, compileOptions).filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  if (errors.length > 0) {
    throw new Error(
      `htmdx source is invalid:\n${errors
        .map((error) => `  ${error.line}:${error.column} ${error.code} — ${error.message}`)
        .join('\n')}`,
    );
  }

  if (mode === 'html') {
    const result = compile(source, compileOptions);
    if (!result.ok) {
      throw new Error(result.error);
    }
    return result.html;
  }

  return formatStructure(structureOf(source, runtimeOptionsFor(compileOptions)));
}

function formatStructure(nodes: HtmdxStructureNode[], depth = 0): string {
  const indent = '  '.repeat(depth);
  return nodes
    .map((node) => {
      if (node.type === 'markdown') {
        return `${indent}markdown ${JSON.stringify(node.value)}`;
      }
      if (node.type === 'text') {
        return `${indent}text ${JSON.stringify(node.value)}`;
      }
      const props = Object.entries(node.props)
        .map(([name, value]) => ` ${name}=${JSON.stringify(value)}`)
        .join('');
      if (node.children.length === 0) {
        return `${indent}<${node.name}${props} />`;
      }
      return `${indent}<${node.name}${props}>\n${formatStructure(node.children, depth + 1)}`;
    })
    .join('\n');
}
