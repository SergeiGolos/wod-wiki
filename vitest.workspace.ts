import { defineWorkspace } from 'vitest/config';
import { resolve } from 'node:path';

export default defineWorkspace([
  'packages/*',
  'apps/*',
  {
    test: {
      name: 'contract',
      include: ['tests/contract/**/*.test.ts'],
      environment: 'node',
    },
    resolve: {
      alias: {
        '@wod-wiki/core': resolve(__dirname, 'packages/core/src'),
        '@wod-wiki/lang': resolve(__dirname, 'packages/lang/src'),
        '@wod-wiki/wql': resolve(__dirname, 'packages/wql/src'),
      },
    },
  },
]);
