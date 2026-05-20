# Post-Session RPE Entry Triggers a Second Summary Finalization Pass

Session RPE arrives after the workout has ended — after `OutputEmitter.finalizeAnalytics()`
has already run. `SessionLoad` and `TIS` both depend on this value, so they cannot be
computed in the standard finalization pass. We introduce a `session-rpe-entered` runtime
event that, when fired, triggers a second targeted finalization pass limited to processors
that declare a dependency on `MetricType.SessionRPE`.

**Status**: proposed

## Why Not Wait for RPE Before Finalizing

The expert research framework specifies that Session RPE should be recorded "within 30
minutes of completing exercise." The workout ends; the athlete cools down; then they
enter their RPE. Blocking the initial summary display while waiting for RPE input would
degrade the experience — athletes should see their volume, distance, and MET-minutes
immediately. Session Load and TIS are additive outputs, not corrections to existing ones.

## Shape of the Two-Pass Model

```
Workout ends
  → OutputEmitter.finalizeAnalytics()   // pass 1: all non-RPE-dependent summary processors
  → UI shows initial summary

Athlete enters Session RPE (within ~30 minutes)
  → runtime fires 'session-rpe-entered' event carrying { rpe: number }
  → OutputEmitter.finalizeRPEDependents()  // pass 2: SessionLoadProcessor, TISProcessor only
  → New output statements added to buffer
  → Subscribers notified (UI updates summary with Session Load and TIS)
```

## Open Question — Resolve Before Implementing the Event Path

How does the `session-rpe-entered` event reach the runtime after the session has ended?
Options:
1. The runtime remains in a post-session state and continues to accept this specific event
2. The UI holds a reference to the `OutputEmitter` directly and calls a dedicated method
3. A lightweight post-session context wraps the `OutputEmitter` for RPE capture only

The choice affects whether `ScriptRuntime` needs a post-session lifecycle state and
whether `OutputEmitter` needs a public `submitSessionRPE(value: number)` method.
This must be resolved before implementing `SessionLoadProcessor` or `TISProcessor`.
