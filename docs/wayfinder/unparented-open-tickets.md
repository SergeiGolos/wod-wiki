---
labels: [wayfinder]
title: "Unparented open tickets — impact outline"
tickets: ["#485", "#613", "#582", "#583"]
status: "No owning map — candidates to charter or close"
audited: 2026-09-01
---

# Unparented open tickets — what they would change

Four open tickets have no wayfinder map. Each is small enough to charter
individually; none belongs to the five open maps.

## #485 — Consistent icon branding across record types (partial)

- Done: app-side icons already match the issue's proposal — `historyAdapter.ts`
  returns Beaker (playground) / DocumentDuplicate (template) / BookOpen (note),
  rendered via `historyEntryToListItem` in `HistoryPostList.tsx`, unit-tested.
- Remaining change if done: Storybook alignment — no HistoryEntry/icon stories
  exist (`apps/storybook` covers only WQL/timer/analytics/workbench). The work
  is authoring stories that pin the per-record-type icon contract.

## #613 — Effort-registry duplication (relocated, not fixed)

- The original `src/services` vs `src` duplication is gone, but the debt was
  reborn by the monorepo split: `apps/playground/src/effort-registry/`
  (Composite/InMemory/IndexedDB registries, resolver, fuzzy match, bundled
  data, 6 test files) coexists with `packages/lang/src/effort-registry/`, and
  the app imports its local copy (`@/effort-registry` in
  `services/queryService.ts`) instead of the package.
- Change if done: delete the app-local copy, point imports at
  `@bitcobblers/wod-wiki-lang`. One source of truth for effort resolution;
  removes a whole parallel test surface.

## #582 — Runtime Session implementation (design proposal, never built)

- Today: no `RuntimeSession`/`IRuntimeSession` module exists; the session
  surface is spread across `RuntimeFactory`, `RuntimeLifecycleProvider`,
  `useRuntimeExecution`, `useWorkbenchRuntime`.
- Change if done: consolidates lifecycle/session state behind one module in
  `packages/engine` — structural, touches every runtime consumer.

## #583 — Metric Presentation deep dive (design proposal, never built)

- Today: display rules are scattered — `review-grid`
  `column-definition-language.tsx`, `MetricPill`, `metricColorMap`,
  per-widget interpreters.
- Change if done: a single presentation policy/token module decides how metrics
  render; the scattered call-sites become consumers. Large blast radius;
  deserves its own charter before any code moves.

## Recommendation

Charter #613 first (mechanical, high-value). Decide #582/#583 as charters or
close as speculative. #485 is a half-day of story authoring once touched.
