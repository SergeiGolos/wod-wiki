import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Multi-project Vitest config
export default defineConfig({
  projects: [
    // Regular Node.js unit tests
    {
      test: {
        name: 'unit',
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['stories/**/*', 'src/**/*.stories.*'],
        environment: 'node',
      },
    },
    // Storybook component tests with Playwright
    {
      plugins: [
        storybookTest({ configDir: path.join(dirname, '.storybook') }),
      ],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{ browser: 'chromium' }],
        },
        setupFiles: ['.storybook/vitest.setup.js'],
      },
    },
  ],
});
