# Runtime Test Bench Audit — 2026-05-13

This note records the audit for `runtime-test-bench` requested by WOD-214 / WOD-238.

## Summary

`runtime-test-bench` no longer has a real runtime boundary in the current codebase.

The production-facing pieces were already extracted into active modules during the earlier subsystem removal, and the remaining references were historical or stale:

- `src/runtime/types/executionSnapshot.ts` is the surviving production contract, already moved into `src/runtime/`
- `src/runtime/hooks/__tests__/useRuntimeExecution.test.ts` already covers the live execution hook
- `src/runtime-test-bench/hooks/__tests__/useRuntimeExecution.test.ts` was a duplicate copy of that live test under the retired path
- `README.md` still advertised a `docs/Runtime_Test_Bench.md` guide, but that file no longer exists

## Consumer inventory

### Production/runtime imports

`rg "from ['\"]([^'\"]*runtime-test-bench)|runtime-test-bench" src tests stories e2e` found no production or story imports from `runtime-test-bench`.

The only active runtime-facing survivor is the already-promoted type module:

- `src/runtime/types/executionSnapshot.ts`

### Remaining non-historical references before cleanup

- `README.md` linked to missing `docs/Runtime_Test_Bench.md`
- `src/runtime-test-bench/hooks/__tests__/useRuntimeExecution.test.ts` duplicated the canonical runtime hook test
- `src/runtime/types/executionSnapshot.ts` still described itself as extracted from the old subsystem

### Historical references intentionally kept

These remain as history, not live dependencies:

- `docs/reports/architecture-debt-report-2026-04-29.md`
- `docs/reports/architecture-backlog-walkthrough.md`
- `docs/audits/color-audit.md`
- `docs/audits/color-remediation-plan.md`

## Decision

Decommission the subsystem fully instead of rewiring it.

Why:

1. There are no active consumers of `runtime-test-bench`
2. The only production contracts worth keeping were already moved into `src/runtime/`
3. The remaining tracked artifact under `src/runtime-test-bench/` was duplicate test coverage, not a live dependency
4. Keeping the retired path around increases the chance that future work accidentally depends on dead architecture

## Cleanup applied

- Removed `src/runtime-test-bench/hooks/__tests__/useRuntimeExecution.test.ts`
- Removed the stale Runtime Test Bench entry from `README.md`
- Updated the `executionSnapshot` header comment to describe its current ownership
- Added this audit note to `docs/reports/README.md`

## Verification

Commands run:

```bash
rg -n "runtime-test-bench|Runtime Test Bench|Runtime_Test_Bench" src tests stories e2e docs README.md
bun test src/runtime/hooks/__tests__/useRuntimeExecution.test.ts
```

Expected state after cleanup:

- no live code imports from `runtime-test-bench`
- runtime hook coverage remains under `src/runtime/hooks/__tests__/useRuntimeExecution.test.ts`
- historical report references remain for auditability only

## Follow-up impact

This clears the path for WOD-239 by removing one more stale architecture surface area from the runtime/storybook boundary.
