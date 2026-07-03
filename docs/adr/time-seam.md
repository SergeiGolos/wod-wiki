# The Time Seam — no raw `Date.now()`

**Status:** Accepted · **Date:** 2026-06-29

`Date.now()` may appear in exactly two places: the **`INowProvider`** adapter
(`wallClockNow`, `src/runtime/INowProvider.ts`) and the receiver-aware
`getRuntimeNowMs()` (`src/runtime/hooks/runtimeNow.ts`). Every other module
obtains "now" from an injected `INowProvider` or from the frozen
`IRuntimeClock.currentDate`. Test fakes use `frozenNow(at)`.

## Context

Raw `Date.now()` was scattered through the output→result path — the
**Output Statement** constructor (recomputing `.elapsed`/`.total` from a
*third* clock, one frame after the metric was stamped), `buildWorkoutResults`,
the `useWorkbenchRuntime` inline result assemblies, the `useRuntimeExecution`
display interval, and `calculateDuration`'s default parameter. Two problems:

- **Non-determinism.** A result assembled with `Date.now()` cannot be made
  deterministic in tests; the persisted timestamp drifts run to run.
- **Wrong clock on the receiver.** On the Chromecast receiver `Date.now()` is
  the *device* clock, but the runtime runs on the **sender-synchronized** clock
  (`createBrowserRuntimeNow` → `getRuntimeNowMs` reads
  `window.__chromecast_senderClockTimeMs`). Every raw `Date.now()` in the
  result path is a latent receiver bug — the persisted time disagrees with the
  timer spans the runtime actually used.

The seam to fix this already existed: `INowProvider` ("the only seam for 'what
time is it' in the runtime"), already injected into behaviors and the runtime,
already used at `RuntimeTimerPanel:305`. It just wasn't enforced.

## Decision

One invariant: **`Date.now()` lives only in the adapters.** The two legitimate
"now" notions both stay behind seams:

- **Frozen turn clock** (`IRuntimeClock.currentDate`) — for elapsed/total
  *math*, so a pop→next→push chain within one turn is deterministic. Used by
  `ReportOutputBehavior` (unchanged).
- **Wall-clock now** (`INowProvider.now()` / `getRuntimeNowMs()`) — for
  "when did this happen" *timestamps* (SystemTime metric, result `endTime`).

Concretely: the **Output Statement**'s deprecated `.elapsed`/`.total`/`.spans`
proxies are deleted — the metrics (`MetricType.Elapsed/Total/Spans`) are the
single representation, so the model needs no clock at all. The result-assembly
sites and the display interval take the runtime's `nowProvider` (or
`getRuntimeNowMs` for the live display) instead of `Date.now()`.

## Consequences

- **+** Tests can freeze the entire output→result timeline with `frozenNow(at)`
  and assert exact persisted timestamps.
- **+** Persisted results use the same clock the runtime ran on — including the
  sender-synchronized clock on the receiver.
- **−** Any module needing "now" must accept an `INowProvider` (or read
  `IRuntimeClock.currentDate`); `Date.now()` in a new module is a review fail.
- The deprecated proxy deletion is a storage-shape change, but the `metrics`
  array was already persisted alongside the proxies, so old results still read
  correctly via the metrics.

## Non-goals

- Changing runtime timing *semantics* (frozen-clock turn model, span math) —
  retained.
- Changing `WorkoutResults.duration` *provenance* (still from
  `execution.elapsedTime`) — only the clock it reads changed. Repointing
  duration at the runtime's span-sum is a separate decision.
- Deleting `calculateDuration` (the documented duplicate of `calculateElapsed`)
  — separate; only its raw `Date.now()` default was removed.
