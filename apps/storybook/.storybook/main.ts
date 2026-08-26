import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { CODEMIRROR_SINGLETON_DEPS, workspaceAliases } from '../aliases.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: path.resolve(__dirname, '../vite.config.ts'),
      },
    },
  },
  typescript: {
    reactDocgen: false,
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.dedupe = Array.from(
      new Set([...(config.resolve.dedupe || []), 'react', 'react-dom', ...CODEMIRROR_SINGLETON_DEPS])
    );
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...workspaceAliases(rootDir),
    };
    return config;
  },
};

export default config;
