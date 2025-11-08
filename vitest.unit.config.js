import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Global excludes - E2E tests run separately with npm run test:e2e
    exclude: ['tests/e2e/**', '**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**'],
  },
  projects: [
    // Node.js unit tests (language, JIT, runtime-execution, metrics, performance)
    {
      test: {
        name: 'unit',
        include: [
          'tests/language-compilation/**/*.test.{ts,tsx}',
          'tests/jit-compilation/**/*.test.{ts,tsx}',
          'tests/runtime-execution/**/*.test.{ts,tsx}',
          'tests/metrics-recording/**/*.test.{ts,tsx}',
          'tests/performance/**/*.test.{ts,tsx}'
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
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
      },
    },
  ],
});
