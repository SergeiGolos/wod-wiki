Type: research
Status: resolved

## Question

Enumerate every test, mock, and Storybook story that exercises the in-panel timer path or the `onFullscreen` secondary action so that the deletion of `launchViewRuntime` / `useMobileRunOverride` / the mobile-only branch can be planned safely. Specifically: search `playground/src/canvas/MarkdownCanvasPage.test.tsx` (already mocks `FullscreenTimer` and `ReviewGrid` — see lines 115–117 and surrounding), any test for `useCanvasRuntime` / `useMobileRunOverride`, any Storybook story under `stories/` that renders the canvas editor or `SectionButtons` / `ViewPanelButtons`, and any e2e spec under `e2e/` or `playwright.*.config.ts`. For each match, record the test name, the file path, and whether it asserts in-panel behavior that will need rewriting or can be deleted outright. The output gates the deletion ticket — without it, the deletion will silently break tests.

## Answer

The deletion is contained to **one test scenario** in `playground/src/canvas/MarkdownCanvasPage.test.tsx` (`persists the first inline canvas completion and feeds it back to the editor`, line 277). The other three test scenarios in that file are independent of the launch path and stay as-is. Two mocks in the same file need upgrading: `RuntimeTimerPanel` (mock is no longer relevant once the in-panel path is deleted) and `FullscreenTimer` (mock needs to expose an `onCompleteWorkout` button).

**No other test surfaces are touched**:

No unit tests exist for `useCanvasRuntime` or `useMobileRunOverride` — deletion requires no test removal.
No Storybook story renders `SectionButtons` / `ViewPanelButtons` / `MarkdownCanvasPage` with a launch surface. The only canvas-editor story (`panel-onboarding.stories.tsx`) does not pass `runState`.
No e2e spec under `e2e/` exercises `MarkdownCanvasPage`. The four `FullscreenTimer` e2e specs all flow through `JournalPage`, `WorkoutEditorPage`, or the Storybook harness — out of scope.
The `tests/` bun-test layer at the repo root has zero matches for any canvas-editor launch symbol — nothing to update.

**Rewritten test approach** (hand-off to the implementation effort, also captured in ticket 05's wiring plan):

Mock `FullscreenTimer` to expose an `onCompleteWorkout` button (similar in shape to today's `RuntimeTimerPanel` `complete-runtime` mock).
Test scenario: `panelActions.run()` → `FullscreenTimer` mounts → click completion button → `kind: 'review'` transition → `saveResultCalls.length === 1`.
`RuntimeTimerPanel` mock deletes outright (no longer mounted by the page).
`ReviewGrid` mock stays as-is; `getAnalyticsFromLogs` mock stays as-is and may be extended to assert the segment payload.

Full research asset: [Test & mock sweep for canvas-editor launch surface](../assets/06-test-mock-sweep.md) — per-file tables, mock-survival assessment, suggested mock snippet, hand-off notes for the wiring plan.