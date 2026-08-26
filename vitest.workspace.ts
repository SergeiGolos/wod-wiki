import { defineWorkspace } from 'vitest/config';
import { resolve } from 'node:path';

export default defineWorkspace([
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
]);
