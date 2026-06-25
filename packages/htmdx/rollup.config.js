import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const moduleConfig = {
  input: './src/index.ts',
  output: {
    format: 'esm',
    dir: './dist',
    entryFileNames: 'index.js',
    chunkFileNames: '[name].js',
    sourcemap: true,
  },
  plugins: [typescript(), terser()],
};

export default defineConfig([
  moduleConfig,
  {
    ...moduleConfig,
    input: './src/browser.ts',
    output: {
      format: 'iife',
      file: './dist/browser.js',
      name: 'Htmdx',
      sourcemap: true,
    },
  },
]);
