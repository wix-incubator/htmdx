// Builds dist/browser.js: the self-contained IIFE (React + built-ins + shadcn
// + theme) for plain HTML artifacts.
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { packageVersionPlugin } from './build/package-version-plugin.js';
import { validateProductionBundle } from './build/production-bundle-validation.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Vite derives `isProduction` from NODE_ENV alone, so an inherited
// NODE_ENV=development compiles JSX to `jsxDEV` while `define` below still
// pins React to its production runtime, whose `jsxDEV` is undefined. Setting
// it here (Vite's documented escape hatch) keeps the bundle deterministic.
process.env.NODE_ENV = 'production';

export default defineConfig({
  plugins: [packageVersionPlugin(version), assertProductionBundle()],
  // Lib mode leaves process.env.NODE_ENV for consumers to replace; this bundle
  // runs directly in a browser, so replace it or the IIFE dies on `process`.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  oxc: { jsx: { development: false } },
  build: {
    lib: {
      entry: 'src/browser.ts',
      name: 'Htmdx',
      formats: ['iife'],
      fileName: () => 'browser.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
  },
});

// These breakages render a blank page, and only once a document uses a
// component, so fail the build instead of shipping the bundle.
function assertProductionBundle(): Plugin {
  return {
    name: 'htmdx-assert-production-bundle',
    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') {
          continue;
        }
        try {
          validateProductionBundle(fileName, chunk.code);
        } catch (error) {
          this.error((error as Error).message);
        }
      }
    },
  };
}
