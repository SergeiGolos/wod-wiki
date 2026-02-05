# Task: Standardize Import Formats

Standardize all imports in the `src` directory to use the ES module `import { ... } from '...'` syntax at the top of the file, replacing local `require()` calls.

## Goals
- Remove all `require()` calls from TypeScript/JavaScript files in `src/`.
- Ensure all imports are at the top of the file.
- Handle circular dependencies introduced by moving imports to the top.
- Enforce this standard via ESLint.

## Phase 1: Analysis & Preparation
- [ ] Identify all files in `src/` containing `require()`.
- [ ] Map out the dependency graph for files with circular dependencies (e.g., `ScriptRuntime` <-> `Actions`).
- [ ] Verify ESLint configuration and existing rules.

## Phase 2: Implementation
- [ ] Refactor `src/runtime/ScriptRuntime.ts`.
- [ ] Refactor `src/runtime/ExecutionContext.ts`.
- [ ] Refactor `src/runtime/compiler/RuntimeFactory.ts`.
- [ ] Refactor `src/testing/harness/ExecutionContextTestHarness.ts`.
- [ ] Refactor `src/testing/harness/BehaviorTestHarness.ts`.
- [ ] Refactor any other identified files in `src/`.

## Phase 3: Enforcement & Verification
- [ ] Update `.eslintrc.json` (or equivalent) to include `@typescript-eslint/no-var-requires` and `no-require-imports`.
- [ ] Run `npm run lint` to verify compliance.
- [ ] Run `npm build` or `npm run dev` to ensure no runtime errors due to circular dependencies.
- [ ] Run existing tests to ensure no regressions.

## Verification Criteria
- `grep -r "require(" src/` returns no results (excluding legitimate edge cases if approved).
- All imports in `src/` follow the `import { ... }` pattern.
- ESLint passes without require-related errors.
- The application starts and runs tests successfully.
