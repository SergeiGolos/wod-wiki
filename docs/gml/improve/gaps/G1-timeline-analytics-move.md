# G1 — Move projection engines out of `timeline/` ✅ DONE (2026-06-20)

> Source: minimax [#02](../../../minimax/improve/02-timeline-analytics-misnomer.md).
> Not in the global plan. **Severity:** Low (housekeeping). **No dependencies.**

### Result

* 6 engines + canonical `ProjectionResult` moved to `src/core/analytics/engines/` (and `ProjectionResult.ts`)
* `src/timeline/analytics/` subtree deleted
* 6 import-path updates across `StandardAnalyticsProfile`, 4 component consumers, 2 test files
* 14 engine tests + 25 `StandardAnalyticsProfile` tests pass
* Gates: `bun test ./src` 2820/1 (baseline), storybook 212/212, playground + storybook builds green

## Problem

Six projection engines and the canonical `ProjectionResult` type live under
`src/timeline/analytics/analytics/engines/`. The `src/timeline/` subtree is
named for `TimelineView.tsx` and `GitTreeSidebar.ts` — the engines have
nothing to do with either. A 6-line re-export shim in
`src/core/analytics/ProjectionResult.ts` carries a `// Future: move the
canonical definition here` comment that was never executed.

`StandardAnalyticsProfile` imports the engines across 3–4 directory levels;
every engine reaches back into `core/` via `../../../../`. Round-trip
structural noise.

## Modules involved

| Module | Size | Role |
|--------|------|------|
| `src/timeline/analytics/analytics/ProjectionResult.ts` | 40 ln | Canonical type (in the wrong place) |
| `src/core/analytics/ProjectionResult.ts` | 6 ln | Re-export shim ("Future: move here") |
| `src/timeline/analytics/analytics/engines/*.ts` | 6 files | Rep, Distance, Volume, SessionLoad, MetMinute, TIS |
| `src/core/analytics/StandardAnalyticsProfile.ts` | 74 ln | Imports engines via `../../../../` |
| `src/core/analytics/AnalyticsEngine.ts` | 151 ln | Imports `ProjectionResult` via the shim |

## Solution

Move the canonical `ProjectionResult` and all six engines into
`src/core/analytics/engines/`. Delete the shim. Delete the now-empty
`src/timeline/analytics/` directory.

## Implementation

### Steps

1. Move `ProjectionResult.ts` from `timeline/analytics/analytics/` to
   `core/analytics/ProjectionResult.ts` (overwrite the shim with the
   canonical definition).
2. Create `src/core/analytics/engines/` and move the six engine files there.
3. Rewrite imports in `StandardAnalyticsProfile.ts` (now `./engines/...`),
   `AnalyticsEngine.ts` (now `./ProjectionResult`), and any engine test
   files.
4. Search for path-aliased imports (`@/timeline/analytics/...`) and rewrite.
5. Delete `src/timeline/analytics/` directory.
6. Verify `src/timeline/` now contains only `TimelineView.tsx`,
   `GitTreeSidebar.ts`, and `index.ts`.

### Tests

No new tests — the existing engine tests in `tests/parser-compliance/` and
`tests/cast-integration/` exercise the engines; they pass after the import
rewrite.

### Acceptance

- `bun run test` green.
- `bun x tsc --noEmit` clean.
- `src/timeline/analytics/` does not exist.
- `src/core/analytics/ProjectionResult.ts` is the canonical definition (no
  re-export).

### Risks

- Low. Only `StandardAnalyticsProfile`, `AnalyticsEngine`, and engine test
  files import from the misnomered subtree.
- Watch for `@/`-aliased imports that bypass relative paths.

## Story

**G1** — no dependencies. Safe to execute in wave 0 alongside the global
plan's safe deletions, or anytime.
