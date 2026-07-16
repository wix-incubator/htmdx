import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { packageVersionPlugin } from './build/package-version-plugin.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [packageVersionPlugin(version)],
  test: {
    exclude: ['node_modules', 'dist', '**/e2e/**'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    // react-dom flushes passive effects on a macrotask that can land after
    // jsdom teardown ("window is not defined"). test/setup.ts drains most of
    // them; this filters the stragglers so only that known race is ignored.
    onUnhandledError(error) {
      const stack = String(error.stack || '');
      return !(
        String(error.message).includes('window is not defined') &&
        (stack.includes('react-dom') || stack.includes('scheduler'))
      );
    },
  },
});
