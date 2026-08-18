import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

const CODEMIRROR_SINGLETON_DEPS = [
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/lang-markdown',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/lr',
  '@lezer/markdown',
];

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
      '@': path.resolve(rootDir, 'src'),
      '@bitcobblers/wod-wiki-engine': path.resolve(rootDir, 'packages/engine/src/index.ts'),
      '@bitcobblers/wod-wiki-ui/styles.css': path.resolve(rootDir, 'packages/ui/src/styles.css'),
      '@bitcobblers/wod-wiki-ui/extensions': path.resolve(rootDir, 'packages/ui/src/extensions/index.ts'),
      '@bitcobblers/wod-wiki-ui': path.resolve(rootDir, 'packages/ui/src'),
      react: path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
    };
    return config;
  },
};

export default config;
