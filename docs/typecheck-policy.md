# TypeScript Verification Policy

Repo-wide TypeScript verification with `bun x tsc --noEmit -p tsconfig.json` is currently a diagnostic baseline, not a release gate.

As of 2026-05-26, the repo-wide command reports 819 errors across test, storybook, playground, `src/testing`, and `src/timeline` surfaces. See [WOD-733](/WOD/issues/WOD-733) for the tracked baseline restoration work.

## Feature acceptance guidance

- Run the narrowest relevant TypeScript check for the surface you changed.
- Pair TypeScript verification with the relevant unit/component/e2e tests for the feature.
- Treat repo-wide `tsc` output as baseline diagnostics unless the issue explicitly requires restoring the full repo-wide command.
- When the repo-wide baseline is restored, tighten this policy again and re-adopt the root command as the feature gate.
