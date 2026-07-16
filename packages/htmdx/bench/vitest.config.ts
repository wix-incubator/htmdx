import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { packageVersionPlugin } from '../build/package-version-plugin.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [packageVersionPlugin(version)],
  test: {
    include: ['bench/run.ts'],
    environment: 'jsdom',
  },
});
