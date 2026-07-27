Type: grilling
Status: resolved

## Question

Decide the runtime state shape that supports the unified fullscreen surface: when `FullscreenTimer` calls `onCompleteWorkout(blockId, results)`, the canvas page must replace the timer with `FullscreenReview` mounted at the same fullscreen surface with no intermediate in-panel state. Specifically, choose between (a) a discriminated union `runtime.fullscreen: { kind: 'timer', block } | { kind: 'review', segments } | null`, (b) two parallel fields `fullscreenTimerBlock` / `fullscreenReviewSegments`, or (c) a separate parent container holding both — and record the rationale against the current `useCanvasRuntime.ts` shape (which has `fullscreenBlock` and a separate `reviewSegments` that today flow through `panelMode: 'review'`). The chosen shape determines how the `handleViewComplete` callback transitions and how `FullscreenReview` is mounted/closed.

## Answer

The unified fullscreen surface uses a **discriminated union** that fully replaces today's `fullscreenBlock` and `reviewSegments` pair. After the change, only the fullscreen surface can render a timer or a review — the in-panel review path is gone with `launchViewRuntime`.

**State shape** (in `useCanvasRuntime.ts`):

```ts
export type FullscreenState =
  | { kind: 'timer'; block: ScriptBlock; results: WorkoutResults | null }
  | { kind: 'review'; segments: Segment[]; results: WorkoutResults }
  | null

const [fullscreen, setFullscreen] = useState<FullscreenState>(null)
```

Notes on the shape:

- `results` lives on `kind: 'timer'` so the completion handler has immediate access without round-tripping. The completion callback in `MarkdownCanvasPage` reads it once and uses it twice: derive segments and pass through to `kind: 'review'`.
- `kind: 'review'` carries `segments` already derived. Derivation happens once, at the moment of completion, in the page's `onCompleteWorkout` handler. The hook does not redo the work.

**Transition** (`MarkdownCanvasPage.tsx:476–483`):

```tsx
onCompleteWorkout={(blockId, results) => {
  const { segments } = getAnalyticsFromLogs(results.logs as any, results.startTime)
  setFullscreen({ kind: 'review', segments, results })
}}
```

**Render site** (`MarkdownCanvasPage.tsx`):

```tsx
{fullscreen?.kind === 'timer' && (
  <FullscreenTimer
    block={fullscreen.block}
    results={fullscreen.results}
    onClose={() => setFullscreen(null)}
    autoStart
    onCompleteWorkout={handleCompleteWorkout}
  />
)}

{fullscreen?.kind === 'review' && (
  <FullscreenReview
    segments={fullscreen.segments}
    onClose={() => setFullscreen(null)}
    title="Workout Review"
  />
)}
```

**Deletion of existing fields**:

- `fullscreenBlock: ScriptBlock | null` → removed. Replaced by the union.
- `reviewSegments: Segment[]` (today consumed by `CanvasPanelContent`'s in-panel review) → removed. The in-panel review is no longer reachable after `launchViewRuntime` is deleted (per ticket 01).
- `panelMode: 'review'` → no longer entered; `panelMode` collapses to `'editor' | 'running'`. The completion transition no longer flows through `panelMode`.

**Hand-off to ticket 05 (wiring)**:

- The completion event listener that the new `useCompletionChallenge` hook subscribes to can read from `setFullscreen` (the union) — no separate channel needed; the wiring ticket just needs to know the transition shape.
- `panelActions.results()` (today at `MarkdownCanvasPage.tsx:325`: `() => runtime.setPanelMode('review')`) has no consumer in the new world — remove it. The header "Results" floating button (if any) can either be removed or repointed at a derived `kind: 'review'` from the most recent persisted result.

**Hand-off to ticket 04 (trigger semantics)**:

- The `results: WorkoutResults` payload on `kind: 'review'` is exactly what the trigger-semantics decision needs to inspect. If the decision lands on "strict completion only," the completion hook checks `results.completed === true` before calling `markComplete`.