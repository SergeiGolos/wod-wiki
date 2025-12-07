import { defineWorkspace } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

export default defineWorkspace([
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
  // Storybook component tests with Playwright
  {
    plugins: [
      storybookTest({ configDir: '.storybook' }),
    ],
    test: {
      name: 'storybook',
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright',
        headless: true,
      },
      include: ['**/*.stories.?(m)[jt]s?(x)'],
      setupFiles: ['.storybook/vitest.setup.js'],
    },
  },
]);
