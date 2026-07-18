import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { compile } from '../src';

const examples = ['index.html', 'decision-brief.html', 'component-tour.html'];

function readHtmdxSource(file: string): string {
  const html = readFileSync(resolve(import.meta.dirname, '../../../examples', file), 'utf8');
  const source = html.match(/<script\s+type="text\/htmdx"[^>]*>([\s\S]*?)<\/script>/)?.[1];

  if (source === undefined) {
    throw new Error(`${file} does not contain an HTMDX source block`);
  }

  return source;
}

describe('shipped examples', () => {
  test.each(examples)('%s compiles with the bundled catalog', (file) => {
    expect(compile(readHtmdxSource(file))).not.toBe('');
  });
});
