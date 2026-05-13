# Architecture Regression Checks

The repo carries two complementary layers of architecture guardrails aimed at the highest-signal debt areas from the April 2026 architecture report.

## Layer 1 — Unit Tests (runs with every `bun run test`)

Fast structural tests that enforce boundaries introduced by WOD-225 and WOD-226:

```bash
bun test src/__tests__/architecture/architecture-regressions.test.ts --preload ./tests/unit-setup.ts
```

What these unit tests enforce:

1. **No retired `runtime-test-bench` imports** — scans live code in `src/`, `tests/`, `stories/`, `e2e/`
2. **Components layer boundary (WOD-225)** — `src/components/` must not import from `runtime/*` directly; use facades/context
3. **Protected barrel shapes** — `src/runtime/compiler/metrics/index.ts` stays empty; `src/runtime/events/index.ts` exports only `EventBus`
4. **Type consolidation presence (WOD-226)** — `src/core/contracts/` directory and canonical files must exist
5. **No duplicate type declarations** — `IMetricContainer`, `IMetricSource`, `IAnalyticsEngine` declared in only one layer

## Layer 2 — Architecture Scripts (CI and ad hoc)

Run them locally with:

```bash
bun run check:architecture
```

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

### 4. Unused exports cannot grow beyond the approved baseline

The check runs `ts-prune` against `src/` (excluding test files) and enforces a numeric baseline.

It does **not** require all unused exports to be removed before progress can continue. It prevents the total unused-export debt from increasing while cleanup work proceeds.

If the command fails, remove newly introduced dead exports or convert them to intentional internal declarations.

The baseline lives in `scripts/check-unused-exports-regressions.cjs` as `UNUSED_EXPORT_BASELINE`.
Only update this number when a baseline reset is intentional and reviewed (for example after a large refactor that legitimately changes the debt count).

## When to update the baseline

Only update the cycle baseline when a structural change is intentional and reviewed.

Typical cases:

- you deliberately introduce a temporary cycle as part of a larger staged refactor
- you move or rename modules in a way that changes the remaining known cycle signatures

Do **not** update the baseline just to silence an unexpected CI failure. Fix the regression first, or document why the new baseline is the right architecture tradeoff.

## Related commands

- `bun run check:storybook-deps` — Storybook dependency hygiene (also enforced in CI via `.github/workflows/_build-bun.yml`)
- `bun run check:architecture-regressions` — architecture regressions check (cycles + retired boundaries + protected barrels)
- `bun run check:unused-exports` — ts-prune based unused export guardrail (count regression gate)
- `bun run analyze:deps` — ad hoc circular dependency inspection output from `madge`
