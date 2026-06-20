# Handoff — decompose `MarkdownCanvasPage` (Finding 04)

> Paste-ready brief for a fresh implementation session. Self-contained: every
> decision, contract, and gate is named here or in the linked artifacts. Do not
> re-derive the design — the decomposition is settled.

---

## Your objective

Implement **Finding 04**: decompose `playground/src/canvas/MarkdownCanvasPage.tsx`
(538 ln, 99.8th-%ile churn — 29 hook calls doing 5 sub-jobs) so the page becomes
a **layout composition**, with its cohesive concerns pulled behind focused hooks
and a stateless panel component. This is the most self-contained finding: it is
**decoupled from the Workbench Session (01) and ScriptRuntime (03)**, and
**insulated from App.tsx (02)** by a stable prop interface.

## Read first (grounding — do not skip)

1. [`docs/findings/04-canvas-page-decomposition.md`](./04-canvas-page-decomposition.md)
   — the finding. **Read the corrected `contentOverride` note** (it is LIVE, not
   dead — three prior docs got this wrong).
2. [`docs/findings/02-implementation-handoff.md`](./02-implementation-handoff.md)
   — for the prop contract: App.tsx passes `page`, `wodFiles`, `theme`,
   `workoutItems`, `onSelect` to `MarkdownCanvasPage`. 02's dedup preserves
   these; 04 keeps this interface.
3. [`CONTEXT.md`](../../CONTEXT.md) — domain vocabulary.

## Decisions already made — do not re-litigate

- **Split into focused hooks** (not fold into `useCanvasRuntime`). The page's
  editor-source bookkeeping is a *different concern* from runtime/panel-mode;
  folding it would create a ~300-ln god hook that repeats the page's disease.
  - **`useCanvasRuntime` — unchanged.** It already owns panel-mode + the
    canvas-scoped runtime (160 ln, 14-key return). Leave it.
  - **`useCanvasEditorSource` (new)** — owns `editorSource`, `editorOpacity`,
    `isEditorLoading`, `activeSourceKey`, the `swapSource` debounced fade
    (`sourceEditsRef` / `swapTimerRef`), `handleEditorChange`, `resetActiveSource`,
    the dirty flag, **and `contentOverride`** (see the correction below).
  - **`useMobileRunOverride` (new)** — owns the `mobileRunState` `onRun`
    fullscreen override (`MarkdownCanvasPage.tsx:459-473`).
- **`<CanvasPanelContent>` (new component)** — the ~90-line `panelContent` IIFE
  (`:364-454`) extracted into a stateless component driven by `panelMode` /
  `block` / `runState` / render callbacks. Owns no state.
- **`contentOverride` is PRESERVED.** It is live (`HomeView.tsx:22,141` passes
  it; `:192-197` reacts). Move it into `useCanvasEditorSource`. Do **not**
  delete it — that breaks the home-editor search-palette injection.
- **Mobile/desktop is minor.** The two panels already share one
  `<CanvasEditorPanel variant=…>` and differ only in `runState`. At most, pass a
  `runState` chooser to `SplitCanvasTemplate`. Don't over-engineer this.
- **`MarkdownCanvasPage` keeps:** the prop interface, the
  `SplitCanvasTemplate` layout composition, the URL/section nav, and the prose
  panel wiring. It composes the three hooks + `<CanvasPanelContent>`.

## The `contentOverride` correction (load-bearing)

The finding, GML G2, and minimax #06 all call `contentOverride` a dead path and
recommend deleting it. **They are wrong.** `HomeView` (the home/landing canvas)
holds `contentOverride` as live state (`HomeView.tsx:22`) and passes it
(`:141`) so the search palette can load a workout into the home editor;
`MarkdownCanvasPage.tsx:192-197` reacts to it via `swapSource`. Deleting it
breaks that flow. **Preserve it** — move the prop + its effect into
`useCanvasEditorSource` alongside the rest of the source-swap logic.

## Cross-finding contracts you MUST preserve

| Boundary | Contract | Action |
| --- | --- | --- |
| **02 → 04** | App.tsx passes `page`, `wodFiles`, `theme`, `workoutItems`, `onSelect` (`App.tsx:556-562`). | **Insulated.** Keep this prop interface unchanged. 02 is not touched. |
| **HomeView → 04** | `contentOverride`, `onPanelActionsReady`, `heroSlot` (`HomeView.tsx:141-144`). | **Preserve `contentOverride`** (live). The other two stay as-is. |
| **04 ↔ 01 (Workbench Session)** | `useCanvasRuntime` uses `runtimeStore` + `getAnalyticsFromLogs`, NOT `WorkbenchContext`. | **Decoupled.** No Workbench Session dependency — don't introduce one. |
| **04 ↔ 03 (ScriptRuntime)** | Canvas analytics come from `getAnalyticsFromLogs` (persisted), not the observer seams. | **Decoupled.** Don't wire `subscribeToOutput`/`subscribeToStack` here. |

Because 04 is decoupled from 01/03 and insulated from 02, this refactor is
almost entirely **internal** — no other finding's code changes.

## Implementation steps — green between each (`bun run test`)

**Step 1 — `<CanvasPanelContent>` component.** Extract the `panelContent` IIFE
(`:364-454`) into a stateless component taking `panelMode`, `block`, `runState`,
the editor render callback, and the dirty/reset handlers as props. The page
renders `<CanvasPanelContent>` instead of the IIFE. Verify the three panel modes
(editor / running / review) render identically. Build green.

**Step 2 — `useCanvasEditorSource` hook.** Move `editorSource`, `editorOpacity`,
`isEditorLoading`, `activeSourceKey`, `swapSource` (+ `sourceEditsRef` /
`swapTimerRef`), `handleEditorChange`, `resetActiveSource`, the dirty flag, and
the `contentOverride` effect (`:192-197`) into the hook. The page calls it and
passes results to `<CanvasPanelContent>` + `NoteEditor`. **Preserve the
`depsRef.current` stale-closure guarantee** — test a source-swap followed
immediately by a panel-mode change. Build green.

**Step 3 — `useMobileRunOverride` hook.** Move the `mobileRunState` `useMemo`
(`:459-473`) into the hook. The page passes the chosen `runState`
(`mobileRunState` when mobile, `runtime.runState` otherwise) to the panel(s).
Verify mobile fullscreen-timer `onRun` still fires and desktop is unchanged.
Build green.

**Step 4 — slim the page.** With the three concerns extracted, `MarkdownCanvasPage`
should read as: prop interface → three hook calls → `<CanvasPanelContent>` +
`SplitCanvasTemplate` layout + prose-panel + URL/section wiring. Confirm it no
longer holds editor-source, source-swap, or mobile-override logic. Build green.

## Definition of done

- `bun run test ./src` green — no new failures beyond the documented baseline.
- `bun x tsc --noEmit` clean on the touched surface.
- `bunx vite build --config playground/vite.config.ts` succeeds.
- Storybook canvas stories render (`MarkdownCanvasPage.test.tsx` passes — note
  it passes `wodFiles`/`workoutItems` as props, which the keep-props decision
  preserves).
- `MarkdownCanvasPage.tsx` no longer contains the `panelContent` IIFE, the
  `swapSource`/editor-source bookkeeping, or the `mobileRunState` memo.
- `useCanvasRuntime` is **unchanged** (still 160 ln, 14-key return).
- `contentOverride` is **preserved** (live) — HomeView's search-palette injection
  still works.
- The 4 cross-finding contracts above are intact (props to 04 unchanged;
  no Workbench Session / observer-seam coupling introduced).

## Baseline (2026-06-20)

- `bun test ./src` — 2820 pass / 1 fail (pre-existing `AggregateError` in
  `assertions.test.ts`; not yours).
- Playground build succeeds.
- Storybook — 55 files / 212 tests pass.
- `MarkdownCanvasPage.test.tsx` — passes (it injects `wodFiles`/`workoutItems`).

## Out of scope (separate findings)

- **Finding 01** (Workbench Session), **03** (ScriptRuntime) — decoupled; do not
  touch. The canvas runtime is its own scoped thing.
- **Finding 02** (App.tsx) — insulated by the keep-props contract; do not touch
  App.tsx.
- **Finding 05** (cast receiver), **06** (dead code) — unrelated.

## Risks to respect

- **`contentOverride` timing.** Its effect (`:192-197`) calls `swapSource` on
  change, with the `prevContentOverride` ref guard. Move it verbatim into
  `useCanvasEditorSource`; verify the search-palette → home-editor injection
  still swaps cleanly.
- **`depsRef.current` stale-closure workaround.** Moving the source-swap
  consumer out of the page must preserve the "no stale deps" guarantee. Test a
  source-swap followed immediately by a panel-mode change.
- **Mobile `onRun` override.** `mobileRunState` fullscreen-times timer blocks on
  mobile. Verify the override fires on mobile and is a no-op on desktop.
- `MarkdownCanvasPage.tsx` is high-churn (32 commits). Extract one concern at a
  time, build green between each.
- Do not let the hook extraction drift into "fold into `useCanvasRuntime`" — the
  decision is **split into focused hooks**.
