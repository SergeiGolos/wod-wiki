# Field catalog service, typeahead, and discovery surfaces

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 14
Prerequisites: [Field discovery and catalog contract](../assets/field-discovery-contract.md); [Shared query execution contract](../assets/shared-execution-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

Field and categorical-value discovery reads only the catalog stores: typeahead offers normalized typed variants, units, and observed categorical values with bounded lookups and zero event/result history scans, in every query-authoring surface.

## Scope

1. **Consumer interface.** `IFieldCatalog` in `packages/wql` (alongside the store seams in [`stores.ts`](../../../../packages/wql/src/stores.ts)): typed-variant lookup by path, bounded normalized-path prefix listing, categorical-value prefix lookup scoped to a field. **No IndexedDB access inside `packages/wql`** — the app injects an implementation over the V17 stores, wired in [`apps/playground/app/services/queryService.ts`](../../../../apps/playground/app/services/queryService.ts).
2. **Authoring completion.** Extend the [`language.ts`](../../../../packages/wql/src/language.ts) completion source (`WqlCompletionOptions`/`wqlCompletionSource`) so metric and filter-value suggestions are catalog-backed: canonical names with original spelling/type/unit context, typed variants listed separately, categorical values (e.g. shoe names — original spelling, not camelCased), bounded result counts with narrower-prefix continuation. Keep existing effort-name and static vocabulary providers working alongside.
3. **Composer.** [`queryClauses.ts`](../../../../packages/ui/src/composer/queryClauses.ts) metric options gain catalog-backed dynamic entries (typed variants incl. `field(...)`-selectable alternatives) while `vocabulary.ts` built-ins stay authoritative for built-ins.
4. **Explorer discovery.** An available-fields view in the analytics explorer ([`AnalyticsExplorerPage`](../../../../apps/playground/app/views/analytics/AnalyticsExplorerPage.tsx)) listing discovered fields with kind, dimension, observed units, and source-role provenance — catalog reads only.
5. **Change notification.** Catalog commits signal interested consumers (invalidation wiring lands with ticket 20; here: typeahead providers observe the injected catalog's change notification so new fields appear without reload).

## Clean cutover

- Static-only metric vocabulary in completion paths is superseded (built-ins remain, discovered entries join them); remove any code path that enumerates events/notes to produce suggestions.
- No full-catalog loads: every consumer uses the bounded prefix lookups.

## Acceptance scenarios

From the [field discovery contract](../assets/field-discovery-contract.md) acceptance list:

1. After saving a workout containing `heart_rate`, `heartRate` typeahead offers the field immediately — including when the observation lies outside any selected query time range — without touching the `events` or `results` stores (assert via instrumented store).
2. Numeric and text `score` appear as separate typed variants; `field("score", ...)` alternatives are offered when both exist.
3. Categorical typeahead on an effort/tag field returns previously observed values (original spelling) with bounded results; a removed last support removes the suggestion after the catalog commit notification.
4. The editor preview, composer, and explorer all receive suggestions through the injected catalog; the query package itself performs no browser-storage access (package-boundary test).
5. Unknown-field references remain syntactically valid everywhere; typeahead absence never produces a diagnostic.
