Type: grilling
Status: resolved

## Question

Decide what happens to the secondary "Run fullscreen" button in `SectionButtons.tsx` (lines 57–62) and `ViewPanelButtons.tsx` (lines 41–46). Today its handler `runState.onFullscreen` calls `setPanelState('track', 'route')` → `pendingRuntimes.set(...)` → `navigate(/run/:runtimeId)` → `WallClockPage`. With the unified fullscreen surface (ticket 03), the navigation is no longer the only fullscreen option — the in-page `setFullscreen({ kind: 'timer', block })` overlay is the new default. Three options to weigh:

(a) **Remove the secondary button entirely** — Run is the only launch verb. Cleanest UI; loses the "open in new tab" affordance some users rely on for split-screen work.

(b) **Repoint the secondary button to the in-page `setFullscreen({ kind: 'timer', block })` overlay** — keeps the button (for discoverability / muscle memory) but the handler becomes redundant with the primary Run (which today launches in-panel and would now also go fullscreen). The two buttons do the same thing.

(c) **Keep the navigation behavior** — secondary button continues to open `WallClockPage` in a new route (today's behavior). Useful for casting to a TV / opening in a second window. Asymmetric with the primary Run; user has to learn two paths.

For each option, list: which files change, what happens to the `runState.onFullscreen` handler, whether `pendingRuntimes` / `setPanelState('track', 'route')` survives, and the impact on the `HomeView` floating action button (which today uses the imperative `panelActions.fullscreen()` and would be similarly affected).

The decision drives the wiring ticket (05) and the deletion ticket (which removes `setPanelState('track', 'route')` and `pendingRuntimes.set`).

## Answer

Decided: **Collapse to a single Run button**. The secondary "Run fullscreen" button is removed entirely from `SectionButtons.tsx` and `ViewPanelButtons.tsx`.

**Key decisions**:

1. **UI Simplification**: Since the primary Run button always launches the timer in the `FullscreenTimer` overlay (per Ticket 03), having a second "Run fullscreen" button is redundant. The secondary action slot in `SectionButtons.tsx` and `ViewPanelButtons.tsx` will be deleted.
2. **State & Prop cleanup**:
   - Remove `onFullscreen: () => void` from `RunButtonState` in `SectionButtons.tsx`.
   - Remove `onFullscreen` wiring from `useCanvasRuntime.ts`.
   - Remove `setPanelState('track', 'route')` branch and route-navigation code (saving to `pendingRuntimes` + navigating to `/run/:runtimeId`) from `useCanvasRuntime.ts`.
   - `pendingRuntimes` (in `runtimeStore.ts`) remains for other pages (`WorkoutEditorPage.tsx` and `JournalPage.tsx` both write to it when indexedDB is unavailable to redirect to `/run/:runtimeId` as a fallback), but is no longer touched by `useCanvasRuntime` or the canvas pages.
3. **Impact on HomeView FAB / panelActions**:
   - The imperative `panelActions.fullscreen()` action in `MarkdownCanvasPage.tsx` will be kept but simplified. Instead of setting fullscreen to a block, it will toggle the fullscreen state via `setFullscreen({ kind: 'timer', block })`. It becomes a synonym for the primary run button actions, keeping compatibility with `HomeView.tsx`'s floating action button.

**Files affected**:

- `playground/src/components/molecules/SectionButtons.tsx` (remove secondary button code and `onFullscreen` interface property)
- `playground/src/components/molecules/ViewPanelButtons.tsx` (remove secondary button code)
- `playground/src/hooks/useCanvasRuntime.ts` (remove `onFullscreen`, collapse `setPanelState('track')` states to just launch fullscreen)
- `playground/src/canvas/MarkdownCanvasPage.tsx` (repoint `panelActions.fullscreen` to use the new union state, simplify command triggers)

**Acceptance criteria**:

1. Only a single primary "Run" (or "Reconnect") button appears on WOD blocks in the canvas prose and editor panel.
2. Clicking the primary button launches the in-page fullscreen timer overlay.
3. Imperative `fullscreen()` call from `HomeView`'s floating button launches the in-page fullscreen timer.
4. All route-based navigation code in `useCanvasRuntime` is removed.
