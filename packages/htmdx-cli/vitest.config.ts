import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules', 'dist'],
    // The CLI supplies its own jsdom instance; tests drive it as a subprocess.
    environment: 'node',
    testTimeout: 30_000,
  },
});
