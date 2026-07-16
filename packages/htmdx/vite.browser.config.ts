// Builds dist/browser.js: the self-contained IIFE (React + built-ins + shadcn
// + theme) for plain HTML artifacts.
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { packageVersionPlugin } from './build/package-version-plugin.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [packageVersionPlugin(version)],
  // Lib mode leaves process.env.NODE_ENV for consumers to replace; this bundle
  // runs directly in a browser, so replace it or the IIFE dies on `process`.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
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
