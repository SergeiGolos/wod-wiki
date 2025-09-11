---
title: "Action Plan: Implement Selected Fragment Compiler Behaviors"
date: 2025-08-11
tags:
  - runtime
  - compilation
  - plan
related:
  - ./fragment-compiler-proposals.md
  - ./fragment-compilation-implementation-analysis.md
  - ../Syntax.md
  - ../../src/runtime/FragmentCompilers.ts
  - ../../src/runtime/FragmentCompilationManager.ts
  - ../../src/runtime/RuntimeMetric.ts
status: proposal
---

# Action Plan: Implement Selected Fragment Compiler Behaviors

This plan turns the selections made in [fragment-compiler-proposals.md](./fragment-compiler-proposals.md) into concrete, staged updates. It also calls out type inconsistencies and proposes strategies to resolve them before coding.

## Selections Recap

From the proposals document, the following items are marked as selected:

- ActionFragmentCompiler
  - [x] Emit a tagging metric to retain action semantics
    - Proposed Output (as selected): `{ type: 'action', value: fragment.value, unit: '' }`
- EffortFragmentCompiler
  - [x] Emit optional tagging metric
    - Proposed Output (as selected): `{ type: 'effort', value: fragment.value, unit: '' }`
- TextFragmentCompiler
  - [x] Treat Text as the Effort path; consolidate to a single labeling route and avoid duplication

Not selected (no changes yet):
- IncrementFragmentCompiler (direction tagging)
- LapFragmentCompiler (grouping tagging)

## Type Consistency Review (Issues Found)

1) MetricValue.type union vs selected tag types
- Current union in `RuntimeMetric.ts`:
  - `type: 'repetitions' | 'resistance' | 'distance' | 'timestamp' | 'rounds' | 'time' | 'calories'`
- Selected direction: adopt specific metric types (Option C), starting with `'action'` and `'effort'`.
- Implication: the union must be extended to include `'action' | 'effort'` (and possibly others later).

2) MetricValue.value numeric vs tests using strings in some places
- Distance/Resistance compilers currently emit numbers (e.g., 400, 95).
- Some tests expect strings (e.g., `'400'`, `'95'`).
- `MetricValue.value` is typed as `number | undefined`, so string values conflict with the model.

3) Fragment type keys for compiler routing
- Fragment classes (`.type`): `action`, `effort`, `increment`, `lap`, `text`, `duration`, `distance`, `rep`, `resistance`, `rounds`.
- Compiler classes advertise the same `.type` keys and manager maps on this key.
- Verdict: Compiler type keys are consistent across fragments and compilers.

## Strategies to Resolve Type Inconsistencies

Decision: Proceed with Option C (add specific types) per latest guidance.

- Extend `MetricValue['type']` union with: `'action' | 'effort'` (future-proof to add `'group'` if Lap tagging is adopted later).
- Keep `MetricValue['value']` as `number | undefined` only.
- Carry string payloads in `unit`, with a consistent prefixing scheme.
  - Scheme: `unit = `${type}:${fragment.value}``
  - Examples: `action:Rest`, `effort:Run`, `effort:MaxEffort`.
  - Rationale: avoids changing the numeric `value` shape while making tags self-describing.

## Implementation Plan (Staged)

Stage 0: Lock decisions (docs-only)
- Tagging strategy: Option C (specific types). Add `'action' | 'effort'` to `MetricValue.type` union.
- Tag payload scheme: `unit = `${type}:${fragment.value}``; keep `value` as `undefined` for tags.

Stage 1: Fix numeric value consistency (blocking)
- Normalize tests and/or compilers so `MetricValue.value` is always a number where applicable.
  - Option 1 (preferred): Update tests for Distance/Resistance to expect numbers (400, 95).
  - Option 2: Change compilers to emit string values (not recommended; violates current type).
- Add a small helper to parse/format units consistently (e.g., distance units `m`, `km`; resistance `lb`, `kg`).

Stage 2: Implement selected tag emissions
- ActionFragmentCompiler
  - Return `[ { type: 'action', value: undefined, unit: `action:${fragment.value}` } ]` when non-empty and flag enabled.
- EffortFragmentCompiler
  - Return `[ { type: 'effort', value: undefined, unit: `effort:${fragment.value}` } ]` when flag enabled.
  - Keep FragmentCompilationManager concatenation for the human-readable `effort` field.
- TextFragmentCompiler (consolidation step)
  - Maintain current manager behavior: append `text` into `effort` string.
  - Avoid emitting a separate tag by default to prevent duplication (optional feature behind the same flag if needed).

Stage 3: Opt-in diagnostics
- Introduce a runtime or compiler option flag (e.g., `context.options.emitTags`) to toggle tag emission.
- Default: false in production, true in tests/diagnostics when needed.

Stage 4: Tests
- Add unit tests for Action/Effort/Text compilers verifying emitted tags when flag is enabled.
- Ensure existing tests still pass with tags disabled (default) and numeric values normalized.

Stage 5: Documentation updates
- Update `fragment-compiler-proposals.md` to reflect the chosen tag strategy.
- Note the numeric normalization in `fragment-compilation-implementation-analysis.md`.

## Risk and Mitigation

- Schema drift: Adding new metric types (Strategy B/C) risks consumer breakage. Mitigate by starting with Strategy A.
- Duplicate labels: Effort/Text both contributing labels. Mitigate via a single concatenation path (manager) and a single optional tag emission path (effort-only by default).
- Test brittleness: Tag emissions altering expected arrays. Mitigate with opt-in flag and test-specific expectations.

## Checklist

- [x] Decide tag strategy (C: specific metric types)
- [ ] Extend `MetricValue.type` union with `'action' | 'effort'`
- [ ] Normalize numeric metrics (update Distance/Resistance tests to numbers)
- [ ] Implement Action tag emission (guarded by flag)
- [ ] Implement Effort tag emission (guarded by flag)
- [ ] Keep Text as label-only contributor; no tag by default
- [ ] Add compiler option flag to `IScriptRuntime` context
- [ ] Add/adjust unit tests
- [ ] Update docs to reflect final decisions
