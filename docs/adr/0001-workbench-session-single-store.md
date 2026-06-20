# ADR-0001 — Workbench state is one Workbench Session, not domain-split stores

> **Status:** accepted
> **Date:** 2026-06-20

## Context

Workbench state is split across three modules by category: `WorkbenchContext`
(741 ln, owns the setters), `workbenchSyncStore` (272 ln, owns the reads), and
`useWorkbenchEffects` (~213 ln, the bridge between them). The setter/read line
is unstable — `viewMode` is mirrored Context→Store via an effect
(`WorkbenchContext.tsx:503-505`); `completeWorkout` reads across Context, the
Store, and `localStorage` (`WorkbenchContext.tsx:517-588`).

Two prior surveys disagreed on the cure. GML #1 proposed consolidating into one
state module; minimax #03 proposed splitting into four domain stores
(`runtimeSyncStore`, `documentStore`, `analyticsStore`, `viewModeStore`), each
with one owner, citing the cast refactor (which pulled `castTransport` out of
the god store) as precedent.

The deciding evidence is in the effects bridge. It is **not** four independent
domains — it is one coupled state machine:

- Document selection drives runtime init (`useWorkbenchEffects.ts:115-130`).
- The runtime drives live analytics (`:141-172`).
- Persisted `currentEntry.logs` drives analytics as a **fallback when the
  runtime is disposed** (`:167-171`).
- Navigation / runtime re-init clears analytics (`:75-83`, `:120`).

Splitting `analytics` from `runtime` severs couplings that bridges would have to
re-establish — the same disease being cured, at smaller scale. minimax #03
itself flagged that "analytics survives runtime disposal" is the reason the two
slices are co-located today.

The cast-refactor precedent, read carefully, cuts toward consolidation: it
pulled `castTransport` out because that domain had a *distinct owner*
(`CastSessionManager`) and a *network lifetime*. The remaining workbench
domains have no distinct owner — they are all the workbench session itself.

## Decision

Consolidate workbench state into one module — the **Workbench Session**
(`workbenchSessionStore`, per `CONTEXT.md`) — owning the session state, its
derivations, and the actions on it. Dissolve `WorkbenchContext` and
`useWorkbenchEffects`. Keep a thin **Workbench Effect** React adapter for the
genuinely lifecycle-bound work only (runtime create/dispose, wake-lock,
before-unload, unmount reset, route-read).

Persistence and loads go through injected collaborators (`INotePersistence`,
`IContentProvider`, `INowProvider`); selection/view changes emit navigation
intents through an injected `navigate` callback. The selector-subscription
render optimisation that originally justified the category split becomes an
**internal** concern of the store, not a structural fact every consumer crosses.

**Reject** the decompose-into-domain-stores direction (minimax #03).

## Consequences

- **Positive.** One home for "what is the workbench state, and what can I do to
  it." `completeWorkout` reads one module. The session is exercisable without
  React (injected collaborators; in-memory adapters for tests). The unstable
  `viewMode` / `selectedBlock` mirror disappears.
- **Negative.** One large store (~500 ln once the setters and derivations move
  in). Locality holds only because "workbench session" is a single coherent
  concept — which the coupling evidence above establishes. If a future domain
  with a distinct owner/lifetime appears, pull it out (the cast-refactor
  pattern), rather than splitting the session along category lines.
- **Neutral.** Cast bridges keep their 6 readable selectors (see ADR-0002 and
  Finding 05); the field set is stable.

## Related

- [Finding 01 — Workbench state layer](../findings/01-workbench-state-layer.md)
- Supersedes the decompose direction of [minimax #03](../minimax/improve/03-workbench-sync-store-split.md)
- [GML #1 — Workbench state layer](../gml/improve/01-workbench-state-layer.md)
- [ADR-0002 — Workbench Session observes the runtime](./0002-workbench-session-observes-runtime-via-observer-seams.md)
