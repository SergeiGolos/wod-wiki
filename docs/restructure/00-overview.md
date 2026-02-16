# Behavior Restructuring — Phased Plan Overview

## Goal

Collapse 27 behaviors into 8 clearly separated aspects. Each phase produces a working, tested codebase — no phase leaves the system in a broken state.

## Phase Dependency Graph

```
Phase 0 (Cleanup)
    │
    ├── Phase 1 (Timer Aspect)
    │       │
    │       ├── Phase 3 (Timer Ending Aspect)
    │       │
    │       └── Phase 6 (Report Output Aspect)
    │
    ├── Phase 2 (Re-Entry Aspect)
    │       │
    │       ├── Phase 4 (Rounds End Aspect)
    │       │
    │       └── Phase 6 (Report Output Aspect)
    │
    └── Phase 5 (Child Selection Aspect)
            │
            └── Phase 7 (Labeling Aspect)
```

## Phase Summary

| Phase | Name | Merges | Old Behaviors | New Behavior | Risk |
|-------|------|--------|---------------|--------------|------|
| **0** | Cleanup & Foundation | — | Remove `IdleInjectionBehavior`, add `children:status` memory contract | — | Low |
| **1** | Timer Aspect | 3 → 1 | `TimerInitBehavior` + `TimerTickBehavior` + `TimerPauseBehavior` | `TimerBehavior` | Medium |
| **2** | Re-Entry Aspect | 3 → 1 | `RoundInitBehavior` + `RoundAdvanceBehavior` + `ReentryCounterBehavior` | `ReEntryBehavior` | Medium |
| **3** | Timer Ending Aspect | 3 → 2 | `TimerCompletionBehavior` + `PopOnNextBehavior` + `PopOnEventBehavior` | `TimerEndingBehavior` + `LeafExitBehavior` | Low |
| **4** | Rounds End Aspect | 2 → 1 | `RoundCompletionBehavior` + `SessionCompletionBehavior` | `RoundsEndBehavior` | Low |
| **5** | Child Selection Aspect | 3 → 1 | `ChildRunnerBehavior` + `ChildLoopBehavior` + `RestBlockBehavior` | `ChildSelectionBehavior` | High |
| **6** | Report Output Aspect | 3 → 1 | `SegmentOutputBehavior` + `TimerOutputBehavior` + `RoundOutputBehavior` | `ReportOutputBehavior` | Medium |
| **7** | Labeling + Promotion | 3 → 2 | `DisplayInitBehavior` + `RoundDisplayBehavior` + `RepSchemeBehavior` (+ keep `PromoteFragmentBehavior`) | `LabelingBehavior` + `FragmentPromotionBehavior` | Medium |

## Constraints

1. **Every phase must leave all tests green** (≤12 baseline failures)
2. **No behavior-to-behavior `getBehavior()` coupling in new code** — use shared memory tags
3. **Strategies are updated inline** — when a behavior is replaced, its strategy wiring is updated in the same phase
4. **BlockBuilder aspect methods** (`.asTimer()`, `.asRepeater()`, `.asContainer()`) are updated to compose new behaviors
5. **Old behaviors are deleted only after all consumers are migrated**
6. **`bun run test` must pass after each phase** — run before committing

## Memory Tag Contracts (Shared State)

The key architectural change is replacing `getBehavior()` coupling with memory-based contracts:

| Tag                | Shape                                                          | Writer                                    | Readers                                                                                      |
| ------------------ | -------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `timer`            | `TimerState` (`{ spans, direction, durationMs, label, role }`) | `TimerBehavior`                           | `TimerEndingBehavior`, `ReportOutputBehavior`, `SoundCueBehavior`, `ChildSelectionBehavior`  |
| `round`            | `CurrentRoundFragment` (`{ current, total }`)                  | `ReEntryBehavior`                         | `RoundsEndBehavior`, `ReportOutputBehavior`, `LabelingBehavior`, `FragmentPromotionBehavior` |
| `children:status`  | `{ childIndex, totalChildren, allExecuted, allCompleted }`     | `ChildSelectionBehavior`                  | `ReEntryBehavior` (advancement gating), `RoundsEndBehavior`                                  |
| `display`          | `ICodeFragment[]`                                              | `LabelingBehavior`                        | `ReportOutputBehavior`                                                                       |
| `fragment:display` | `ICodeFragment[]`                                              | BlockBuilder (external)                   | `ReportOutputBehavior`, `LabelingBehavior`                                                   |
| `fragment:promote` | `ICodeFragment[]`                                              | `FragmentPromotionBehavior`               | JitCompiler (external)                                                                       |
| `fragment:result`  | `ICodeFragment[]`                                              | `ReportOutputBehavior`                    | External consumers                                                                           |
| `controls`         | Button state                                                   | `ButtonBehavior` (unchanged)              | External consumers                                                                           |
| `completion`       | Timestamp                                                      | `CompletionTimestampBehavior` (unchanged) | External consumers                                                                           |

## Files Per Phase (estimated)

| Phase | New Files | Modified Files | Deleted Files | Tests Updated | Tests Created |
|-------|-----------|----------------|---------------|---------------|---------------|
| 0 | 0 | 2 | 1 | 0 | 0 |
| 1 | 1 | 6 | 3 | ~8 | 1 |
| 2 | 1 | 5 | 3 | ~6 | 1 |
| 3 | 2 | 4 | 3 | ~4 | 2 |
| 4 | 1 | 4 | 2 | ~3 | 1 |
| 5 | 1 | 6 | 3 | ~8 | 1 |
| 6 | 1 | 6 | 3 | ~6 | 1 |
| 7 | 2 | 5 | 3 | ~4 | 2 |

**Total: ~9 new, ~38 modified, ~21 deleted, ~39 test updates, ~9 new test files**
