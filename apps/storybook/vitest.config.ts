import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { CODEMIRROR_SINGLETON_DEPS, workspaceAliases } from './aliases.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: path.resolve(__dirname, '.storybook'),
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', ...CODEMIRROR_SINGLETON_DEPS],
    alias: workspaceAliases(rootDir),
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
