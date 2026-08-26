---
state: closed 2026-08-26
assignee: serge # claimed 2026-08-26
labels: [wayfinder:task]
title: "Release the language train"
blocked-by: ["009-ast-only-structured-interface-c6"]
---
## Resolution

Published: `@bitcobblers/*` at **0.10.41** (user, from engine main `1b9b771`).
Tarball verified to carry the wql train — `serialize`, `normalizeWql`,
`WQL_SOURCE_VALUES`, `QueryWindow` present in the published wql dist; core
pinned `^0.10.41`.

**Release finding (RC smoke)**: the umbrella `@bitcobblers/wod-wiki-engine`@0.10.41
— the package the app imports — was missing the entire new wql surface (its
re-export list predated the train). Fixed on main `588a0fd`+`79c6d18` with
train-surface guards in `engine-reexports.test.ts`; review round restored two
anchor-slip regressions (`type ComparisonOp` re-export, `buildDashboardDocument`
pin). **Action: republish at 0.10.42 before ticket 011 consumes the train** —
npm publish is the user's (credentials).

Release checklist:
1. Engine suite green: root 1197/0, wql 274/274, engine 34/34.
2. Dist chain rebuilt and verified: core dist carries `UnifiedEventRecord`
   (ticket 004's stale-dist finding does not reproduce); full build clean.
3. Version stamped and published at 0.10.41 (user).
4. Storybook smoke: vitest 15/15, static `storybook build` succeeds; RC
   browser smoke on the published ui@0.10.41 + fixed umbrella renders
   `WqlComposer` with diagnostics and passes all five train behaviors
   (C2 advisory + source folding, bare-rows normalize, C6 serialize fixed
   point, C4 rows family).
5. The 24 pre-existing ui test failures (RowsRun shape drift): **resolved on
   the train** — `packages/ui` vitest 41/41, no failures to record.

## Question

Publish from engine **main** — the store is already merged and consumed
(app on `^0.6.36`) — as the release carrying the seven language changes
with the C2 compatibility normalizer active:

1. Engine suite green (wql, core, lang, ui, engine packages).
2. Rebuild the full dist chain before publishing — core dist was stale on
   main (ticket 004 finding: `UnifiedEventRecord` missing from core dist
   broke wql's dts build until core was rebuilt).
3. `stamp-version.ts`; publish `@bitcobblers/*` packages (next minor).
4. Storybook smoke / e2e pass on the release candidate.

5. The ui package ships with 24 pre-existing test failures (RowsRun shape
   drift, byte-identical set before/after C5) — either fix on the train or
   record as a known-broken suite at publish time.
