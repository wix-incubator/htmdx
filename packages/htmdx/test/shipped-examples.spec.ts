import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
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
  test.each(examples)('%s renders without HTML validity warnings', (file) => {
    const errors: string[] = [];
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation((...args) => errors.push(args.join(' ')));

    try {
      const rendered = compile(readHtmdxSource(file));
      if (!rendered.ok) {
        throw new Error(rendered.error);
      }
      expect(rendered.html).not.toBe('');
    } finally {
      consoleError.mockRestore();
    }

    expect(
      errors.filter((message) => /cannot be a child|cannot be a descendant/.test(message)),
    ).toEqual([]);
  });
});
