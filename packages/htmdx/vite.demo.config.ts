// Builds the react-poc demo as a single IIFE bundle so the page can be opened
// over file:// (no dev server) — module scripts are CORS-blocked on file://.
import { defineConfig } from 'vite';

export default defineConfig({
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
