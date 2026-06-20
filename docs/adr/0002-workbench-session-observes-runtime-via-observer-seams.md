# ADR-0002 — The Workbench Session observes the runtime via its output + stack observer seams; it does not poll

> **Status:** accepted
> **Date:** 2026-06-20

## Context

The Workbench Session must derive analytics and active segments from the
runtime. Today it **polls**: `getAnalyticsFromRuntime` pulls
`runtime.getOutputStatements()` on an `execution.stepCount` tick
(`AnalyticsTransformer.ts:275-297`), and active segments read `runtime.stack`
directly on the same cadence (`useWorkbenchEffects.ts:175-193`).

The runtime already exposes two observer seams — `subscribeToOutput` and
`subscribeToStack` — the latter carrying the **post-mount invariant** (G3:
snapshots reflect post-mount state; `IRuntimeStack.ts:23-38`). Finding 03 plans
to extract these seams behind an observer collaborator when it narrows
`IScriptRuntime`.

The session also maintains **two** analytics derivations today: the live pull
from the runtime, and `getAnalyticsFromLogs(currentEntry.results.logs)` as the
fallback when no runtime is mounted (`useWorkbenchEffects.ts:167-171`).

## Decision

The Workbench Session **subscribes** to `subscribeToOutput` and
`subscribeToStack` (reactive), accumulating its own output list, rather than
polling `getOutputStatements()` / `runtime.stack` on a tick.

- Analytics unify on a single derivation — *"derive from an output list"* — fed
  live by `subscribeToOutput` while a runtime is mounted, and from persisted
  logs otherwise. The live and fallback paths become one.
- Active segments track **stack snapshots**, not `stepCount`.

The session only **observes** the runtime through these seams; a Workbench
Effect **drives** it via execution controls. This makes the Workbench Session
and the Chromecast proxy runtime co-subscribers of the same observer seam.

## Consequences

- **Positive.** The two analytics paths collapse to one. Snapshot-driven
  segments are more correct (they react to stack mutations, which is exactly
  when active segments change — not to a step cadence). The Workbench Session +
  the Cast proxy = **two real subscribers**, which justifies Finding 03's
  observer-collaborator extraction (two adapters = a real seam). The post-mount
  invariant gains a second beneficiary.
- **Negative / coordination.** Finding 01 and Finding 03 are now sequenced:
  **01 lands first** (the seams exist on `ScriptRuntime` today); when **03**
  extracts the seams behind an observer collaborator, 01's subscription
  call-site moves to the collaborator — a mechanical update. The post-mount
  contract must hold for both subscribers.
- **Neutral.** The cast bridges are unaffected — they read `analyticsSegments`
  from the store, however it is derived.

## Related

- [Finding 01 — Workbench state layer](../findings/01-workbench-state-layer.md)
- [Finding 03 — ScriptRuntime god interface](../findings/03-script-runtime-god-interface.md)
- [G3 — post-mount snapshot invariant](../gml/improve/gaps/G3-script-runtime-post-mount-invariant.md)
- [ADR-0001 — Workbench Session single store](./0001-workbench-session-single-store.md)
