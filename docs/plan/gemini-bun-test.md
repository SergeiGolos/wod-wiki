# Migration Plan: Vitest to Bun Native Test Runner

This document outlines the plan to migrate the `wod-wiki` codebase from Vitest to the Bun native testing framework.

## 1. Analysis and Scope

### Current Setup
- **Framework**: Bun native test runner (with Vitest retained for Storybook)
- **Scripts**:
  - `test` (Unit): Runs `bun test src --preload ./tests/unit-setup.ts` (Target: `src/**/*.test.ts`)
  - `test:components` (Components/DOM): Runs `bun test tests --preload ./tests/setup.ts` (Target: `tests/**/*.test.ts`)
  - `test:storybook`: Runs `bunx vitest run --config vitest.storybook.config.js`
- **Environments**:
  - Unit tests: `node`
  - Component tests: `jsdom` (via `@testing-library/react`)
- **Key Dependencies**: `@testing-library/react`, `jsdom`, `bun-types` (plus `vitest` / Storybook Vitest addon for Storybook tests)

### Goals
- Replace `vitest` with `bun test`.
- Reduce Vitest footprint (keep only what Storybook requires).
- Ensure `src` (Node logic) and `tests` (Components/DOM) pass under Bun.

## 2. Migration Steps

### Step 1: Manage Dependencies
**Remove**:
  - `@vitest/coverage-v8` (Bun provides `--coverage`)

**Keep (Storybook only)**:
  - `vitest`
  - `@storybook/addon-vitest`

**Keep (DOM bootstrapping)**:
  - `jsdom` (used by `tests/unit-setup.ts` preload to provide DOM globals for browser-only imports during coverage/module eval)

**Install**:
  - `bun-types` (TypeScript typings for `bun:test`)
  - `@types/jsdom` (typings for `JSDOM` when used in preload)

### Step 2: Configuration (`bunfig.toml`)
Create a `bunfig.toml` or rely on `package.json` configuration to map paths if needed. Bun generally works without config, but we need to handle the `setupFiles`.

### Step 3: Update `package.json` Scripts
Refactor scripts to use `bun test`:

```json
{
  "scripts": {
    "test": "bun test src --preload ./tests/unit-setup.ts",
    "test:components": "bun test tests --preload ./tests/setup.ts",
    "test:coverage": "bun test src --preload ./tests/unit-setup.ts --coverage --coverage-reporter=lcov"
  }
}
```

*Note: Bun runs tests in parallel by default. We can use filter patterns to split unit vs component tests.*

### Step 4: Create Bun Setup Files
Use Bun preloads to replace Vitest `setupFiles`:
- `tests/setup.ts` for component/DOM tests
- `tests/unit-setup.ts` for unit tests (includes jsdom bootstrapping where needed)

Note: Bun's `vi` is available from `bun:test`, but it does not include `vi.mocked`, so a compatibility shim is used in preloads.

### Step 5: Code Migration (Global Replace)
Perform codebase-wide replacements:
1.  **Imports**:
    - `import { ... } from 'vitest'` -> `import { ... } from 'bun:test'`
    - Remove `import { vi } from 'vitest'`
2.  **Mocking API**:
  - Keep using `vi.fn()`, `vi.spyOn()`, timers, etc. from `bun:test`
  - Provide a `vi.mocked` shim in preloads where needed

### Step 6: Verify and Fix
1.  Run `bun test src/` (Unit tests).
2.  Run `bun test tests/` (Component tests).
3.  Fix individual test failures related to:
    - ESM vs CJS issues (Bun is strict ESM).
    - DOM API differences (`happy-dom` vs `jsdom`).
    - Timer/Mock incompatibilities.

### Step 7: Storybook Considerations
Storybook testing still relies on Vitest via the Storybook Vitest addon. The standard test suite (unit/components/perf/coverage) runs under Bun.

## 3. Rollout Plan
1.  **Draft**: Create `tests/setup-bun.ts`.
2.  **Switch**: Update `package.json` scripts to point to Bun (keep Vitest installed temporarily).
3.  **Refactor**: Run search-and-replace for `vi` -> Bun mocks.
4.  **Validate**: Run tests until green.
5.  **Cleanup**: Remove Vitest dependencies.
