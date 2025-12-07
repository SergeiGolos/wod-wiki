import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Multi-project Vitest config
export default defineConfig({
  test: {
    projects: [
      // Regular Node.js unit tests
      {
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['stories/**/*', 'src/**/*.stories.*'],
          environment: 'node',
          setupFiles: ['./tests/unit-setup.ts'],
        },
      },
      // React component tests (jsdom environment)
      {
        test: {
          name: 'components',
          include: ['tests/**/*.{test,spec}.{js,ts}'],
          exclude: ['stories/**/*', 'src/**/*.stories.*'],
          environment: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
        },
      },
      // Storybook component tests with Playwright
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
