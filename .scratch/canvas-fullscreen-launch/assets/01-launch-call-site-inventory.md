# Launch surface call-site inventory

Research asset for ticket [01 — Inventory launch call sites](../issues/01-inventory-launch-call-sites.md).
Scope: every code path that the canvas editor uses to launch a workout, classified in-scope vs out-of-scope for the unified-fullscreen effort.

## In-scope consumers

The canvas editor is reachable from one route family, mounted by exactly one component:

- `playground/src/App.tsx:168–176` — `canvas` route renders `<MarkdownCanvasPage>`.
- `playground/src/canvas/MarkdownCanvasPage.tsx:66` — single `MarkdownCanvasPage` component. Everything below lives inside it.
- `playground/src/components/organisms/canvas/CanvasEditorPanel.tsx:24` — only canvas consumer of `CanvasEditorPanel`. (Storybook uses it too — see "Tests & stories" at the bottom.)

Inside `MarkdownCanvasPage`, three launch paths feed the canvas editor's Run / Reconnect / Fullscreen actions. All three are **in scope**.

### Path A — In-panel timer (`runState.onRun`, desktop)

| Step | File:line | Code |
| --- | --- | --- |
| 1. Click handler | `playground/src/components/molecules/SectionButtons.tsx:55` | `action: { type: 'call', handler: runState.onRun }` |
| 1'. Mobile equivalent | `playground/src/hooks/useMobileRunOverride.ts:28–35` | override returns a `RunButtonState` whose `onRun` either `setFullscreenBlock(block)` (timer block) or `baseRunState.onRun()` (no-timer block) |
| 2. Hook backing | `playground/src/hooks/useCanvasRuntime.ts:140` | `onRun: () => setPanelState('track', 'view')` |
| 3. State action | `playground/src/hooks/useCanvasRuntime.ts:117–126` | `setPanelState('track', 'view')` → `launchViewRuntime(block)` |
| 4. Effect | `playground/src/hooks/useCanvasRuntime.ts:55–61` | sets `activeRuntimes.set(block.id, block)` and `setActiveViewRuntimeId(uuidv4())`; also stores `activeViewBlockRef.current = block` |
| 5. Render site | `playground/src/canvas/CanvasPanelContent.tsx` (uses `viewTimerBlock`, `panelMode: 'running'`) and `playground/src/canvas/MarkdownCanvasPage.tsx:386–407` (props passed into `CanvasPanelContent`) | renders `RuntimeTimerPanel` inline in the editor panel |
| 6. Completion | `playground/src/hooks/useCanvasRuntime.ts:72–112` | `handleViewComplete` records result via `playgroundRecorder`, refreshes `persistedResults`, transitions `panelMode` to `'review'`. No fullscreen involvement. |

### Path B — Fullscreen overlay via Run (`runState.onFullscreen` semantics differ from the panel-actions `fullscreen()`)

This path is the **navigation-based** fullscreen — it leaves the canvas page entirely and mounts `WallClockPage` (which is a separate route and **out of scope**, see below).

| Step | File:line | Code |
| --- | --- | --- |
| 1. Click handler | `playground/src/components/molecules/SectionButtons.tsx:61` (desktop) and `playground/src/components/molecules/ViewPanelButtons.tsx:45` (mobile) | secondary action, `action: { type: 'call', handler: runState.onFullscreen }` |
| 2. Hook backing | `playground/src/hooks/useCanvasRuntime.ts:141` | `onFullscreen: () => setPanelState('track', 'route')` |
| 3. State action | `playground/src/hooks/useCanvasRuntime.ts:127–130` | `pendingRuntimes.set(runtimeId, { block, noteId: canvasNoteId })` then `navigate(runPath(runtimeId))` |
| 4. Destination route | `playground/src/App.tsx:316` — `ROUTE_PATTERNS.run` → `<WallClockPage />` (out of scope) |

### Path C — Fullscreen overlay via imperative panel actions (`panelActions.fullscreen()`)

The header of the canvas page exposes an imperative `PanelActions` handle (used by `HomeView`'s floating action button at `playground/src/views/HomeView.tsx:114` — `panelActionsRef.current?.fullscreen()`). This path is the **in-page fullscreen overlay** and is distinct from Path B.

| Step | File:line | Code |
| --- | --- | --- |
| 1. Source | `playground/src/views/HomeView.tsx:114` | `panelActionsRef.current?.fullscreen()` (also `PlaygroundLandingPage` may reach for it) |
| 2. Imperative handle shape | `playground/src/canvas/MarkdownCanvasPage.tsx:55–64` | `PanelActions { run, reset, results, fullscreen, getSource }` |
| 3. Wiring | `playground/src/canvas/MarkdownCanvasPage.tsx:313–332` | `useEffect` registers `{ fullscreen: () => { const block = scriptBlocksRef.current[0] ?? null; if (block) runtime.setFullscreenBlock(block) } }` |
| 4. Render | `playground/src/canvas/MarkdownCanvasPage.tsx:476–483` | `{runtime.fullscreenBlock && <FullscreenTimer block={runtime.fullscreenBlock} ... />}` |

### Path D — Inline `CanvasCommand` Run (the editor's run button in the wod block)

`NoteEditor` exposes a `commands` prop that the canvas page plumbs to the editor's inline command bar. The Run command is in scope.

| Step | File:line | Code |
| --- | --- | --- |
| 1. Definition | `playground/src/canvas/MarkdownCanvasPage.tsx:335–349` | `canvasCommands = [{ id: 'run', label: 'Run', primary: true, onClick: (block) => { if (isMobile && blockHasTimer(block)) runtime.setFullscreenBlock(block); else runtime.launchViewRuntime(block) } }]` |
| 2. Plumbed into | `playground/src/canvas/MarkdownCanvasPage.tsx:401` | `commands={canvasCommands}` → `CanvasPanelContent` → `NoteEditor` |

### Mobile branching inside the canvas page

There are **two** identical `isMobile && blockHasTimer(block)` branches inside `MarkdownCanvasPage`:

- `MarkdownCanvasPage.tsx:318–322` (panel-actions `run` handler)
- `MarkdownCanvasPage.tsx:342–346` (`canvasCommands[0].onClick`)

Plus the third, separate, mobile branch in `useMobileRunOverride.ts:30–34`, which overrides `runState.onRun` itself (the handler wired to the desktop section button). The override applies only on mobile and only when the block has a timer — in that case it skips the in-panel path and goes straight to `setFullscreenBlock`.

`blockHasTimer` lives at `playground/src/canvas/canvasUtils.ts:61–63` — true when any statement in the block carries a `Duration` metric. Once deleted, this utility is dead code in the canvas surface (still referenced from `useMobileRunOverride.ts:10`).

### Fullscreen timer completion handler today

`playground/src/canvas/MarkdownCanvasPage.tsx:481`:

```tsx
onCompleteWorkout={() => runtime.setFullscreenBlock(null)}
```

This is the line that needs to *replace* the timer with the review, not just close. It is the seam where the handoff state shape (ticket 03) plugs in.

## Out-of-scope consumers

These pages use the same `FullscreenTimer` / `FullscreenReview` components but do **not** mount the canvas editor and do **not** call `useCanvasRuntime`. Deleting the in-panel path does not touch them.

| Page | Route | Mounts | Notes |
| --- | --- | --- | --- |
| `playground/src/pages/JournalPage.tsx` | `/journal/:id` | `NoteEditor` + its own `FullscreenTimer` state (`useState<ScriptBlock | null>`) | `JournalPage.tsx:328–334` — owns its own timer state, not `setFullscreenBlock`. |
| `playground/src/pages/WallClockPage.tsx` | `/run/:runtimeId` | `FullscreenTimer` directly | Lazy route at `App.tsx:316`. Receives the block from `pendingRuntimes` set by `useCanvasRuntime.ts:129` — a write-only touchpoint; deletion does not break the consumer. |
| `playground/src/pages/ReviewPage.tsx` | `/review/:runtimeId` | `FullscreenReview` directly | Lazy route at `App.tsx:318`. Reads from IndexedDB, no canvas-editor dependency. |
| `playground/src/pages/WorkoutEditorPage.tsx` | `/workout/:category/:name` | `NoteEditor` + its own timer/review state (`JournalPage.tsx`-style) | Its own `pendingRuntimes.set` write at `WorkoutEditorPage.tsx:91`. Same pattern as JournalPage. |

## Surface summary

- `launchViewRuntime` is referenced **only** inside `useCanvasRuntime.ts` and `MarkdownCanvasPage.tsx` — in scope by construction. It feeds `viewTimerBlock`, which is consumed by `CanvasPanelContent.tsx` (in scope).
- `setFullscreenBlock` is referenced in `useCanvasRuntime.ts`, `MarkdownCanvasPage.tsx` (panel actions, canvasCommands, mobile override, fullscreen-timer mount, completion handler), and `useMobileRunOverride.ts` — **all** in scope. The mobile-only call at `MarkdownCanvasPage.tsx:319` and `343` is one of the branches being collapsed.
- `useMobileRunOverride` is referenced only inside `MarkdownCanvasPage.tsx` (line 21 import, 413 call). In scope.
- `RunButtonState.onFullscreen` (Path B) routes to a navigation-based fullscreen via `pendingRuntimes` → WallClockPage. That destination is **out of scope**, but the secondary button in `SectionButtons` / `ViewPanelButtons` is **in scope** as a UI element — its handler can simply be redirected to `setFullscreenBlock(block)` instead of `setPanelState('track', 'route')` (or the button can be removed entirely; ticket 05 will decide).
- `blockHasTimer` is referenced from `useMobileRunOverride.ts:10` and `MarkdownCanvasPage.tsx:33, 318, 342` — all in scope. After deletion, the function has no callers; remove it.

## Tests & stories touching the launch surface

(out-of-scope for ticket 01 itself but listed here as a hand-off to ticket 06)

- `playground/src/canvas/MarkdownCanvasPage.test.tsx:115–117` — mocks `FullscreenTimer` and `ReviewGrid`. Lines 277, 331, 367, 411 render `<MarkdownCanvasPage>`; line 8 imports `PanelActions`; line 277 test name is "persists the first inline canvas completion" — exactly the in-panel path being deleted.
- `playground/src/hooks/useMobileRunOverride.ts` — no dedicated test file (grep confirms no `*.test.*` file imports it).
- `playground/src/hooks/useCanvasRuntime.ts` — no dedicated test file.
- `stories/catalog/organisms/onboarding-banner/panel-onboarding.stories.tsx:30, 318` — renders `<CanvasEditorPanel>` directly; not on the launch path but a Storybook that exercises the panel shell.

## Conclusion

The deletion is contained. The launch surface is the union of `useCanvasRuntime.ts`, `useMobileRunOverride.ts`, and `MarkdownCanvasPage.tsx`. Outside this trio, no production code calls `launchViewRuntime`, no production code calls the in-page `setFullscreenBlock` path (outside the canvas page), and no out-of-scope page consumes the in-panel timer state. Ticket 06's test sweep will validate this against the Storybook and e2e surfaces; ticket 05 will then plan the wiring.

## Decisions to flag for follow-up tickets

- **Secondary "Run fullscreen" button** (`SectionButtons.tsx:57–62`, `ViewPanelButtons.tsx:41–46`) — currently navigates to `/run/:runtimeId` (WallClockPage). After deletion of the in-panel path, this button can either (a) be removed, (b) be repurposed to `setFullscreenBlock` (the in-page overlay), or (c) keep its current navigation behavior. Ticket 05 (wiring) should decide; ticket 03 (handoff state shape) feeds the call.
- **`blockHasTimer`** becomes dead once `useMobileRunOverride` and the two `isMobile && blockHasTimer(block)` branches are deleted. Remove the function in the same change.
- **`setPanelState('track', 'route')` codepath** — the `pendingRuntimes.set` + `navigate` line at `useCanvasRuntime.ts:128–130` becomes unreachable once the secondary button is repurposed/removed. Decide whether to keep `setPanelState` for `('note' | 'review' | 'track')` shorthands or simplify.
- **`homeActionsRef` consumers** (`HomeView.tsx:114` and `PlaygroundLandingPage`) — both reach for `panelActionsRef.current?.fullscreen()`. With the unified surface, the imperative `fullscreen()` handle can stay (it is now the *only* fullscreen entry point) but its body should swap to the new state shape from ticket 03.