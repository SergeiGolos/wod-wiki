# Shared query execution and surface cutover

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 15, 17, 18
Prerequisites: [Shared query execution contract](../assets/shared-execution-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

One execution path — `QueryDocumentRunner` — serves the Explorer, dashboard route, embedded note queries, and CodeMirror previews. The duplicate playground dashboard model is deleted (finding 3.9): tokens reach editor previews, `rows:` renders as rows, host ranges stop overriding explicit query ranges, rollup prerequisites are AST-detected, errors are per-widget badges, and widgets consume structured results without reaggregation.

## Scope

1. **`QueryDocumentRunner`** (new module in `packages/wql` dashboard area): per document run — token substitution (`substituteTokens` with active parameter values); AST rollup inspection `consumesRollupFacts(parsed)` replacing string sniffing, triggering the host's `onEnsureRollupFacts()` once when `calc.acwr`-class keys are consumed; one captured execution context (12); range precedence explicit query > block defaults > host (12's fixed `windowRange`); family dispatch: `aggregate` → aggregate run, `find` → `runFind`, `rows` → `runRows` (cross-workout → `TabularResult`, single-session → `RowsQueryResult`); document execution via 17's document model returning `DocumentResult`/`TabularResult`; injected stores, catalog (15), and evaluator (17) — zero browser-storage coupling in the package.
2. **Playground cutover:** delete `apps/playground/src/lib/dashboard/*` (model, parser, scaffold, frontmatter, noteOps); migrate its consumers ([`DashboardViewPage`](../../../../apps/playground/app/views), `WidgetComposerDialog`, `QueryToDashboardDialog`, dashboardNotes service, catalog tests) to `packages/wql/src/dashboard`. The dashboard route stops forcing a page-level window over query-level ranges; `useAnalyticsQueries` delegates to the runner.
3. **Editor preview parity** ([`query-block-preview.tsx`](../../../../packages/ui/src/extensions/query-block-preview.tsx), [`QueryBlockView`](../../../../packages/ui/src/blocks/QueryBlockView.tsx)): the CM6 preview receives note frontmatter tokens from the editor document state and executes through the same runner — no unknown-token badges for valid `$name` references; interactive raw-text ↔ live-preview toggle retained.
4. **Widget decoupling** (`DashboardView`, widget components): widgets render `DocumentResult`/`TabularResult` directly — switching compatible widget types never reaggregates; charts zero-fill missing in-range positions (never out-of-scope dates); tables render `—` for absent; scalar widgets format unrounded values per 13's unit defaults; per-widget localized error badges isolate failures (one broken query never takes down the dashboard). Add scatter and multi-axis timeseries renderers (roadmap Phase 5.4) consuming the same result contracts.
5. **Rollup driver wiring:** `onEnsureRollupFacts` invokes the currently orphaned [`computeWorkloadRollups`](../../../../apps/playground/src/services/analytics/rollup/workloadRollup.ts) recompute-on-open path so `calc.acwr`/`monotony`/`strain` queries see fresh rollup facts (recompute-on-open only, no scheduler).
6. **Unit preference cutover:** migrate all [`useAnalyticsUnitPreference`](../../../../packages/ui/src/widgets/useAnalyticsUnitPreference.tsx) callers to ticket 13's system-default output table; retire the kg/lb-only API.

## Clean cutover

- `.includes('calc.')` detection, the duplicated dashboard model, the host-range override, and the synthetic empty-aggregate rows stub are all removed — no compatibility shims.
- `packages/ui` and `apps/playground` perform no execution loops or token replacement of their own; the runner is the only entry point (enforce by removing the superseded paths, not by convention).

## Acceptance scenarios

From the [shared execution contract](../assets/shared-execution-contract.md) and roadmap Phase 3:

1. `apps/playground/src/lib/dashboard` no longer exists; all imports resolve to `@bitcobblers/wod-wiki-wql` (Phase 3 acceptance).
2. A note with a tokenized query and a `rows:` block renders identically in the editor preview and on `/dashboard/:slug` — same numbers, same layout semantics, tokens resolved in both (Phase 3 acceptance).
3. A dashboard query referencing `calc.acwr` triggers exactly one rollup-ensure per document run (AST detection, no string match).
4. A `rows:segment{...}` widget on a dashboard renders the cross-workout table via `runRows` — not an empty aggregate.
5. An explicit `last 12w` inside a widget survives a shorter host range; a widget without a range follows the host; both hold in Explorer, dashboard, and preview alike.
6. A division-by-zero formula badges only its own widget with the diagnostic; neighboring widgets render normally.
7. Switching a query block's fence suffix from `table` to `timeseries` changes presentation only — values, units, and group identity are byte-identical.
8. Editor previews show typeahead from the injected catalog (15) with no IndexedDB access from `packages/wql`.
9. kg/lb preference removal: distance output defaults to `m`, mass to `kg`, from the shared table — no first-record or widget-specific fallback remains.
