# WOD Wiki Runtime Namespace Analysis

## Current Topological Namespace Map

### Overview

The runtime system is currently scattered across multiple directories with inconsistent organization patterns. This analysis identifies the current structure, issues, and proposes better alternatives.

---

## Current Structure

```
src/
├── runtime/                           # PRIMARY runtime location (~90+ exports)
│   ├── [Root Level - Interfaces]
│   │   ├── IAnchorValue.ts
│   │   ├── IBlockContext.ts
│   │   ├── IDistributedFragments.ts
│   │   ├── IEvent.ts
│   │   ├── IEventBus.ts
│   │   ├── IEventHandler.ts
│   │   ├── IMemoryReference.ts
│   │   ├── IRuntimeAction.ts
│   │   ├── IRuntimeBehavior.ts
│   │   ├── IRuntimeBlock.ts
│   │   ├── IRuntimeBlockStrategy.ts
│   │   ├── IRuntimeClock.ts
│   │   ├── IRuntimeMemory.ts
│   │   ├── IRuntimeOptions.ts
│   │   ├── IRuntimeStack.ts
│   │   └── IScriptRuntime.ts
│   │
│   ├── [Root Level - Implementations]
│   │   ├── BlockContext.ts
│   │   ├── EventBus.ts
│   │   ├── FragmentCompilationManager.ts
│   │   ├── FragmentCompilers.ts
│   │   ├── FragmentMetricCollector.ts
│   │   ├── JitCompiler.ts
│   │   ├── MemoryEvents.ts
│   │   ├── MemoryTypeEnum.ts
│   │   ├── NextAction.ts
│   │   ├── NextEvent.ts
│   │   ├── NextEventHandler.ts
│   │   ├── PopBlockAction.ts
│   │   ├── PushBlockAction.ts
│   │   ├── RuntimeBlock.ts
│   │   ├── RuntimeBuilder.ts
│   │   ├── RuntimeClock.ts
│   │   ├── RuntimeFactory.ts
│   │   ├── RuntimeMemory.ts
│   │   ├── RuntimeMetric.ts
│   │   ├── RuntimeStack.ts
│   │   ├── ScriptRuntime.ts
│   │   └── StackEvents.ts
│   │
│   ├── actions/                       # Runtime actions (~25 classes)
│   │   ├── ActionStackActions.ts      # PushActionsAction, PopActionsAction, UpdateActionsAction
│   │   ├── CardDisplayActions.ts
│   │   ├── EmitEventAction.ts
│   │   ├── EmitMetricAction.ts
│   │   ├── ErrorAction.ts
│   │   ├── PlaySoundAction.ts
│   │   ├── RegisterEventHandlerAction.ts
│   │   ├── SegmentActions.ts          # StartSegmentAction, EndSegmentAction, RecordMetricAction, etc.
│   │   ├── StackActions.ts            # PushStackItemAction, PopStackItemAction
│   │   ├── ThrowError.ts
│   │   ├── TimerDisplayActions.ts     # PushTimerDisplayAction, PopTimerDisplayAction, UpdateTimerDisplayAction
│   │   ├── UnregisterEventHandlerAction.ts
│   │   └── WorkoutStateActions.ts     # SetWorkoutStateAction, SetRoundsDisplayAction, ResetDisplayStackAction
│   │
│   ├── behaviors/                     # Block behaviors (~12 classes)
│   │   ├── IBehavior.ts               # DEPRECATED: IPushBehavior, INextBehavior, IPopBehavior, BaseBehavior
│   │   ├── ActionLayerBehavior.ts
│   │   ├── CompletionBehavior.ts
│   │   ├── HistoryBehavior.ts
│   │   ├── IdleBehavior.ts
│   │   ├── LoopCoordinatorBehavior.ts # LoopType enum, LoopConfig, LoopState interfaces
│   │   ├── RootLifecycleBehavior.ts
│   │   ├── RuntimeControlsBehavior.ts
│   │   ├── SoundBehavior.ts
│   │   ├── TimerBehavior.ts
│   │   └── TimerStateManager.ts
│   │
│   ├── blocks/                        # Specialized blocks (3 classes)
│   │   ├── EffortBlock.ts             # + EffortBlockConfig interface
│   │   ├── RoundsBlock.ts             # + RoundsBlockConfig interface
│   │   └── TimerBlock.ts              # + TimerBlockConfig interface
│   │
│   ├── strategies/                    # JIT compilation strategies (7 classes)
│   │   ├── EffortStrategy.ts
│   │   ├── GroupStrategy.ts
│   │   ├── IntervalStrategy.ts
│   │   ├── RoundsStrategy.ts
│   │   ├── TimeBoundRoundsStrategy.ts
│   │   └── TimerStrategy.ts
│   │
│   ├── models/                        # Runtime data models
│   │   ├── MemoryModels.ts            # RuntimeButton, RuntimeControls
│   │   ├── RuntimeSpan.ts             # SpanStatus, SpanMetadata, TimerDisplayConfig, RuntimeSpan
│   │   ├── SoundModels.ts             # SoundCue, SoundCueState, SoundBehaviorConfig, SoundState
│   │   └── TimeSpan.ts                # TimeSpan (DUPLICATE of RuntimeMetric.TimeSpan!)
│   │
│   ├── context/                       # React context
│   │   └── RuntimeContext.tsx
│   │
│   ├── hooks/                         # React hooks
│   │   ├── useMemorySubscription.ts
│   │   ├── useTimerElapsed.ts
│   │   └── useTimerReferences.ts
│   │
│   ├── utils/                         # Utility functions
│   │   ├── metadata.ts
│   │   └── metricsToFragments.ts
│   │
│   └── testing/                       # Test support infrastructure
│       ├── TestableBlock.ts           # InterceptMode, MethodCall, MemoryOperation, StackOperation, TestableBlockConfig, TestableBlock
│       ├── TestableRuntime.ts         # ExecutionRecord, RuntimeSnapshot, SnapshotDiff, InitialMemoryEntry, InitialStackEntry, TestableRuntimeConfig, TestableRuntime
│       ├── components/                # Test UI components
│       └── actions/                   # Test setup actions
│           ├── ITestSetupAction.ts    # ITestSetupAction, TestSetupActionJSON, TestSetupActionFactory, TestSetupActionParamSchema
│           ├── AllocateTestMemoryAction.ts
│           ├── SetEffortStateAction.ts
│           ├── SetLoopIndexAction.ts
│           ├── SetMemoryValueAction.ts
│           ├── SetTimerStateAction.ts
│           └── TestSetupActionRegistry.ts  # TestSetupPreset

├── core/                              # SECONDARY location - RE-EXPORTS + models
│   ├── types/                         # Type re-exports from runtime/
│   │   ├── runtime.ts                 # Re-exports ~30 types from src/runtime/
│   │   ├── core.ts
│   │   ├── clock.ts
│   │   ├── editor.ts
│   │   ├── exercise.ts
│   │   ├── fragments.ts
│   │   └── providers.ts
│   │
│   ├── models/                        # Domain models (should be in runtime?)
│   │   ├── AnalyticsModels.ts
│   │   ├── BlockKey.ts                # Used by runtime blocks
│   │   ├── CodeFragment.ts            # ICodeFragment, FragmentType, FragmentCollectionState
│   │   ├── CodeMetadata.ts
│   │   ├── CodeStatement.ts           # ICodeStatement, CodeStatement, ParsedCodeStatement
│   │   ├── Dialect.ts
│   │   ├── DisplayItem.ts
│   │   ├── Duration.ts                # Duration, SpanDuration
│   │   └── StorageModels.ts
│   │
│   └── adapters/
│       └── displayItemAdapters.ts

├── types/                             # TERTIARY location - more type definitions
│   ├── MetricBehavior.ts              # MetricBehavior enum (misnamed - not about behaviors!)
│   └── cast/
│       └── messages.ts

├── fragments/                         # Fragment implementations (10 classes)
│   ├── ActionFragment.ts
│   ├── DistanceFragment.ts
│   ├── EffortFragment.ts
│   ├── IncrementFragment.ts
│   ├── LapFragment.ts
│   ├── RepFragment.ts
│   ├── ResistanceFragment.ts
│   ├── RoundsFragment.ts
│   ├── TextFragment.ts
│   └── TimerFragment.ts

├── runtime-test-bench/                # SEPARATE runtime visualization tool
│   ├── types/
│   │   ├── interfaces.ts              # RuntimeTestBenchState, RuntimeStackBlock, MemoryEntry, IRuntimeAdapter, RuntimeMemory (DUPLICATE!)
│   │   └── types.ts                   # MemoryValue, BlockDepth, MemoryFilter
│   ├── adapters/
│   ├── components/
│   ├── config/
│   ├── context/
│   ├── hooks/
│   ├── selectors/
│   ├── services/
│   └── styles/

├── views/runtime/                     # Runtime UI components (misplaced?)
│   ├── FragmentVisualizer.tsx
│   ├── fragmentColorMap.ts
│   ├── RuntimeLayout.tsx
│   └── types.ts

├── clock/                             # Clock/timer subsystem
│   ├── components/
│   ├── hooks/
│   ├── types/
│   │   └── DisplayTypes.ts
│   └── registry/

├── tracker/                           # Execution tracking
│   ├── ExecutionTracker.ts            # RuntimeReporter class
│   ├── ITrackerCommand.ts
│   └── commands/

├── services/                          # Service layer
│   ├── AnalyticsTransformer.ts
│   ├── AudioService.ts
│   ├── DialectRegistry.ts
│   ├── ExecutionLogService.ts
│   ├── WorkoutEventBus.ts
│   └── cast/

└── tests/harness/                     # Test harness (OUTSIDE src/)
    ├── BehaviorTestHarness.ts
    ├── MockBlock.ts
    ├── RuntimeTestBuilder.ts          # RuntimeSnapshot, MemoryEntry (DUPLICATES!)
    └── RuntimeTestHarness
```

---

## Identified Issues

### 1. **Namespace Scattering** 🔴 CRITICAL
Runtime-related code is scattered across 8+ different locations:
- `src/runtime/` - Primary location
- `src/core/types/runtime.ts` - Re-exports
- `src/core/models/` - Core models used by runtime
- `src/types/` - Additional type definitions
- `src/fragments/` - Fragment implementations
- `src/runtime-test-bench/` - Visualization tool
- `src/views/runtime/` - UI components
- `tests/harness/` - Test utilities

### 2. **Interface/Implementation Mixing** 🟡 IMPORTANT
The `src/runtime/` root has 16 interface files (I*.ts) mixed with 20+ implementation files. No clear separation between contracts and implementations.

### 3. **Duplicate Type Definitions** 🔴 CRITICAL
- `TimeSpan` defined in both `RuntimeMetric.ts` AND `models/TimeSpan.ts`
- `RuntimeSnapshot` defined in both `testing/TestableRuntime.ts` AND `tests/harness/RuntimeTestBuilder.ts`
- `MemoryEntry` defined in multiple places
- `RuntimeMemory` interface duplicated in `runtime-test-bench/types/interfaces.ts`

### 4. **Inconsistent Naming Conventions** 🟡 IMPORTANT
- `IBehavior.ts` contains deprecated patterns but still exists
- `IRuntimeBehavior.ts` is the canonical interface
- `MetricBehavior.ts` in `src/types/` is an enum, not a behavior class
- Actions named inconsistently: `NextAction.ts` vs `PopBlockAction.ts` vs `ThrowError.ts`

### 5. **Deep Nesting in Testing** 🟢 SUGGESTION
- `src/runtime/testing/actions/` creates deep paths
- `src/runtime-test-bench/` is a completely separate tool that could be extracted

### 6. **Re-export Chains** 🟡 IMPORTANT
Multiple layers of re-exports create confusion:
```
src/core/types/runtime.ts → re-exports from → src/runtime/I*.ts
src/core/index.ts → re-exports from → src/core/types/
src/types/index.ts → re-exports from → src/core/types/runtime.ts
```

### 7. **Fragment System Split** 🟡 IMPORTANT
- Fragment classes in `src/fragments/`
- Fragment compilers in `src/runtime/FragmentCompilers.ts`
- Fragment metrics in `src/runtime/FragmentMetricCollector.ts`
- ICodeFragment in `src/core/models/CodeFragment.ts`

---

## Proposal 1: Domain-Driven Organization

Organize by bounded contexts with clear module boundaries.

```
src/
├── runtime/                           # Core runtime engine
│   ├── contracts/                     # All interfaces in one place
│   │   ├── index.ts
│   │   ├── IScriptRuntime.ts
│   │   ├── IRuntimeBlock.ts
│   │   ├── IRuntimeAction.ts
│   │   ├── IRuntimeBehavior.ts
│   │   ├── IRuntimeMemory.ts
│   │   ├── IRuntimeStack.ts
│   │   ├── IRuntimeClock.ts
│   │   ├── IRuntimeBlockStrategy.ts
│   │   ├── IBlockContext.ts
│   │   └── events/
│   │       ├── IEvent.ts
│   │       ├── IEventBus.ts
│   │       └── IEventHandler.ts
│   │
│   ├── core/                          # Core implementations
│   │   ├── ScriptRuntime.ts
│   │   ├── RuntimeStack.ts
│   │   ├── RuntimeMemory.ts
│   │   ├── RuntimeClock.ts
│   │   ├── RuntimeBlock.ts
│   │   ├── BlockContext.ts
│   │   └── EventBus.ts
│   │
│   ├── compiler/                      # JIT compilation
│   │   ├── JitCompiler.ts
│   │   ├── RuntimeFactory.ts
│   │   ├── RuntimeBuilder.ts
│   │   ├── strategies/
│   │   │   ├── TimerStrategy.ts
│   │   │   ├── EffortStrategy.ts
│   │   │   ├── RoundsStrategy.ts
│   │   │   ├── GroupStrategy.ts
│   │   │   ├── IntervalStrategy.ts
│   │   │   └── TimeBoundRoundsStrategy.ts
│   │   └── fragments/                 # All fragment-related code together
│   │       ├── FragmentCompilationManager.ts
│   │       ├── FragmentCompilers.ts
│   │       ├── FragmentMetricCollector.ts
│   │       └── fragments/             # Fragment implementations
│   │           ├── TimerFragment.ts
│   │           ├── EffortFragment.ts
│   │           ├── RoundsFragment.ts
│   │           └── ...
│   │
│   ├── blocks/                        # Block types
│   │   ├── RuntimeBlock.ts            # Base class
│   │   ├── TimerBlock.ts
│   │   ├── EffortBlock.ts
│   │   └── RoundsBlock.ts
│   │
│   ├── behaviors/                     # Behavior pattern
│   │   ├── IRuntimeBehavior.ts        # Canonical interface (move here)
│   │   ├── TimerBehavior.ts
│   │   ├── SoundBehavior.ts
│   │   ├── CompletionBehavior.ts
│   │   ├── LoopCoordinatorBehavior.ts
│   │   └── ...
│   │
│   ├── actions/                       # Runtime actions
│   │   ├── stack/
│   │   │   ├── PushBlockAction.ts
│   │   │   ├── PopBlockAction.ts
│   │   │   └── NextAction.ts
│   │   ├── display/
│   │   │   ├── TimerDisplayActions.ts
│   │   │   ├── CardDisplayActions.ts
│   │   │   └── WorkoutStateActions.ts
│   │   ├── events/
│   │   │   ├── EmitEventAction.ts
│   │   │   ├── RegisterEventHandlerAction.ts
│   │   │   └── UnregisterEventHandlerAction.ts
│   │   └── audio/
│   │       └── PlaySoundAction.ts
│   │
│   ├── events/                        # Event system
│   │   ├── EventBus.ts
│   │   ├── NextEvent.ts
│   │   ├── MemoryEvents.ts
│   │   └── StackEvents.ts
│   │
│   ├── models/                        # Runtime models (single source of truth)
│   │   ├── TimeSpan.ts                # ONE definition
│   │   ├── RuntimeSpan.ts
│   │   ├── RuntimeMetric.ts
│   │   ├── MemoryModels.ts
│   │   └── SoundModels.ts
│   │
│   ├── hooks/                         # React hooks
│   │   ├── useMemorySubscription.ts
│   │   ├── useTimerElapsed.ts
│   │   └── useTimerReferences.ts
│   │
│   └── context/
│       └── RuntimeContext.tsx
│
├── testing/                           # All test utilities (move from runtime/testing)
│   ├── harness/                       # Test harnesses
│   │   ├── BehaviorTestHarness.ts
│   │   ├── RuntimeTestBuilder.ts
│   │   └── MockBlock.ts
│   ├── testable/                      # Testable wrappers
│   │   ├── TestableRuntime.ts
│   │   └── TestableBlock.ts
│   └── setup/                         # Test setup actions
│       ├── ITestSetupAction.ts
│       ├── SetTimerStateAction.ts
│       └── ...
│
├── devtools/                          # Development tools (extract runtime-test-bench)
│   └── runtime-test-bench/
│       └── ...
│
├── domain/                            # Domain models (rename from core/)
│   ├── models/
│   │   ├── CodeStatement.ts
│   │   ├── CodeFragment.ts
│   │   ├── BlockKey.ts
│   │   ├── Duration.ts
│   │   └── Dialect.ts
│   └── enums/
│       ├── FragmentType.ts
│       └── MetricBehavior.ts          # Rename from types/MetricBehavior.ts
│
└── ui/                                # UI components (consolidated)
    ├── clock/
    ├── fragments/
    └── runtime/
        ├── FragmentVisualizer.tsx
        └── RuntimeLayout.tsx
```

### Benefits of Proposal 1
- **Clear contracts layer** - All interfaces in `runtime/contracts/`
- **Logical grouping** - Compilation, blocks, behaviors, actions have clear homes
- **Single source of truth** - No duplicate models
- **Separated concerns** - Testing, devtools, UI clearly separated from core

---

## Proposal 2: Layered Architecture

Organize by architectural layers (inspired by Clean Architecture).

```
src/
├── domain/                            # Domain layer - pure business logic, no dependencies
│   ├── models/                        # Domain entities
│   │   ├── CodeStatement.ts
│   │   ├── CodeFragment.ts
│   │   ├── BlockKey.ts
│   │   ├── Duration.ts
│   │   ├── TimeSpan.ts
│   │   └── RuntimeMetric.ts
│   │
│   ├── fragments/                     # Fragment value objects
│   │   ├── TimerFragment.ts
│   │   ├── EffortFragment.ts
│   │   └── ...
│   │
│   └── enums/
│       ├── FragmentType.ts
│       ├── MetricBehavior.ts
│       └── MemoryType.ts
│
├── runtime/                           # Application/Runtime layer
│   ├── interfaces/                    # Port interfaces (abstractions)
│   │   ├── IScriptRuntime.ts
│   │   ├── IRuntimeBlock.ts
│   │   ├── IRuntimeAction.ts
│   │   ├── IRuntimeBehavior.ts
│   │   ├── IRuntimeMemory.ts
│   │   ├── IRuntimeStack.ts
│   │   ├── IRuntimeClock.ts
│   │   └── IEventBus.ts
│   │
│   ├── engine/                        # Runtime engine core
│   │   ├── ScriptRuntime.ts
│   │   ├── RuntimeStack.ts
│   │   ├── RuntimeMemory.ts
│   │   └── RuntimeClock.ts
│   │
│   ├── blocks/                        # Block implementations
│   │   ├── base/
│   │   │   ├── RuntimeBlock.ts
│   │   │   └── BlockContext.ts
│   │   └── specialized/
│   │       ├── TimerBlock.ts
│   │       ├── EffortBlock.ts
│   │       └── RoundsBlock.ts
│   │
│   ├── behaviors/                     # Behavior implementations
│   │   └── ...
│   │
│   ├── actions/                       # Action implementations
│   │   └── ...
│   │
│   ├── events/                        # Event system
│   │   └── ...
│   │
│   └── models/                        # Runtime-specific models
│       ├── RuntimeSpan.ts
│       ├── MemoryModels.ts
│       └── SoundModels.ts
│
├── compiler/                          # Compilation layer (separate concern)
│   ├── JitCompiler.ts
│   ├── RuntimeFactory.ts
│   ├── RuntimeBuilder.ts
│   ├── strategies/
│   │   └── ...
│   └── fragments/
│       ├── FragmentCompilationManager.ts
│       └── FragmentCompilers.ts
│
├── infrastructure/                    # Infrastructure layer
│   ├── services/
│   │   ├── AudioService.ts
│   │   ├── AnalyticsTransformer.ts
│   │   └── ExecutionLogService.ts
│   ├── adapters/
│   │   └── displayItemAdapters.ts
│   └── storage/
│       └── ...
│
├── presentation/                      # Presentation layer (UI)
│   ├── clock/
│   ├── fragments/
│   ├── runtime/
│   │   ├── FragmentVisualizer.tsx
│   │   └── RuntimeLayout.tsx
│   ├── hooks/
│   │   ├── useMemorySubscription.ts
│   │   └── useTimerElapsed.ts
│   └── context/
│       └── RuntimeContext.tsx
│
├── testing/                           # Testing infrastructure
│   ├── harness/
│   ├── testable/
│   └── setup/
│
└── devtools/                          # Development tools
    └── runtime-test-bench/
```

### Benefits of Proposal 2
- **Dependency direction** - Clear inward dependencies (Presentation → Runtime → Domain)
- **Testability** - Domain layer is pure, easily testable
- **Framework independence** - Core logic separated from React/UI concerns
- **Compiler isolation** - JIT compiler is a separate bounded context

---

## Proposal 3: Feature-Based Organization

Organize by features/capabilities.

```
src/
├── core/                              # Shared kernel
│   ├── interfaces/                    # All shared interfaces
│   │   ├── runtime/
│   │   │   ├── IScriptRuntime.ts
│   │   │   ├── IRuntimeBlock.ts
│   │   │   └── ...
│   │   └── events/
│   │       └── ...
│   │
│   ├── models/                        # Shared models
│   │   ├── TimeSpan.ts
│   │   ├── Duration.ts
│   │   ├── CodeStatement.ts
│   │   └── CodeFragment.ts
│   │
│   └── enums/
│       ├── FragmentType.ts
│       └── MetricBehavior.ts
│
├── features/                          # Feature modules
│   │
│   ├── runtime-engine/                # Runtime execution feature
│   │   ├── ScriptRuntime.ts
│   │   ├── RuntimeStack.ts
│   │   ├── RuntimeMemory.ts
│   │   ├── RuntimeClock.ts
│   │   ├── RuntimeBlock.ts
│   │   ├── BlockContext.ts
│   │   ├── EventBus.ts
│   │   ├── events/
│   │   │   ├── StackEvents.ts
│   │   │   └── MemoryEvents.ts
│   │   └── index.ts
│   │
│   ├── compilation/                   # JIT compilation feature
│   │   ├── JitCompiler.ts
│   │   ├── RuntimeFactory.ts
│   │   ├── RuntimeBuilder.ts
│   │   ├── strategies/
│   │   ├── fragments/
│   │   │   ├── FragmentCompilationManager.ts
│   │   │   └── compilers/
│   │   └── index.ts
│   │
│   ├── blocks/                        # Block types feature
│   │   ├── timer/
│   │   │   ├── TimerBlock.ts
│   │   │   ├── TimerBehavior.ts
│   │   │   └── TimerStrategy.ts        # Co-locate related strategy
│   │   ├── effort/
│   │   │   ├── EffortBlock.ts
│   │   │   ├── EffortStrategy.ts
│   │   │   └── ...
│   │   ├── rounds/
│   │   │   └── ...
│   │   └── index.ts
│   │
│   ├── behaviors/                     # Shared behaviors feature
│   │   ├── SoundBehavior.ts
│   │   ├── CompletionBehavior.ts
│   │   ├── LoopCoordinatorBehavior.ts
│   │   └── index.ts
│   │
│   ├── actions/                       # Runtime actions feature
│   │   ├── stack/
│   │   ├── display/
│   │   ├── audio/
│   │   └── index.ts
│   │
│   ├── fragments/                     # Fragment definitions feature
│   │   ├── TimerFragment.ts
│   │   ├── EffortFragment.ts
│   │   └── index.ts
│   │
│   └── audio/                         # Audio feature
│       ├── AudioService.ts
│       ├── PlaySoundAction.ts
│       ├── SoundBehavior.ts
│       └── SoundModels.ts
│
├── ui/                                # UI layer
│   ├── clock/
│   ├── fragments/
│   ├── runtime/
│   ├── hooks/
│   └── context/
│
├── testing/                           # Testing infrastructure
│   └── ...
│
└── devtools/                          # Development tools
    └── runtime-test-bench/
```

### Benefits of Proposal 3
- **Feature cohesion** - Related code lives together (TimerBlock + TimerBehavior + TimerStrategy)
- **Easy navigation** - Find all timer-related code in one place
- **Scalable** - New features get their own module
- **Reduced coupling** - Features have clear boundaries

---

## Comparison Matrix

| Criteria | Current | Proposal 1 | Proposal 2 | Proposal 3 |
|----------|---------|------------|------------|------------|
| **Find all runtime interfaces** | 🔴 Scattered | 🟢 contracts/ | 🟢 interfaces/ | 🟡 core/interfaces/ |
| **Find block implementations** | 🟡 blocks/ | 🟢 blocks/ | 🟢 blocks/ | 🟢 features/blocks/ |
| **Find fragment code** | 🔴 4 locations | 🟢 compiler/fragments/ | 🟢 domain/fragments/ + compiler/ | 🟢 features/fragments/ |
| **Avoid duplicates** | 🔴 Many | 🟢 Single source | 🟢 Single source | 🟢 Single source |
| **Understand dependencies** | 🔴 Unclear | 🟡 Better | 🟢 Clear layers | 🟡 Per feature |
| **Add new feature** | 🔴 Where? | 🟡 Multiple places | 🟡 Multiple layers | 🟢 New feature folder |
| **Test isolation** | 🟡 Some | 🟢 testing/ | 🟢 testing/ | 🟢 testing/ |
| **Migration effort** | - | Medium | High | Medium-High |

---

## Recommended Approach

**Recommendation: Start with Proposal 1 (Domain-Driven), then evolve toward Proposal 3 (Feature-Based) for specific bounded contexts.**

### Immediate Actions (Low Risk)
1. **Consolidate interfaces** into `runtime/contracts/`
2. **Remove duplicate definitions** (TimeSpan, RuntimeSnapshot, MemoryEntry)
3. **Move fragments** from `src/fragments/` to `runtime/compiler/fragments/`
4. **Extract testing** from `runtime/testing/` to `src/testing/`
5. **Rename deprecated files** (IBehavior.ts → deprecate or remove)

### Medium-Term Actions
6. **Move runtime UI** from `views/runtime/` to `ui/runtime/`
7. **Extract runtime-test-bench** to `devtools/`
8. **Consolidate types** - Remove `src/types/` re-export chains

### Long-Term Evolution
9. **Group by feature** for cohesive bounded contexts (timer, effort, rounds)
10. **Consider monorepo** if runtime-test-bench becomes a separate package

---

## Type Count Summary

| Location | Interfaces | Classes | Types/Enums | Total |
|----------|------------|---------|-------------|-------|
| runtime/ root | 16 | 12 | 8 | 36 |
| runtime/actions/ | 2 | 25 | 2 | 29 |
| runtime/behaviors/ | 6 | 11 | 2 | 19 |
| runtime/blocks/ | 3 | 3 | 0 | 6 |
| runtime/strategies/ | 0 | 7 | 0 | 7 |
| runtime/models/ | 4 | 2 | 2 | 8 |
| runtime/testing/ | 8 | 7 | 5 | 20 |
| core/models/ | 3 | 5 | 3 | 11 |
| fragments/ | 1 | 10 | 0 | 11 |
| runtime-test-bench/types/ | 10 | 0 | 8 | 18 |
| tests/harness/ | 2 | 3 | 0 | 5 |
| **TOTAL** | **55** | **85** | **30** | **170+** |
