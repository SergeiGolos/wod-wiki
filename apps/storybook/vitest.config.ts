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

const resolveConfig = {
  dedupe: ['react', 'react-dom', ...CODEMIRROR_SINGLETON_DEPS],
  alias: workspaceAliases(rootDir),
};

// Two projects: the storybook browser runner (one test per story) and a
// node runner for plain unit tests under test/ (e.g. the gallery manifest
// coverage guard, which needs no DOM and no browser).
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          react(),
          storybookTest({
            configDir: path.resolve(__dirname, '.storybook'),
          }),
        ],
        resolve: resolveConfig,
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
      },
      {
        resolve: resolveConfig,
        test: {
          name: 'app-unit',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
    ],
  },
});
