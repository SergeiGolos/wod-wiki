---
title: "Proposed Implementations: Empty Fragment Compilers"
date: 2025-08-11
tags: [runtime, compilation, design-proposal]
implements: ../Core/fragment-compilation-design.md
related:
  - ./fragment-compilation-manager-high-priority-changes.md
  - ./fragment-compilation-implementation-analysis.md
  - ../Syntax.md
  - ../../src/runtime/FragmentCompilers.ts
  - ../../src/runtime/FragmentCompilationManager.ts
status: draft
---

# Proposed Implementations: Empty Fragment Compilers

This document proposes concrete implementations for compilers that currently return no metrics, ensuring each satisfies the intended compilation behavior per the language specification in [Syntax.md](../Syntax.md). Use the checkboxes to choose which proposals to implement.

## Scope

Compilers reviewed in `src/runtime/FragmentCompilers.ts` and their current state:

- ActionFragmentCompiler — returns []
- EffortFragmentCompiler — returns []
- IncrementFragmentCompiler — returns []
- LapFragmentCompiler — returns []
- TextFragmentCompiler — returns []

Already implemented compilers (for reference):
- TimerFragmentCompiler — emits `{ type: 'time', value: ms, unit: 'ms' }`
- RepFragmentCompiler — emits `{ type: 'repetitions', value, unit: '' }`
- DistanceFragmentCompiler — emits `{ type: 'distance', value, unit }`
- ResistanceFragmentCompiler — emits `{ type: 'resistance', value, unit }`
- RoundsFragmentCompiler — emits `{ type: 'rounds', value, unit: '' }`

## Contract and Common Types

- Input: specific fragment instance (e.g., `ActionFragment`), `IScriptRuntime` context
- Output: `MetricValue[]` with type in { repetitions, resistance, distance, timestamp, rounds, time, calories }, numeric value, and unit string
- Errors: Prefer non-throwing; return [] and optionally signal via runtime logger if available

## Proposals by Fragment Type

### 1) ActionFragmentCompiler

- Current behavior: returns []
- Intent from spec: Represents exercise or instruction (e.g., `[:Rest]`, `[:Setup]`). Often non-quantitative. Some actions may imply semantic flags for runtime (e.g., rest block) or emit calories when known.

Proposed behaviors:
- [x] Emit a tagging metric to retain action semantics in metrics stream
  - Output: `{ type: 'action', value: fragment.value, unit: '' }`
  - Rationale: Allows downstream to detect action boundaries without forcing numbers. Uses `timestamp` type as neutral carrier with unit label.
- [ ] Special-case common actions
  - `Rest`: do nothing here; rely on timer or block semantics to define rest duration
  - `Setup`, `Note`, `Cue`: same as generic tagging metric
- [ ] Optional runtime hook
  - If `context?.events?.onAction` exists, invoke to let runtime react; still return the tagging metric for traceability

Edge cases:
- Empty action string => return []

### 2) EffortFragmentCompiler

- Current behavior: returns [] (effort text is concatenated in manager)
- Intent from spec: Subjective effort label contributing to `effort` string (e.g., `Run`, `MaxEffort`)

Proposed behaviors:
- [ ] Keep metrics empty; rely on `FragmentCompilationManager` to build `effort`
- [x] Emit optional tagging metric
  - Output: `{ type: 'effort', value: fragment.value, unit: '' }`
  - This preserves label transitions in the metrics stream for timelines without polluting quantitative metrics

Edge cases:
- Spaces/levels: keep raw string; manager already handles concatenation

### 3) IncrementFragmentCompiler

- Current behavior: returns []
- Intent from spec: Indicates count direction (up/down) for timers via `^`. Also may apply to non-timer contexts for trend semantics.

Proposed behaviors:
- [ ] Emit a timer-direction tag when paired with a duration on the same statement
  - Output: `{ type: 'timestamp', value: fragment.value, unit: 'increment' }` where value is `1` (up) or `-1` (down)
  - Downstream timer block will consume to set counting direction
- [ ] If no timer exists on statement, still emit for strategies that infer count-up segments (AMRAP)

Edge cases:
- Missing value => treat as -1 (down) per fragment default

### 4) LapFragmentCompiler

- Current behavior: returns []
- Intent from spec: Defines grouping (`round`, `compose`, `repeat`) and flow (`-`, `+`). Affects block composition rather than numeric metrics.

Proposed behaviors:
- [ ] Emit grouping tag so strategy and diagnostics can reconstruct grouping directly from metrics stream
  - Output: `{ type: 'timestamp', value: undefined, unit: 'lap:<' + fragment.value + '>' }` where `fragment.value` is the `GroupType` (`round|compose|repeat`)
- [ ] Optionally encode `image` for precise UI hints: unit `lap:<group>#<image>`

Edge cases:
- Unknown group => return []

### 5) TextFragmentCompiler

- Current behavior: returns [] (manager also appends text to effort string)
- Intent from spec: Freeform inline text (labels like `Run`, qualifiers like `Work`, `Rest`, headings)

Proposed behaviors:
- [x] This is effort compiler really.  make sure the software currently uses only one and do away with the duplicate.
- [ ] Keep effort concatenation in manager; add optional tagging metric to aid timeline labeling
  - Output: `{ type: 'timestamp', value: undefined, unit: 'text:<' + fragment.value.text + (fragment.value.level ? ':' + fragment.value.level : '') + '>' }`

Edge cases:
- Empty text => []

## Cross-Cutting Considerations

- Units and Types: We use `timestamp` as a neutral, non-numeric carrier for labels/tags. The `value` field can be `undefined` by type. Quantitative metrics continue to use their specific types.
- Backward Compatibility: All proposals are additive; they won't break existing tests that assert only on known numeric metrics.
- Runtime Hooks: If `IScriptRuntime` exposes logging or event hooks, these compilers can optionally call them while still returning metrics for traceability.
- Manager Integration: `FragmentCompilationManager` already builds `effort`. No changes required, but we can extend tests to assert on tagging metrics presence when enabled.

## Implementation Tasks (Checkboxes)

- [ ] ActionFragmentCompiler: emit action tagging metric
- [ ] EffortFragmentCompiler: emit effort tagging metric
- [ ] IncrementFragmentCompiler: emit increment value tag (+1/-1)
- [ ] LapFragmentCompiler: emit lap/grouping tag
- [ ] TextFragmentCompiler: emit text tagging metric

## Validation Plan

- Unit tests per compiler verifying emitted `MetricValue[]`
- Ensure no existing tests break (they should ignore additional tags or update expectations accordingly)
- Optional: Add a flag to enable/disable tag emission for production vs diagnostics

## Optional Enhancements

- Introduce `MetricValue` type `label` to avoid overloading `timestamp` for tags
- Provide a `CompilerOptions` bag passed via `IScriptRuntime` or explicit context for toggling features
- Enrich units with structured encoding (e.g., `json:` prefix) for easier parsing downstream
