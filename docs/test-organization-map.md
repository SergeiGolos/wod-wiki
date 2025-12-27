# WOD Wiki Runtime - Test Organization Map

## Test File Hierarchy

```
PROJECT ROOT
│
├── src/runtime/
│   ├── __tests__/
│   │   ├── ✓ FragmentMetricCollector.test.ts (232 lines)
│   │   ├── ✓ JitCompiler.test.ts (175 lines)
│   │   ├── ✓ LifecycleTimestamps.test.ts (175 lines)
│   │   ├── ✓ NextAction.test.ts (176 lines)
│   │   ├── ✓ NextEvent.test.ts (75 lines)
│   │   ├── ✓ NextEventHandler.test.ts (192 lines)
│   │   ├── ✓ RootLifecycle.test.ts (193 lines)
│   │   ├── ✓ RuntimeDebugMode.test.ts (317 lines)
│   │   ├── ✓ RuntimeStackLifecycle.test.ts (172 lines)
│   │   ├── ✗ RuntimeMemory.test.ts (NEW NEEDED)
│   │   ├── ✗ EventBus.test.ts (NEW NEEDED)
│   │   ├── ✗ RuntimeClock.test.ts (NEW NEEDED)
│   │   ├── ✗ RuntimeBlock.test.ts (NEW NEEDED)
│   │   ├── ✗ DisposalAndCleanup.test.ts (NEW NEEDED)
│   │   ├── ✗ MemoryEdgeCases.test.ts (NEW NEEDED)
│   │   └── ✗ EventSystemEdgeCases.test.ts (NEW NEEDED)
│   │
│   ├── actions/
│   │   ├── ActionStackActions.ts
│   │   ├── CardDisplayActions.ts
│   │   ├── EmitEventAction.ts
│   │   ├── EmitMetricAction.ts
│   │   ├── ErrorAction.ts
│   │   ├── PlaySoundAction.ts
│   │   ├── RegisterEventHandlerAction.ts
│   │   ├── SegmentActions.ts
│   │   ├── StackActions.ts
│   │   ├── StartTimerAction.ts
│   │   ├── StopTimerAction.ts
│   │   ├── TimerDisplayActions.ts
│   │   ├── UnregisterEventHandlerAction.ts
│   │   ├── WorkoutStateActions.ts
│   │   └── __tests__/
│   │       ├── ✓ ActionStackActions.test.ts (only 1 tested!)
│   │       ├── ✗ TimerActions.test.ts (NEW NEEDED)
│   │       ├── ✗ DisplayActions.test.ts (NEW NEEDED)
│   │       ├── ✗ SegmentActions.test.ts (NEW NEEDED)
│   │       ├── ✗ EventActions.test.ts (NEW NEEDED)
│   │       ├── ✗ StateActions.test.ts (NEW NEEDED)
│   │       └── ✗ OtherActions.test.ts (NEW NEEDED)
│   │
│   ├── behaviors/
│   │   ├── ActionLayerBehavior.ts
│   │   ├── CompletionBehavior.ts
│   │   ├── HistoryBehavior.ts
│   │   ├── IBehavior.ts
│   │   ├── IdleBehavior.ts
│   │   ├── LoopCoordinatorBehavior.ts
│   │   ├── PrimaryClockBehavior.ts
│   │   ├── RootLifecycleBehavior.ts
│   │   ├── RuntimeControlsBehavior.ts
│   │   ├── SoundBehavior.ts
│   │   ├── TimerBehavior.ts
│   │   ├── TimerStateManager.ts
│   │   └── __tests__/
│   │       ├── ✓ ActionLayerBehavior.test.ts
│   │       ├── ✓ CompletionBehavior.test.ts (8,835 lines!)
│   │       ├── ✓ IBehavior.test.ts (8,842 lines!)
│   │       ├── ✓ LoopCoordinatorBehavior.test.ts
│   │       ├── ✓ TimerBehavior.test.ts (8,654 lines!)
│   │       ├── ✗ RootLifecycleBehavior.test.ts (NEW NEEDED - 12k LOC!)
│   │       ├── ✗ SoundBehavior.test.ts (NEW NEEDED - 9k LOC!)
│   │       ├── ✗ HistoryBehavior.test.ts (NEW NEEDED)
│   │       ├── ✗ IdleBehavior.test.ts (NEW NEEDED)
│   │       ├── ✗ PrimaryClockBehavior.test.ts (NEW NEEDED)
│   │       ├── ✗ RuntimeControlsBehavior.test.ts (NEW NEEDED)
│   │       └── ✗ TimerStateManager.test.ts (NEW NEEDED)
│   │
│   ├── blocks/
│   │   ├── EffortBlock.ts
│   │   ├── RoundsBlock.ts
│   │   ├── TimerBlock.ts
│   │   └── __tests__/ (DIRECTORY MISSING!)
│   │       ├── ✗ TimerBlock.test.ts (NEW NEEDED)
│   │       ├── ✗ RoundsBlock.test.ts (NEW NEEDED)
│   │       └── ✗ EffortBlock.test.ts (NEW NEEDED)
│   │
│   ├── hooks/
│   │   ├── useMemorySubscription.ts
│   │   ├── useTimerElapsed.ts
│   │   ├── useTimerReferences.ts
│   │   └── __tests__/ (DIRECTORY MISSING!)
│   │       ├── ✗ useMemorySubscription.test.tsx (NEW NEEDED)
│   │       ├── ✗ useTimerElapsed.test.tsx (NEW NEEDED)
│   │       └── ✗ useTimerReferences.test.tsx (NEW NEEDED)
│   │
│   ├── strategies/
│   │   ├── EffortStrategy.ts
│   │   ├── GroupStrategy.ts
│   │   ├── IntervalStrategy.ts
│   │   ├── RoundsStrategy.ts
│   │   ├── TimeBoundRoundsStrategy.ts
│   │   ├── TimerStrategy.ts
│   │   └── __tests__/
│   │       ├── ✓ EffortStrategy.test.ts
│   │       ├── ✓ GroupStrategy.test.ts
│   │       ├── ✓ IntervalStrategy.test.ts
│   │       ├── ✓ RoundsStrategy.test.ts
│   │       ├── ✓ TimeBoundRoundsStrategy.test.ts
│   │       └── ✓ TimerStrategy.test.ts
│   │
│   ├── BlockContext.ts (untested)
│   ├── EventBus.ts (untested!)
│   ├── FragmentCompilationManager.ts
│   ├── JitCompiler.ts (tested ✓)
│   ├── RuntimeBlock.ts (untested!)
│   ├── RuntimeClock.ts (untested!)
│   ├── RuntimeMemory.ts (untested!)
│   ├── RuntimeStack.ts (tested ✓)
│   ├── ScriptRuntime.ts (integration tested only)
│   └── ...other utilities
│
├── tests/ (Integration & Component Tests)
│   ├── harness/
│   │   ├── BehaviorTestHarness.ts
│   │   ├── MockBlock.ts
│   │   ├── RuntimeTestBuilder.ts
│   │   └── __tests__/
│   │       ├── ✓ BehaviorTestHarness.test.ts
│   │       ├── ✓ MockBlock.test.ts
│   │       └── ✓ RuntimeTestBuilder.test.ts
│   │
│   ├── jit-compilation/
│   │   ├── ✓ fragment-compilation.test.ts (1,047 lines)
│   │   ├── ✓ block-compilation.test.ts (304 lines)
│   │   ├── ✓ strategy-matching.test.ts (116 lines)
│   │   └── ✓ strategy-precedence.test.ts (448 lines)
│   │
│   ├── language-compilation/
│   │   ├── ✓ parser-integration.test.ts (127 lines)
│   │   ├── ✓ statement-ids.test.ts (84 lines)
│   │   ├── ✓ syntax_features.test.ts (217 lines)
│   │   ├── ✓ wod-script-parsing.test.ts (72 lines)
│   │   └── ✓ parser-error-recovery.test.ts (22 lines)
│   │
│   ├── metrics-recording/
│   │   ├── ✓ metric-collector.test.ts (89 lines)
│   │   └── ✓ metric-inheritance.test.ts (160 lines)
│   │
│   ├── performance/
│   │   └── ✓ stack-performance.test.ts (481 lines)
│   │
│   ├── runtime-execution/
│   │   ├── blocks/
│   │   │   └── ✓ effort-block-lifecycle.test.ts
│   │   ├── memory/
│   │   │   ├── ✓ anchor-subscriptions.test.ts
│   │   │   ├── ✓ block-context.test.ts
│   │   │   └── ✓ memory-reference.test.ts
│   │   ├── stack/
│   │   │   ├── ✓ stack-api.test.ts
│   │   │   ├── ✓ stack-disposal.test.ts
│   │   │   └── ✓ stack-edge-cases.test.ts
│   │   ├── workflows/
│   │   │   ├── ✓ next-button-workflow.test.ts
│   │   │   └── ✓ runtime-hooks.test.ts
│   │   ├── ✓ orchestration.test.ts (27 lines)
│   │   └── ✗ LifecycleEdgeCases.test.ts (NEW NEEDED)
│   │
│   └── performance/
│       └── ✗ RuntimeBenchmarks.test.ts (NEW NEEDED)
│
└── docs/
    ├── missing-tests.md (THIS ANALYSIS - 740 lines)
    ├── missing-tests-summary.md (EXECUTIVE SUMMARY)
    └── test-organization-map.md (THIS FILE)
```

## Component Test Coverage Summary

### Legend
- ✓ = Has unit tests
- ✗ = Missing unit tests
- ! = High priority

### Tested Components (20)
```
Behaviors (5):
  ✓ TimerBehavior
  ✓ CompletionBehavior
  ✓ LoopCoordinatorBehavior
  ✓ ActionLayerBehavior
  ✓ IBehavior (base)

Strategies (6):
  ✓ TimerStrategy
  ✓ RoundsStrategy
  ✓ EffortStrategy
  ✓ IntervalStrategy
  ✓ TimeBoundRoundsStrategy
  ✓ GroupStrategy

Infrastructure (4):
  ✓ RuntimeStack
  ✓ JitCompiler
  ✓ FragmentMetricCollector
  ✓ (others via integration)

Actions (1):
  ✓ ActionStackActions (partial)

Hooks (0):
  ✗ (all 3 untested)
```

### Untested Components (30)
```
Behaviors (7):
  ✗ RootLifecycleBehavior! (12,437 LOC)
  ✗ SoundBehavior! (8,951 LOC)
  ✗ HistoryBehavior (3,151 LOC)
  ✗ IdleBehavior
  ✗ PrimaryClockBehavior
  ✗ RuntimeControlsBehavior
  ✗ TimerStateManager (6,052 LOC)

Blocks (3):
  ✗ TimerBlock!
  ✗ RoundsBlock!
  ✗ EffortBlock!

Actions (14):
  ✗ StartTimerAction!
  ✗ StopTimerAction!
  ✗ EmitEventAction
  ✗ EmitMetricAction
  ✗ PlaySoundAction
  ✗ RegisterEventHandlerAction
  ✗ UnregisterEventHandlerAction
  ✗ ErrorAction
  ✗ SegmentActions (5 types)
  ✗ TimerDisplayActions (3 types)
  ✗ CardDisplayActions (3 types)
  ✗ WorkoutStateActions (3 types)

Hooks (3):
  ✗ useMemorySubscription
  ✗ useTimerElapsed
  ✗ useTimerReferences

Infrastructure (4):
  ✗ RuntimeMemory!
  ✗ EventBus!
  ✗ RuntimeClock!
  ✗ RuntimeBlock!
```

## Test Density

```
HIGH DENSITY (Excellent Coverage):
  IBehavior.test.ts (8,842 lines / 1 component)
  CompletionBehavior.test.ts (8,835 lines / 1 component)
  TimerBehavior.test.ts (8,654 lines / 1 component)

GOOD DENSITY:
  Fragment compilation (1,047 lines / 1 category)
  Strategy precedence (448 lines / 1 category)
  Stack performance (481 lines / benchmarks)

LOW/NO DENSITY:
  ActionStackActions.test.ts (2,213 lines / 15 action types)
  No tests for 3 blocks (should have 60-75 tests)
  No tests for 7 behaviors (should have 80-100 tests)
  No tests for 3 hooks (should have 30-45 tests)
  No tests for 14 action types (should have 50-70 tests)

CRITICAL GAPS:
  RuntimeMemory (core) - 0 tests
  EventBus (core) - 0 tests
  RuntimeClock (core) - 0 tests
  RuntimeBlock (base) - 0 tests
  Disposal/cleanup - 0 systematic tests
```

## Next Actions

See [missing-tests.md](./missing-tests.md) for:
- Detailed test specifications
- Priority rankings
- Effort estimates
- Test templates

See [missing-tests-summary.md](./missing-tests-summary.md) for:
- Executive overview
- Risk assessment
- Recommendation timeline
- Investment summary

---

**Last Updated**: 2024-12-27
**Prepared By**: Engineering Analysis
**Review Date**: Next sprint planning
