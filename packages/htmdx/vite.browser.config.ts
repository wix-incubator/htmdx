// Builds dist/browser.js: the self-contained IIFE (React + built-ins + shadcn
// + theme) for plain HTML artifacts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import {
  type BundleSizes,
  checkBudgetCoverage,
  checkBundleBudget,
  formatBundleSizes,
  measureBundle,
} from './build/bundle-budget.js';
import { packageVersionPlugin } from './build/package-version-plugin.js';
import { validateProductionBundle } from './build/production-bundle-validation.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const budget: { files: Record<string, BundleSizes> } = JSON.parse(
  readFileSync(new URL('./build/bundle-budget.json', import.meta.url), 'utf8'),
);

// Vite derives `isProduction` from NODE_ENV alone, so an inherited
// NODE_ENV=development compiles JSX to `jsxDEV` while `define` below still
// pins React to its production runtime, whose `jsxDEV` is undefined. Setting
// it here (Vite's documented escape hatch) keeps the bundle deterministic.
process.env.NODE_ENV = 'production';

export default defineConfig({
  plugins: [packageVersionPlugin(version), assertProductionBundle(), enforceBundleBudget()],
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

// Every artifact loads this bundle from a CDN before it renders, and nothing
// else in the build observes how large it is. Measure the written file rather
// than the in-memory chunk, so the sourcemap comment is counted too.
function enforceBundleBudget(): Plugin {
  return {
    name: 'htmdx-enforce-bundle-budget',
    writeBundle(options, bundle) {
      const emitted = Object.keys(bundle);

      try {
        checkBudgetCoverage(Object.keys(budget.files), emitted);
      } catch (error) {
        this.error((error as Error).message);
      }

      for (const fileName of emitted) {
        const limits = budget.files[fileName];
        if (!limits) {
          continue;
        }

        const sizes = measureBundle(readFileSync(join(options.dir ?? 'dist', fileName)));
        this.info(formatBundleSizes(fileName, sizes, limits));

        try {
          checkBundleBudget(fileName, sizes, limits);
        } catch (error) {
          this.error((error as Error).message);
        }
      }
    },
  };
}
