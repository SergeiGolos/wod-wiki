Type: grilling
Status: resolved

## Question

Decide exactly what "workout completion" means as the trigger for recording the accomplishment on the active `Quest`. The current `RuntimeTimerPanel` reports two outcomes via `onComplete` (`completed: boolean` where `false` means stopped-early) and `WorkoutResults.completed: boolean` (in `@/components/Editor/types`). For each of the following, decide yes/no and record why: (1) strict completion only (`status === 'completed'` / `results.completed === true`) — the user must finish; (2) stopped-early counts if duration > some threshold; (3) wall-clock blocks (no structured segments) count the same as structured blocks; (4) zero-output blocks (timer ran, nothing emitted) count; (5) re-launching the same block after a prior completion counts again (idempotent?) or only once. The decision drives the validator's `pass` logic and whether `usePageQuests.markComplete` is called once or many times per quest.

## Answer

The "workout completion" trigger has five axes. Each is settled.

| Axis | Decision | Notes |
| --- | --- | --- |
| 1. Strict completion only? | **Yes** | Only `results.completed === true` counts. Stopped-early does not record an accomplishment, regardless of duration. |
| 2. Wall-clock blocks count? | **Yes** | Wall-clock blocks (no structured segments, just a `*:30 Rest` line) follow the same rule. The accomplishment fires regardless of whether the block had structured metrics. |
| 3. Zero-output blocks count? | **Yes** | `results.completed === true` is the only gate. Empty logs / no segments do not block the accomplishment. (This is the trigger signal; what segments to show in the review is a separate question for ticket 03's empty-state rendering.) |
| 4. Idempotence | **Yes, once-only per quest** | `usePageQuests.markComplete(questId)` is already idempotent at the ledger level (it writes a Set keyed by questId — see `usePageQuests.ts:60–66`). Re-running the same block does NOT re-fire. The ledger enforces it; the hook does not need to dedupe. |
| 5. Edge case: malformed / no results | **Count anyway IF `onCompleteWorkout` fires** | `onCompleteWorkout` is the upstream signal. If it's called with `results`, the hook fires `markComplete` regardless of segments. Today `FullscreenTimer.handleComplete` only calls `onCompleteWorkout` when `RuntimeTimerPanel.handleComplete` is invoked, which happens on natural completion OR stop — but the wiring ticket will additionally check `results.completed === true` before calling `markComplete` (belt and suspenders). |

**Trigger function** (used by the wiring ticket):

```ts
function shouldRecordCompletion(results: WorkoutResults | null | undefined): boolean {
  if (!results) return false
  return results.completed === true
}
```

This is invoked inside the completion hook each time it observes a completion event. The completion hook fires when the canvas page transitions `setFullscreen({ kind: 'review', ... })` AND when other entry points fire `onCompleteWorkout` (none today outside `FullscreenTimer`, but the hook is parameterized over the event source for future-proofing).

**Why both checks (axis 1 + axis 5)**:

`results.completed === true` is checked twice — once at the `FullscreenTimer.handleComplete` level (today it routes stopped-early to `onClose`, not `onCompleteWorkout`), and once at the hook level (defense in depth in case future entry points call `onCompleteWorkout` for a stopped-early workout).

**Idempotence contract**:

`usePageQuests.markComplete(questId)` writes to a `Set<questId>` in localStorage (`usePageQuests.ts:60`). The ledger ignores repeat writes. The hook does not need to track its own "have I fired for this quest?" state — the ledger already is that state.

**Per-quest thresholds — NOT in scope**:

This ticket deliberately rules out per-quest duration / segment-count thresholds (e.g. `validation: { type: workout-complete, min-segments: 3 }`). All `workout-complete` quests share the same trigger. If per-quest thresholds become desired later, they go in a separate ticket (likely a schema-extension follow-up to ticket 02).

**Hand-off to ticket 05 (wiring)**:

- The completion hook uses `shouldRecordCompletion(results)` before calling `markComplete`.
- The hook subscribes to the `setFullscreen({ kind: 'review', ... })` transition (or equivalent event) and reads `results` from there.
- No dedupe state in the hook itself — the ledger enforces once-only.