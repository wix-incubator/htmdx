// Builds the react-poc demo as a single IIFE bundle so the page can be opened
// over file:// (no dev server) — module scripts are CORS-blocked on file://.
import { defineConfig } from 'vite';

export default defineConfig({
  // Lib mode leaves process.env.NODE_ENV for consumers to replace; this bundle
  // runs directly in a browser, so replace it or the IIFE dies on `process`.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: {
      entry: 'src/react-poc/demo/main.tsx',
      name: 'HtmdxReactPocDemo',
      formats: ['iife'],
      fileName: () => 'demo.js',
    },
    outDir: 'dist/react-poc-demo',
    emptyOutDir: true,
  },
});
