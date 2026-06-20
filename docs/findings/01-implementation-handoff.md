# Handoff — implement the Workbench Session deepening (Finding 01)

> Paste-ready brief for a fresh implementation session. It is self-contained:
> every decision, contract, and verification gate is named here or in the linked
> artifacts. Do not re-derive the design — it is settled (ADRs below).

---

## Your objective

Implement **Finding 01**: consolidate the workbench state layer — today three
carriers (`WorkbenchContext.tsx` 741 ln setters, `workbenchSyncStore.ts` 272 ln
reads, `useWorkbenchEffects.ts` ~213 ln bridge) — into **one Workbench Session
module**, plus a thin lifecycle adapter. This completes the deferred **S1b/S1c**
work (S1a — single-sourcing `selectedBlock`/`viewMode` — already shipped).

## Read first (grounding — do not skip)

1. [`CONTEXT.md`](../../CONTEXT.md) — domain terms, esp. **Workbench Session**
   and **Workbench Effect** (added for this work). These define the target
   vocabulary; use it.
2. [`docs/findings/01-workbench-state-layer.md`](./01-workbench-state-layer.md)
   — the full finding, **including the appended `## Cross-finding contracts`
   and `## C4 diagrams` sections**. The contracts are load-bearing; violating
   them breaks other findings.
3. [`docs/adr/0001-workbench-session-single-store.md`](../adr/0001-workbench-session-single-store.md)
   — **Consolidate, do not decompose.** The runtime↔analytics↔entry coupling
   is the evidence. Do NOT split into domain stores.
4. [`docs/adr/0002-workbench-session-observes-runtime-via-observer-seams.md`](../adr/0002-workbench-session-observes-runtime-via-observer-seams.md)
   — The session **subscribes** to `subscribeToOutput` + `subscribeToStack`
   (reactive, post-mount), it does **not** poll `getOutputStatements()`/`stack`
   on a tick. Live + log-fallback analytics unify on one derivation.
5. [`docs/gml/improve/01-workbench-state-layer.md`](../gml/improve/01-workbench-state-layer.md)
   — the original S1a/S1b/S1c step breakdown; S1a is done, S1b/S1c are your work.
6. [`docs/gml/improve/EXECUTION-LOG.md`](../gml/improve/EXECUTION-LOG.md) —
   baseline test counts and the prior session's drift notes.

## Decisions already made — do not re-litigate

- **One store, not four.** Evolve `workbenchSyncStore.ts` in place into the
  Workbench Session (absorb Context state + setters + derivations). Rename the
  file to `workbenchSessionStore.ts` and update import sites. (It already holds
  the selectors + the S1a single-sourced fields — minimal reader churn.)
- **Injected collaborators** — the store is created by a factory
  `createWorkbenchSessionStore({ notePersistence, provider, nowProvider,
  navigate })` (vanilla zustand `createStore`). A thin `WorkbenchSessionProvider`
  creates it with real deps resolved from props and exposes `useWorkbenchSession`
  via context. Tests call the factory directly with in-memory deps
  (`MockContentProvider`, a fake `INotePersistence`, a `navigate` that captures
  intents, a `nowProvider`).
- **Reactive runtime observation** — `subscribeToOutput` (accumulate an output
  list) + `subscribeToStack` (derive active segments from `snapshot.blocks` +
  the leaf's `sourceIds`). Analytics derive from "an output list" — fed live by
  the subscription, from `currentEntry.results.logs` when no runtime. One
  derivation, not two.
- **Observe vs drive.** The session only **observes** the runtime; a Workbench
  Effect **drives** it via execution controls (`useRuntimeExecution`). Keep that
  separation.
- **`NavigationIntent`** — lift the shape `useReactRouterNavigation` already has
  (`goTo(mode,{noteId})`, `goToTrack(noteId,sectionId)`) into one named type;
  the session's `navigate(intent)` emits it, the adapter translates to
  `react-router`. (Finding 02 will consume the same vocabulary.)
- **Delete the `viewMode` Context→Store mirror** (`WorkbenchContext.tsx:503-505`)
  and the `selectedBlock` re-derivation — the store is canonical.

## Cross-finding contracts you MUST preserve

| Boundary | Preserve | Why |
| --- | --- | --- |
| **→ ScriptRuntime (03)** | `subscribeToOutput` + `subscribeToStack` stay the read seam; post-mount invariant honored. | 01 lands **before** 03. Do NOT narrow `IScriptRuntime` — that is Finding 03, separate, later. Your subscription call-sites are what 03 will later move to its observer collaborator. |
| **→ Cast (05)** | 6 readable selectors stay readable: `runtime`, `execution.status`, `viewMode`, `selectedBlock`, `documentItems`, `analyticsSegments`. | `WorkbenchCastBridge`/`EditorCastBridge` (Workbench Effects) read these → `workbenchModeResolver` → wire. The receiver consumes the resolved message; keep the selectors stable. |
| **→ Canvas (04)** | `selectedBlock`, `viewMode`, `documentItems` stay readable. | `MarkdownCanvasPage` reads them. |
| **→ App.tsx (02)** | `NavigationIntent` is the shared route vocabulary. | Don't invent a second one. |

## Implementation steps — green between each (`bun run test`)

**Step 0 — Scaffold the session store.** Create
`createWorkbenchSessionStore(deps)` + `WorkbenchSessionProvider` +
`useWorkbenchSession`. Initially it just wraps the existing `workbenchSyncStore`
state and forwards. Mount the provider where `WorkbenchContext` is mounted.
Build green.

**Step 1 — Migrate buckets (S1b), one at a time.** Order:
`content/document → results → panel → history → attachments`. For each:
move the `useState` + setter from `WorkbenchContext` into the store as a field +
action; move its **derivation** effects (document-from-content, dirty-flag,
block-shift healing) into store logic (compute-on-set or selectors); move its
**persistence/load** effects into store actions over the injected collaborators
(autosave debounce becomes an internal timer; `completeWorkout`,
`addAttachment`/`deleteAttachment`, content/history loads become actions). Keep
the build green after each bucket. **Move side-effects, never drop them.**

**Step 2 — Reactive analytics + segments.** Replace the polling effects
(`useWorkbenchEffects.ts:141-193`) with `subscribeToOutput` (accumulate outputs)
+ `subscribeToStack` (derive `activeSegmentIds`/`activeStatementIds` from the
snapshot). Unify the live + log-fallback paths on one "derive from output list"
derivation. Verify analytics still match over `tests/runtime-compliance/`.

**Step 3 — Dissolve the bridge (S1c).** Delete `useWorkbenchEffects`. Its
hydration effects (runtime/execution/handles) become the thin adapter's runtime
hydration; its lifecycle effects (wake-lock, beforeunload, unmount reset,
route-read) become the adapter. Delete the `viewMode` mirror.

**Step 4 — Non-React test.** Write `workbenchSessionStore.test.ts`: create the
store with in-memory collaborators; assert `loadEntry` populates state,
`setContent` derives document + fires debounced autosave on the fake provider,
`completeWorkout` calls `mutateNote` with analytics captured from store state,
`setSelectedBlockId`/`setViewMode` emit navigation intents, and the reactive
analytics derivation (feed outputs via the subscription; verify logs fallback
when no runtime). No React rendering.

**Step 5 — Retire `WorkbenchContext`.** Once all buckets migrated and the 2
consumers (`Workbench.tsx`, the adapter) read from the session, delete
`WorkbenchContext.tsx` (or shrink to a scoping provider if something still needs
React-context scoping). Update `useWorkbench` callers to `useWorkbenchSession`.

## Definition of done

- `bun run test ./src` green — no new failures beyond the documented baseline.
- `bun x tsc --noEmit` clean on the touched surface.
- `bunx vitest run --config vitest.storybook.config.js` green (workbench is the
  app's heart; stories must render).
- Playground builds (`bun x vite build --config playground/vite.config.ts`).
- `tests/runtime-compliance/` unchanged-better (reactive analytics must not
  regress snapshot/output behaviour).
- `workbenchSessionStore.test.ts` passes — the session is exercisable without
  React.
- `completeWorkout` reads one module. The `viewMode` mirror is gone.
- The 4 cross-finding contracts above are intact (cast selectors readable;
  runtime observation via the two subscriber seams; canvas selectors readable;
  `NavigationIntent` is the one route vocabulary).

## Baseline (2026-06-20, from EXECUTION-LOG.md)

- `bun test ./src` — 2820 pass / 1 fail (pre-existing `AggregateError` in
  `assertions.test.ts`; do not "fix" it as part of this).
- Storybook — 55 files / 212 tests pass.
- `runtime-compliance` — 394 pass / 17 fail (pre-existing metric-cascade +
  perf; do not regress further).

## Out of scope (separate findings — do not expand into them)

- **Finding 02** (App.tsx god component) — consume `NavigationIntent`, don't
  refactor App.tsx here.
- **Finding 03** (narrow `IScriptRuntime`) — lands **after** this; your
  subscription call-sites are the handoff point.
- **Finding 04** (canvas), **05** (cast receiver + `bootTimeoutRef` bug),
  **06** (dead-code cleanup) — untouched by this work.

## Risks to respect

- `WorkbenchContext.tsx` is the single biggest churn hotspot in the library tree
  — **small bucket-by-bucket steps, build green between each** (S1a proved the
  pattern).
- The effects do real persistence/attachment/history work — **move** it, don't
  drop it.
- Cast bridges read 6 store fields — keep that set stable through the migration.
- The runtime instance is React-bound (`dispose()` lifecycle) — hydrate it from
  the adapter; never try to own it in the plain store.
- The post-mount snapshot ordering is load-bearing for Chromecast — your
  `subscribeToStack` consumer must tolerate the post-mount contract (G3), not
  assume pre-mount state.
