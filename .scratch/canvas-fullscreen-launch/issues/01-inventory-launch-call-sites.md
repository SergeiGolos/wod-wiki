Type: research
Status: resolved


## Question

Inventory every call site that touches the canvas-editor launch surface today — `launchViewRuntime`, `setFullscreenBlock`, the `RunButtonState.onRun` / `onFullscreen` handlers, `useMobileRunOverride`, and the `isMobile && blockHasTimer(block)` branch in `MarkdownCanvasPage.tsx` — and produce a written map of which consumers are inside scope (canvas editor + pages that mount `CanvasEditorPanel`) and which are outside (JournalPage, WallClockPage, WorkoutEditorPage, ReviewPage). For each in-scope site, record the exact code path and which downstream components/hooks are affected. The output of this ticket is the precondition for deciding whether the in-panel timer path can be deleted outright or whether a non-canvas consumer depends on the shared machinery.

## Answer

The canvas-editor launch surface is **contained to a three-file trio**: `useCanvasRuntime.ts`, `useMobileRunOverride.ts`, and `MarkdownCanvasPage.tsx`. No production code outside this trio calls `launchViewRuntime`, and no production code outside `MarkdownCanvasPage.tsx` calls the in-page `setFullscreenBlock` path. Pages outside scope (JournalPage, WallClockPage, WorkoutEditorPage, ReviewPage) own their own `FullscreenTimer` / `FullscreenReview` state and do not touch `useCanvasRuntime`.

Three distinct launch paths feed the canvas editor:

1. **Path A — In-panel timer** (`runState.onRun`): desktop section button → `setPanelState('track', 'view')` → `launchViewRuntime(block)` → `viewTimerBlock` consumed by `CanvasPanelContent` → `RuntimeTimerPanel` inline. Completion routes through `handleViewComplete` which only sets `panelMode: 'review'` — no fullscreen involvement.
2. **Path B — Navigation fullscreen** (`runState.onFullscreen`): secondary button → `setPanelState('track', 'route')` → `pendingRuntimes.set(...)` → `navigate(/run/:runtimeId)` → `WallClockPage` mounts its own `FullscreenTimer`. The destination page is out of scope, but the secondary button itself is in scope as a UI element and its handler can be redirected.
3. **Path C — Imperative panel-actions fullscreen** (`panelActions.fullscreen()`): `HomeView.tsx:114` and `PlaygroundLandingPage` call this handle from floating action buttons. In-page `setFullscreenBlock(block)` → `FullscreenTimer` overlay mounted at `MarkdownCanvasPage.tsx:476–483`.
4. **Path D — Inline `canvasCommands[0]` Run**: the editor's inline command bar Run. On mobile + timer block, it goes straight to `setFullscreenBlock`; otherwise `launchViewRuntime`.

Mobile branching lives in two identical `isMobile && blockHasTimer(block)` branches at `MarkdownCanvasPage.tsx:318–322` and `342–346`, plus a third at `useMobileRunOverride.ts:30–34` that overrides `runState.onRun` itself.

The completion seam is at `MarkdownCanvasPage.tsx:481`: today `onCompleteWorkout={() => runtime.setFullscreenBlock(null)}` just closes the timer. This is the line ticket 03's handoff state shape replaces.

`blockHasTimer` (`canvasUtils.ts:61–63`) becomes dead after the mobile branches are deleted.

Full research artifact: [Launch surface call-site inventory](../assets/01-launch-call-site-inventory.md) — includes per-path tables, out-of-scope page survey, test/story sweep hand-off notes, and follow-up flags for ticket 05.