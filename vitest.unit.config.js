import { defineConfig } from 'vitest/config';

export default defineConfig({
  projects: [
    // Node.js unit tests (language, JIT, runtime-execution, metrics)
    {
      test: {
        name: 'unit',
        include: [
          'tests/language-compilation/**/*.test.{ts,tsx}',
          'tests/jit-compilation/**/*.test.{ts,tsx}',
          'tests/runtime-execution/**/*.test.{ts,tsx}',
          'tests/metrics-recording/**/*.test.{ts,tsx}'
        ],
        environment: 'node',
      },
    },
    // React component tests (jsdom environment) - legacy tests not yet migrated
    {
      test: {
        name: 'components',
        include: [
          'tests/components/**/*.test.{ts,tsx}',
          'tests/integration/**/*.test.{ts,tsx}',
          'tests/contract/**/*.test.{ts,tsx}'
        ],
        exclude: ['tests/e2e/**', 'tests/performance/**'],
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
      },
    },
  ],
});
