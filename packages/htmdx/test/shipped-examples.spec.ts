import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { compile, validate } from '../src';
import { extractSource } from '../src/testing';

const examples = [
  'index.html',
  'decision-brief.html',
  'blank-layout.html',
  'component-tour.html',
  'diagrams.html',
];

function readHtmdxSource(file: string): string {
  return extractSource(
    readFileSync(resolve(import.meta.dirname, '../../../examples', file), 'utf8'),
  );
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

  test.each(examples)('%s validates clean', (file) => {
    expect(validate(readHtmdxSource(file))).toEqual([]);
  });
});
