---
labels: [wayfinder]
title: "Unparented open tickets — impact outline"
tickets: ["#582", "#583"]
resolved: ["#613 (2026-09-03)", "#485 (2026-09-03)"]
status: "No owning map — candidates to charter or close"
audited: 2026-09-01
---

# Unparented open tickets — what they would change

Four open tickets have no wayfinder map. Each is small enough to charter
individually; none belongs to the five open maps.

## #485 — Consistent icon branding across record types (resolved 2026-09-03)

- **Done**:
  - `historyAdapter.ts` maps record types to designated Heroicons: `BeakerIcon` (playground), `DocumentDuplicateIcon` (template), and `BookOpenIcon` (workout note). Unit tests in `historyAdapter.test.ts` verify the icon assignment and title preservation.
  - Storybook alignment complete: `RecordTypeIcons.stories.tsx` provides stories for each record type (`AllRecordTypes`, `PlaygroundEntries`, `NoteEntries`, `TemplateEntries`) demonstrating all three required states: no title (timestamp fallback for playground, 'Untitled workout' for notes/templates), short title, and long title with truncation.
  - Added to Storybook `storySort` under `Gallery/Record Type Icons` (`preview.tsx`).

## #613 — Effort-registry duplication (resolved 2026-09-03)

- **Done**: `apps/playground/src/effort-registry/` completely deleted.
  `CompositeEffortRegistry` moved to `@bitcobblers/wod-wiki-lang` with a pure
  `EffortStorageAdapter` interface. In `apps/playground`, `IndexedDBEffortStorage`
  and `createAppEffortRegistry` factory provide browser IndexedDB persistence
  and markdown-backed bundled seeding. All call-sites across `apps/playground`
  migrated to `@bitcobblers/wod-wiki-lang`, and all 5 unit test suites live in
  `packages/lang/tests/effort-registry/`. Single source of truth achieved.

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

Both #613 and #485 are resolved. Decide #582/#583 as charters or close as speculative.
