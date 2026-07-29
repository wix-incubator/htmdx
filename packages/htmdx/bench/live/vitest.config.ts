import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { packageVersionPlugin } from '../../build/package-version-plugin.js';

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);

export default defineConfig({
  plugins: [packageVersionPlugin(version)],
  test: {
    include: ['bench/live/run.ts'],
    environment: 'jsdom',
    // One long-running test that spends money; parallelism lives inside it.
    fileParallelism: false,
    testTimeout: 60 * 60 * 1000,
  },
});
