import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Workspace unit-test runner (`bun run test:package`). Mirrors the original
// vitest.workspace.ts scope: all five packages plus the contract suite under
// tests/contract. The playground and storybook apps run their own runners.
//
// Cross-package imports alias to SOURCE (engine→core, ui→lang…) so tests
// never depend on a prior tsup build and never test a stale dist. Projects
// are declared explicitly (string-form globs don't inherit these aliases in
// Vitest 4); ui keeps its own config for jsdom + testing-library setup.
const workspaceAliases = {
  '@bitcobblers/wod-wiki-core': resolve(__dirname, 'packages/core/src'),
  '@bitcobblers/wod-wiki-lang': resolve(__dirname, 'packages/lang/src'),
  '@bitcobblers/wod-wiki-wql': resolve(__dirname, 'packages/wql/src'),
  '@bitcobblers/wod-wiki-engine': resolve(__dirname, 'packages/engine/src'),
  '@bitcobblers/wod-wiki-ui': resolve(__dirname, 'packages/ui/src'),
};

const sourceProject = (name: string, dir: string) => ({
  test: {
    name,
    include: [`${dir}/tests/**/*.test.ts`],
    environment: 'node',
  },
  resolve: { alias: workspaceAliases },
});

export default defineConfig({
  test: {
    projects: [
      sourceProject('core', 'packages/core'),
      sourceProject('lang', 'packages/lang'),
      sourceProject('wql', 'packages/wql'),
      sourceProject('engine', 'packages/engine'),
      'packages/ui',
      {
        test: {
          name: 'contract',
          include: ['tests/contract/**/*.test.ts'],
          environment: 'node',
        },
        resolve: { alias: workspaceAliases },
      },
    ],
  },
});
