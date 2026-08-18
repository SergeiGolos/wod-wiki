import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

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

export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: path.resolve(__dirname, '.storybook'),
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', ...CODEMIRROR_SINGLETON_DEPS],
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@wod-wiki/engine': path.resolve(rootDir, 'packages/engine/src/index.ts'),
      '@wod-wiki/ui/extensions': path.resolve(rootDir, 'packages/ui/src/extensions/index.ts'),
      '@wod-wiki/ui': path.resolve(rootDir, 'packages/ui/src/index.ts'),
      react: path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
    },
  },
  test: {
    name: 'storybook-workbench',
    browser: {
      enabled: true,
      instances: [{ browser: 'chromium' }],
      provider: playwright(),
      headless: true,
    },
    setupFiles: [path.resolve(__dirname, '.storybook/vitest.setup.ts')],
  },
});
