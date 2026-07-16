// Builds dist/browser-react.js: the self-contained IIFE (React + shadcn pack
// + htmdx React renderer) for plain HTML artifacts, mirroring dist/browser.js.
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
      entry: 'src/react/browser.ts',
      name: 'HtmdxReact',
      formats: ['iife'],
      fileName: () => 'browser-react.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
  },
});
