# Runtime Block Lifecycle Alignment

This document summarizes each runtime block’s current behavior and the requirements to align with the push/next/pop lifecycle, event handler registration, and memory visibility (public vs private). It reflects the memory-based runtime with visibility semantics.

## Conventions
- Core memory allocations on push: `spans` (private), `handlers` (private), `metrics` (private)
- Visibility: `private` by default, `public` when a parent value must be visible to children
- Re-entry: State necessary to resume after a child completes must be stored in memory

---
## RepeatingBlockBehavior
Track the following registers on the block;  segments pre round: this should be able to read the "+" / " - " / " " lap value on the child statements

- segments.total
- segments.per-rount
- segment.round-index
- segment.total-index


## PublicMetricBehvaior
- promotes a metric as public

## PublicSpanBehavior 
- creates a public span at some memory address.

## InherticMetricBehavior


## CompleteEventHander
- eventType
- eventHistory

## NextEventHander
- eventType
- eventHistory
## DurationEventHandler
- countdown.total
- countdown.target ==> public memory span

--- 
## RootBlock
- Purpose: Coordinates top-level statements
	- RepeatingBlockBehavior
	- PublicSpanBehavior
	- NextChildBehavior
	- CompleteEventHander ("End" event)  updates state to stop. and pops all the children.

---
## RepeatingBlock (Rounds)
Purpose: Iterate child statements across N rounds
	- RepeatingBlockBehavior	
	- NextChildBehavior

## RepeatingRepsBlock (Rounds)
Purpose: Iterate child statements across N rounds
	- RepeatingBlockBehavior
	- NextChildBehavior
	- PublicMetricBehavior (reps counts)


## RepeatingTimedBlock
Purpose: Parent for countdown-based flows where the nect child will track laps for totals and end on a specific time duration.
- ReaptingBlockBehavior
- PublicSpanBehavior
- NextChildBehavior
- DurationEventHandler  -->pop

## RepatingCountdownBlock
Purpose: Parent for countdown-based flows where the nect child will track laps for totals and end on a specific time duration.
- ReaptingBlockBehavior
- PublicSpanBehavior
- NextChildBehavior
- DurationEventHandler  -->next

---
## EffortBlock
Purpose: Single effort unit
- PublicSpanBehavior
- InheritMetricsBehavior
- NextEventHandler
- NextPopBehavior

## TimerBlock
Purpose: Basic timing unit (placeholder)
- PublicSpanBehvario
- InheritMetricsBehavior
- DurationEventHandler --> next
- NextPopBehavior

---

## Visibility Guidelines
- Private by default. Make values public only when children must read them.
- Typical public refs:
  - Parent’s read-only context (e.g., compiled child list, shared timers)
  - Metrics intended for inheritance (expose a public `metrics-snapshot` rather than sharing private `metrics`)
- Use `getVisibleMemory()` and `findVisibleByType(type)` in children to read parent public refs.

---
