# Test & mock sweep for canvas-editor launch surface

Research asset for ticket [06 — Test and mock sweep](../issues/06-test-and-mock-sweep.md).
Enumerates every test, mock, Storybook story, and e2e spec that touches the canvas-editor launch surface or the secondary "Run fullscreen" action, so the deletion of `launchViewRuntime`, `useMobileRunOverride`, and the mobile-only branch can be planned without silently breaking tests.

## In-scope touchpoints

### Unit / integration tests

**`playground/src/canvas/MarkdownCanvasPage.test.tsx`** — the only unit test that touches the canvas-editor launch surface. Mocks the in-panel timer path (`RuntimeTimerPanel` → inline button mock) and the `FullscreenTimer` import to render as `null`. The `RuntimeTimerPanel` mock at lines 107–113 exposes a `data-testid="complete-runtime"` button that calls `onComplete('block-1', sampleWorkoutResults)` — this drives the in-panel completion flow that is being deleted.

| Test | Line | What it asserts | Action required |
| --- | --- | --- | --- |
| `persists the first inline canvas completion and feeds it back to the editor` | 277 | `panelActions.run()` → `RuntimeTimerPanel` inline mount → click `data-testid="complete-runtime"` → `saveResultCalls.length === 1` → `panelActions.reset()` → editor result count `1` | **Rewrite or delete**: this is the in-panel timer path being deleted. The mock surfaces a complete-runtime button that no longer exists in the source. Two paths: (a) delete the test (the surface it asserts is gone); (b) rewrite to exercise the new `kind: 'timer'` + transition to `kind: 'review'` flow with a new mock surface (mock `FullscreenTimer` exposes `onCompleteWorkout` button instead). The wiring plan (ticket 05) calls for path (b). |
| `hydrates stored canvas results on initial load` | 322 | Hydration from IndexedDB. Independent of launch path. | **No change**. Continues to work after the deletion. |
| `keeps edits per example and can reset the active example` | 345 | Editor source state machine. | **No change**. |
| `shows the active section title and swaps inline examples without scrolling` | 410 | Active section / example swap. | **No change**. |

The mocks themselves at lines 73–150 are partially stale:

- `mock.module('@/components/organisms/editor/NoteEditor', ...)` (lines 73–105): still in use; no change.
- `mock.module('@/components/organisms/editor/RuntimeTimerPanel', ...)` (lines 107–113): **mock of an in-panel component being deleted**. Replace with a `FullscreenTimer` mock that surfaces `onCompleteWorkout`, OR delete (if the rewritten test moves to a different mock target).
- `mock.module('@/components/organisms/review/FullscreenTimer', () => ({ FullscreenTimer: () => null }))` (lines 115–117): **mock is null-render** — it doesn't help the rewritten test exercise completion. Needs to be upgraded to a mock that exposes an `onCompleteWorkout` button the test can click.
- `mock.module('@/components/organisms/review/ReviewGrid', ...)` (lines 119–121): stub. If the rewritten test asserts the review surface renders, this mock stays as-is. If it asserts something more, it gets upgraded.
- `mock.module('@/services/AnalyticsTransformer', ...)` (lines 123–127): still in use; the page derives segments via this at the new transition point (per ticket 03). **Keep**, possibly extend to assert the segment payload.

### Hook tests — direct coverage for `useCanvasRuntime` and `useMobileRunOverride`

**None exist.** The grep for `useCanvasRuntime|useMobileRunOverride` under `playground/src/**` returns zero matches in `*.test.*` files. The closest hook test file is `useChapterProgress.test.ts` — unrelated to launch.

`playground/src/hooks/` test files actually present:

- `useChapterProgress.test.ts`
- `useCursorInsert.test.ts`
- `useFirstNoteWizardState.test.ts`
- `useIsFirstNoteEver.test.ts`
- `useJournalZipProcessor.test.ts`
- `useOnboardingEvents.test.ts`
- `useOnboardingProgress.test.ts`
- `usePageQuests.test.ts` ← relevant to the new completion hook (ticket 05); existing tests cover `markComplete` idempotence already
- `usePlaygroundContent.test.ts`
- `useProfileInitialized.test.ts`
- `useShowPlaygrounds.test.ts`

`useCanvasRuntime.ts` and `useMobileRunOverride.ts` are uncovered at the unit-test level. Today the only behavioral coverage is via `MarkdownCanvasPage.test.tsx`. After the deletion, neither hook exists, so no new tests are required for them. **The new `useCompletionChallenge` hook (ticket 05) needs its own test file** — that is in scope of ticket 05's plan, not this ticket.

### Storybook stories

**None exercise `SectionButtons` or `ViewPanelButtons` directly.** A grep for those names in `stories/` returns zero matches. The stories that render canvas-adjacent components:

| File | What it covers | Action required |
| --- | --- | --- |
| `stories/catalog/organisms/FullscreenTimer.stories.tsx` | The `FullscreenTimer` component in isolation (uses a `FullscreenTimerHarness` with a launch button). Independent of the canvas editor. | **No change**. The component is still consumed by `WallClockPage` (out of scope) and the canvas editor's new `kind: 'timer'` overlay. Stories continue to render correctly. |
| `stories/catalog/organisms/FullscreenTimer.mdx` | Documentation page for the above. | **No change**. |
| `stories/catalog/organisms/FullscreenReview.stories.tsx` | The `FullscreenReview` component in isolation (uses a `FullscreenReviewHarness`). Independent of the canvas editor. | **No change**. The component is still consumed by `ReviewPage` (out of scope) and the canvas editor's new `kind: 'review'` overlay. |
| `stories/catalog/organisms/FullscreenReview.mdx` | Documentation page for the above. | **No change**. |
| `stories/catalog/organisms/RuntimeTimerPanel.stories.tsx` | The `RuntimeTimerPanel` inner panel. Independent of canvas-editor launch. | **No change**. Used by both `FullscreenTimer` and the now-deleted in-panel `CanvasPanelContent` path. |
| `stories/catalog/organisms/onboarding-banner/panel-onboarding.stories.tsx` | Renders `<CanvasEditorPanel>` for onboarding progress demonstration. **Does not pass `runState`** — purely an onboarding chrome showcase. | **No change**. |
| `stories/catalog/pages/WallClockPage.stories.tsx` | `WallClockPage` standalone. Out of scope. | **No change**. |
| `stories/catalog/pages/WorkoutEditorPage.stories.tsx` | `WorkoutEditorPage` standalone. Out of scope. | **No change**. |
| `stories/catalog/integration/PlaygroundWallClock.stories.tsx` | Composes `WallClockPage` → `FullscreenTimer`. Out of scope. | **No change**. |
| `stories/catalog/integration/PlaygroundReview.stories.tsx` | Composes `ReviewPage` → `FullscreenReview`. Out of scope. | **No change**. |

**No canvas-editor-rendering Storybook story exists.** `MarkdownCanvasPage.stories.tsx` does not exist. The only story that mounts `CanvasEditorPanel` is the onboarding showcase. After the deletion, **no Storybook story changes are required** for the canvas-editor launch surface. (A new story for the unified fullscreen surface is in the map's `Not yet specified` fog; this ticket does not create it.)

### End-to-end specs

| File | What it exercises | Action required |
| --- | --- | --- |
| `e2e/acceptance/fullscreen-wallclock-close.e2e.ts` | Storybook `FullscreenTimer` harness — Close (X) button in Ready-to-Start state. Independent of canvas editor (uses the harness, not the canvas page). | **No change**. |
| `e2e/live-app/collection-new-note-result.e2e.ts` | Collection flow → `/journal/...` → `FullscreenTimer` → result badge. The fullscreen here is `JournalPage`'s own timer state, not the canvas editor. | **No change**. |
| `e2e/live-app/note-persistence-save-load.e2e.ts` | Note save/load round-trip; uses `FullscreenTimer`. Not on the canvas-editor path. | **No change**. |
| `e2e/live-app/wod-index-play-button.e2e.ts` | WOD index "Play" button → `FullscreenTimer`. Not on the canvas-editor path. | **No change**. |
| `e2e/pages/ReviewPage.ts` | Page Object Model for `ReviewPage`. Out of scope (no canvas editor). | **No change**. |

**No e2e spec exercises `MarkdownCanvasPage` or the canvas editor's launch surface today.** A grep for `MarkdownCanvasPage` or `launchViewRuntime` under `e2e/` returns no matches. The four e2e specs that touch a fullscreen timer all do so via `JournalPage`, `WorkoutEditorPage`, or the standalone Storybook harness — all out of scope.

### Prototypes (HTML)

`playground/prototypes/` contains four HTML concept prototypes (`concept-1-split-pane.html`, `concept-2-inline-overlay.html`, `concept-3-canvas-scroll.html`, `concept-4-minimalist-hero.html`) plus `index.html`. These are static design prototypes, not tests. They reference `FullscreenTimer` and `MarkdownCanvasPage` in their annotation labels but contain no behavioral code. **No change required.**

## Summary

**Three test surfaces are touched by the canvas-editor launch deletion:**

1. `playground/src/canvas/MarkdownCanvasPage.test.tsx` — the only unit-test file on the canvas-editor launch path. **One test scenario to rewrite** (`persists the first inline canvas completion`); three unrelated scenarios stay. Mocks for `RuntimeTimerPanel` and `FullscreenTimer` need to be updated to reflect the new `kind: 'timer'` → `kind: 'review'` flow.

2. No direct unit tests for `useCanvasRuntime` or `useMobileRunOverride`. Deletion requires no test removal.

3. No Storybook stories or e2e specs exercise the canvas-editor launch surface. **No changes required** beyond ticket 05's plan (which adds a `useCompletionChallenge` test file — already accounted for there).

**The deletion is test-safe by absence:** only one test scenario asserts the in-panel behavior, and that scenario's mock (`RuntimeTimerPanel`'s `complete-runtime` button) is already a synthetic stand-in. Rewriting it to drive `FullscreenTimer.onCompleteWorkout` instead is the cleanest path.

## Out-of-scope confirmations

- Tests in `src/components/Editor/` and `src/components/Editor/__tests__/` do NOT touch the canvas-editor launch path. The package-runtime tests for `FullscreenTimer` and `FullscreenReview` are at `src/components/organisms/review/` — those components stay; their tests stay.
- `playground/src/pages/JournalPage.tsx` and `playground/src/pages/WorkoutEditorPage.tsx` mount their own timer state via `useState` — they don't go through `useCanvasRuntime`. Their behavior is untouched by this effort (per ticket 01's inventory).
- `playground/src/pages/WallClockPage.tsx` and `playground/src/pages/ReviewPage.tsx` are out of scope per the destination. Their stories stay; their e2e coverage stays.

## Hand-off notes for the implementation effort

- **Mock surface for the rewritten `MarkdownCanvasPage.test.tsx`**: the new mock target is `FullscreenTimer`. It needs to expose an `onCompleteWorkout` button (similar in shape to today's `complete-runtime` mock) so the test can drive the completion transition. Suggested mock:

  ```ts
  mock.module('@/components/organisms/review/FullscreenTimer', () => ({
    FullscreenTimer: (props: { onCompleteWorkout?: (blockId: string, results: typeof sampleWorkoutResults) => void }) => (
      <button data-testid="complete-fullscreen" onClick={() => props.onCompleteWorkout?.('block-1', sampleWorkoutResults)}>
        Complete fullscreen
      </button>
    ),
  }))
  ```

  The rewritten test asserts: `panelActions.run()` → `FullscreenTimer` mounts (because the new path is always fullscreen) → click `data-testid="complete-fullscreen"` → `kind: 'review'` transition → `saveResultCalls.length === 1`.

- **Idempotence test for the completion hook**: ticket 05's plan already covers this in the new `useCompletionChallenge.test.ts`. This ticket does not duplicate.

- **No sweep of `tests/` directory needed**: the `tests/` directory at the repo root (referenced in CLAUDE.md as a `test` layer with 421 files) is a different test layer (likely bun-test for the package runtime). A quick grep shows zero matches for `launchViewRuntime|useMobileRunOverride|useCanvasRuntime|onFullscreen` under `tests/`. Confirmed: nothing to update there.

- **Chromecast receiver side**: ticket 08 confirmed the canvas-editor unification is sender-local. No e2e or story changes for the receiver side.

## Conclusion

The deletion is contained to **one test scenario** (`persists the first inline canvas completion and feeds it back to the editor`) and **two mocks** in the same file (`RuntimeTimerPanel`, `FullscreenTimer`). No Storybook story, no e2e spec, no other unit test breaks. Implementation can proceed.