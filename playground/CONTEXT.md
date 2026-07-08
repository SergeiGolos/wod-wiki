# Playground App Context

Scope: everything under `playground/` — the consumer app that hosts the editor,
workbench, journal, results UI, cast/sender, and persistence wiring. This is
*not* the public library; for library concerns, read [`src/CONTEXT.md`](../src/CONTEXT.md).
Domain vocabulary that applies repo-wide lives in the root
[`CONTEXT.md`](../CONTEXT.md) — read that first.

## What lives here

- **Routing & entry** — `playground/src/App.tsx`, `playground/src/canvas/` (the
  Markdown-canvas surface), `playground/src/pages/` (PlaygroundLandingPage,
  EffortDetailPage, …).
- **Workbench** — `playground/src/views/workbench/` (selected block, view
  switch, runtime driving, hydration) and `playground/src/views/queriable-list/`
  (journal scrolling, etc.). State is held in `workbenchSessionStore`; the
  runtime is hydrated by a Workbench Effect.
- **Persistence wiring** — `playground/src/services/` builds the
  `IndexedDBStorage` adapter and composes `Persistence` services
  (`IndexedDBNotePersistence`, `playgroundRecorder`).
- **Cast / sender** — `playground/src/cast/` and the `getCastBackend()` factory
  (selected by `VITE_CAST_BACKEND`: `chromecast` / `local` / `auto`).
- **Result recording** — `playground/src/services/resultRecorder.ts` is the
  single playground seam for persisting a `WorkoutResult`. Owns identity
  resolution (Note Identity, Block Content Id, Section Id).

## Key seams (this surface only)

| Seam | File | Contract |
|---|---|---|
| Note identity | `playground/src/lib/noteIdentity.ts` | `parseNoteId` / `noteRefToPath` — single home for composite-id parse and kind→route rule. |
| Result recorder | `playground/src/services/resultRecorder.ts` | `createResultRecorder(sink)` is testable with an in-memory sink; `playgroundRecorder` is the production instance. |
| Cast backend | `playground/src/cast/getCastBackend.ts` | Reads `VITE_CAST_BACKEND`; returns `ChromecastBackend` or `LocalTabBackend`. |
| Workbench session | `playground/src/state/workbenchSessionStore.ts` | The coherent editing-session state. Exercisable without React. |

## Conventions

- **Use the test harness** — `tests/harness/` (`BehaviorTestHarness`,
  `MockBlock`, `RuntimeTestBuilder`) for new behaviors and integration tests.
- **Tests live beside source** — `playground/src/**/*.test.tsx` / `.test.ts`.
  Run with `bun run test:playground`.
- **Persistence tests use `InMemoryStorage`** — never
  `fake-indexeddb`; the test `IStorage` adapter is the seam.
- **Multi-viewport e2e** — layout-affecting changes must cover both
  mobile (375×812) and desktop.
- **No `playground/src/fragments/`** — there is no such directory in the
  library either; metric visualization here reuses `src/components/metrics/`
  and `src/components/molecules/`.

## When something here and in the library disagree

Library files (`src/`) are the canonical source for parser / compiler /
runtime / metric / behavior semantics. Playground files are consumers. If
this surface appears to need a different rule, the resolution is usually a
missing or misnamed contract in the library — escalate via an ADR rather
than papering over it.