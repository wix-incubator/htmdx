import type { StorybookConfig } from '@storybook/web-components-vite';
import type { Plugin } from 'vite';
import { packageVersionPlugin } from '../build/package-version-plugin.js';
import packageJson from '../package.json' with { type: 'json' };

function reloadPreviewOnSourceChange(): Plugin {
  return {
    name: 'reload-preview-on-htmdx-source-change',
    handleHotUpdate({ file, server }) {
      if (!file.includes('/src/')) {
        return;
      }

      server.ws.send({ type: 'full-reload', path: '*' });
      return [];
    },
  };
}

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  framework: '@storybook/web-components-vite',
  addons: [],
  async viteFinal(viteConfig) {
    viteConfig.plugins ??= [];
    viteConfig.plugins.push(
      packageVersionPlugin(packageJson.version) as Plugin,
      reloadPreviewOnSourceChange(),
    );
    return viteConfig;
  },
};

export default config;
