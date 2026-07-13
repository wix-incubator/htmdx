import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { builtInComponents } from '../src/components/catalog';

function componentFilename(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

const componentsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../src/components');

describe('built-in component stories', () => {
  test.each(builtInComponents)('$name has a co-located story', ({ name }) => {
    const storyPath = resolve(componentsDirectory, `${componentFilename(name)}.stories.ts`);

    expect(existsSync(storyPath)).toBe(true);
  });
});
