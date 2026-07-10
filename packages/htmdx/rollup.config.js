import { readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';
import { packageVersionPlugin } from './build/package-version-plugin.js';

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(await readFile(resolve(packageDirectory, 'package.json'), 'utf8'));
const packageVersion = packageJson.version;

const moduleConfig = {
  input: './src/index.ts',
  output: {
    format: 'esm',
    dir: './dist',
    entryFileNames: 'index.js',
    chunkFileNames: '[name].js',
    sourcemap: true,
  },
  plugins: [packageVersionPlugin(packageVersion), typescript(), terser()],
};

function emitComponentManifest() {
  return {
    name: 'emit-component-manifest',
    async writeBundle(outputOptions) {
      const outputFile = resolve(packageDirectory, outputOptions.file);
      const moduleUrl = `${pathToFileURL(outputFile).href}?version=${packageVersion}`;
      const { default: manifest } = await import(moduleUrl);

      await writeFile(
        resolve(packageDirectory, 'dist/components.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      await unlink(outputFile);
      await unlink(`${outputFile}.map`).catch(() => {});
    },
  };
}

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
  {
    input: './src/component-manifest.ts',
    output: {
      format: 'esm',
      file: './dist/.components-manifest.js',
      sourcemap: true,
    },
    plugins: [packageVersionPlugin(packageVersion), typescript(), emitComponentManifest()],
  },
]);
