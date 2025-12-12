# Migration Plan: Vitest to Bun Native Test Runner

This document outlines the plan to migrate the `wod-wiki` codebase from Vitest to the Bun native testing framework.

## 1. Analysis and Scope

### Current Setup
- **Framework**: Vitest
- **Scripts**:
  - `test` (Unit): Runs `vitest run --project=unit` (Target: `src/**/*.test.ts`)
  - `test:components` (Components): Runs explicit setup in `vitest.config.js` (Target: `tests/**/*.test.ts`)
  - `test:storybook`: Runs `vitest --project=storybook`
- **Environments**:
  - Unit tests: `node`
  - Component tests: `jsdom` (via `@testing-library/react`)
- **Key Dependencies**: `vitest`, `@testing-library/react`, `jsdom`, `@vitest/coverage-v8`

### Goals
- Replace `vitest` with `bun test`.
- Remove Vitest dependencies to reduce bloat.
- Ensure `src` (Node logic) and `tests` (Components/DOM) pass under Bun.

## 2. Migration Steps

### Step 1: Manage Dependencies
**Remove**:
- `vitest`
- `@vitest/coverage-v8`
- `@vitest/browser` (if unused by other tools)
- `@storybook/addon-vitest` (Note: If this is critical for Storybook interaction, we might need to retain it strictly for Storybook, but we will aim to move unit/component tests to Bun).
- `jsdom` (Bun uses `happy-dom` by default, or we can keep `jsdom` and use `bun test --preload` to use it if `happy-dom` is insufficient. `global-jsdom` might be needed).

**Install**:
- `happy-dom` (if not built-in or if specific version needed).
- `@types/bun` (already likely installed).
- `global-jsdom` (optional/fallback).

### Step 2: Configuration (`bunfig.toml`)
Create a `bunfig.toml` or rely on `package.json` configuration to map paths if needed. Bun generally works without config, but we need to handle the `setupFiles`.

### Step 3: Update `package.json` Scripts
Refactor scripts to use `bun test`:

```json
{
  "scripts": {
    "test": "bun test src/",
    "test:components": "bun test tests/ --preload ./tests/setup-bun.ts",
    "test:coverage": "bun test --coverage"
  }
}
```

*Note: Bun runs tests in parallel by default. We can use filter patterns to split unit vs component tests.*

### Step 4: Create Bun Setup Files
Detailed changes for `tests/setup.ts`:
- **Mocking**: Replace `vi.fn()` with `import { mock } from "bun:test"`.
- **Globals**: Bun has `beforeAll`, `afterAll`, `describe`, `test`, `expect` built-in.
- **DOM**: Ensure `happy-dom` or `global-jsdom` is loaded for component tests.

Create `tests/setup-bun.ts` (example):
```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { beforeEach, afterEach, mock } from "bun:test";

// Register Happy DOM for component tests
GlobalRegistrator.register();

// Mock ResizeObserver/IntersectionObserver
global.ResizeObserver = mock(() => ({
  observe: mock(),
  unobserve: mock(),
  disconnect: mock(),
}));

// ... port other mocks from setup.ts
```

### Step 5: Code Migration (Global Replace)
Perform codebase-wide replacements:
1.  **Imports**:
    - `import { ... } from 'vitest'` -> `import { ... } from 'bun:test'`
    - Remove `import { vi } from 'vitest'`
2.  **Mocking API**:
    - `vi.fn()` -> `mock()` (import from `bun:test`)
    - `vi.spyOn()` -> `spyOn()` (import from `bun:test`)
    - `vi.mocked()` -> Remove or replace with type assertion.
    - `vi.advanceTimersByTime()` -> Bun's `jest.advanceTimersByTime` (Bun implements Jest globals compatibility).

### Step 6: Verify and Fix
1.  Run `bun test src/` (Unit tests).
2.  Run `bun test tests/` (Component tests).
3.  Fix individual test failures related to:
    - ESM vs CJS issues (Bun is strict ESM).
    - DOM API differences (`happy-dom` vs `jsdom`).
    - Timer/Mock incompatibilities.

### Step 7: Storybook Considerations
The `test:storybook` script currently relies on Vitest. If the user wants to keep the Storybook integration as-is (common for visual testing), we might keep `vitest` *only* for that script, or investigate `bun-playwright` full integration. For now, the primary goal is migrating the standard test suite.

## 3. Rollout Plan
1.  **Draft**: Create `tests/setup-bun.ts`.
2.  **Switch**: Update `package.json` scripts to point to Bun (keep Vitest installed temporarily).
3.  **Refactor**: Run search-and-replace for `vi` -> Bun mocks.
4.  **Validate**: Run tests until green.
5.  **Cleanup**: Remove Vitest dependencies.
