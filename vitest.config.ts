import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Workspace unit-test runner (`bun run test:package`). Mirrors the original
// vitest.workspace.ts scope: all five packages plus the contract suite under
// tests/contract. The playground and storybook apps run their own runners.
export default defineConfig({
  test: {
    projects: [
      'packages/*',
      {
        test: {
          name: 'contract',
          include: ['tests/contract/**/*.test.ts'],
          environment: 'node',
        },
        resolve: {
          alias: {
            '@bitcobblers/wod-wiki-core': resolve(__dirname, 'packages/core/src'),
            '@bitcobblers/wod-wiki-lang': resolve(__dirname, 'packages/lang/src'),
            '@bitcobblers/wod-wiki-wql': resolve(__dirname, 'packages/wql/src'),
          },
        },
      },
    ],
  },
});
