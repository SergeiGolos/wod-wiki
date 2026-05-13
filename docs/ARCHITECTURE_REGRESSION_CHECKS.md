# Architecture Regression Checks

The repo now carries a small set of architecture guardrails aimed at the highest-signal debt areas from the April 2026 architecture report.

Run them locally with:

```bash
bun run check:architecture
```

## What the check enforces

### 1. No new circular dependencies in `src/`

The check runs `madge --circular` and compares the result to the current approved baseline.

It does **not** require the repo to be cycle-free yet. It prevents backsliding while the remaining known cycles are worked down.

If you intentionally remove existing cycles, the check will still pass.

If you introduce a new cycle, the command fails and prints the full cycle path.

### 2. No live imports from the retired `runtime-test-bench`

`runtime-test-bench` was decommissioned in favor of the runtime/workbench surfaces. The check scans `src/`, `tests/`, `stories/`, and `e2e/` for import/require statements that point back to that retired boundary.

If the command fails here, move the dependency to its active runtime/home module instead of reviving the old path.

### 3. Protected barrel surfaces stay narrow

Two barrels are intentionally locked down because they were previously large sources of dead re-exports:

- `src/runtime/compiler/metrics/index.ts` must remain empty
- `src/runtime/events/index.ts` must only export `EventBus`

If one of these files grows again, the check fails with the expected vs actual export surface.

## When to update the baseline

Only update the cycle baseline when a structural change is intentional and reviewed.

Typical cases:

- you deliberately introduce a temporary cycle as part of a larger staged refactor
- you move or rename modules in a way that changes the remaining known cycle signatures

Do **not** update the baseline just to silence an unexpected CI failure. Fix the regression first, or document why the new baseline is the right architecture tradeoff.

## Related commands

- `bun run check:storybook-deps` — Storybook dependency hygiene added in the previous guardrail pass
- `bun run analyze:deps` — ad hoc circular dependency inspection output from `madge`
