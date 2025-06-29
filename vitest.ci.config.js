import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

// CI-specific configuration that extends the base config
export default mergeConfig(baseConfig, defineConfig({
  test: {
    // Force single-threaded execution in CI for stability
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Disable watch mode in CI
    watch: false,
    // Enable coverage in CI
    coverage: {
      enabled: true,
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // CI-specific reporters
    reporter: ['verbose', 'junit', 'json'],
    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json',
    },
    // Longer timeout for CI environments
    testTimeout: 30000,
    hookTimeout: 30000,
  },
}));
