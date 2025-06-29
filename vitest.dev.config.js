import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

// Development-specific configuration that extends the base config
export default mergeConfig(baseConfig, defineConfig({
  test: {
    // Enable watch mode by default in dev
    watch: true,
    // Show browser UI for Storybook tests in dev
    projects: [
      {
        name: 'unit',
        // Unit test config stays the same
      },
      {
        name: 'storybook',
        test: {
          browser: {
            enabled: true,
            headless: false, // Show browser in dev mode
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    // Enable UI mode for better development experience
    ui: false, // Set to true if you want UI by default
    // Faster feedback in dev
    testTimeout: 10000,
    hookTimeout: 10000,
    // Coverage disabled by default in watch mode for speed
    coverage: {
      enabled: false,
    },
  },
}));
