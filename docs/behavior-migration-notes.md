# Behavior migration notes

This repo currently has two models in play:

- Memory-oriented blocks that extend `RuntimeBlockWithMemoryBase` and exchange `IRuntimeEvent[]` with the runtime.
- A simplified behavior-driven model where `IRuntimeBlock.push/next/pop` return `IRuntimeLog[]` and behaviors expose `onPush/onNext/onPop` that also return `IRuntimeLog[]`.

To allow coexistence during migration, `IRuntimeBlock` currently accepts union types so both shapes compile. `ScriptRuntimeWithMemory` now detects whether a block returns events or logs on `push/pop` and handles each appropriately.

## Missing behaviors to capture existing functionality

Based on current code, the following capabilities should eventually be represented as behaviors in the new model:

- Public metric exposure snapshots for children (currently handled via memory allocations like `metrics-snapshot`).
- Looping/iteration state (rounds, child indices, segments) used by repeating blocks.
- Public span publishing for timed blocks and effort blocks.
- Metric inheritance propagation from parent blocks to children.
- Countdown timer lifecycle and tick handling logic.

Proposed behavior contracts to document/implement later:

- InheritMetricsBehavior: computes and exposes effective metrics visible to children.
- PublicSpanBehavior: publishes a span reference with start/stop/duration.
- PromotePublicBehavior: controls visibility of selected state to descendants.
- RepeatingBlockBehavior: manages rounds/child indices and exposes convenience helpers for next/advance.
- CountdownBehavior: tracks remaining time, expiry, and tick updates.

## Migration plan

1. Wrap old blocks behind small adapters or gradually update their `push/next/pop` to return logs instead of events.
2. Move one responsibility at a time into a concrete behavior (e.g., metric inheritance), verify via tests, then remove duplicate logic from the old block.
3. Once all responsibilities are behaviors, convert the block to a slim `BehavioralBlockBase` composition.

These notes are a starting point; we’ll expand them as we migrate specific blocks.
