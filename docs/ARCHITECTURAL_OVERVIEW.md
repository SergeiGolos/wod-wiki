# WOD Wiki - Architectural Overview

> **Generated**: 2025-12-28  
> **Source Analysis**: TypeScript interfaces and implementation classes only  
> **Excludes**: Markdown documentation comments

## Table of Contents

1. [Interface Interaction Map](#interface-interaction-map)
2. [Mermaid.js Class Diagrams](#mermaidjs-class-diagrams)
3. [Redundancy & Hygiene Report](#redundancy--hygiene-report)
4. [Architectural Goal Summary](#architectural-goal-summary)

---

## Interface Interaction Map

### Primary Interfaces

The WOD Wiki codebase is organized around a **stack-based runtime execution engine** for workout scripts. The primary interfaces are:

| Interface | Location | Purpose |
|-----------|----------|---------|
| `IScriptRuntime` | `src/runtime/IScriptRuntime.ts` | Central runtime context orchestrating execution |
| `IRuntimeBlock` | `src/runtime/IRuntimeBlock.ts` | Executable workout block with lifecycle hooks |
| `IRuntimeStack` | `src/runtime/IRuntimeStack.ts` | Stack-based execution management |
| `IRuntimeMemory` | `src/runtime/IRuntimeMemory.ts` | Separate memory management for debugging |
| `IEventBus` | `src/runtime/IEventBus.ts` | Event dispatch and handler registration |
| `IRuntimeBehavior` | `src/runtime/IRuntimeBehavior.ts` | Composable behavior pattern for blocks |
| `IRuntimeBlockStrategy` | `src/runtime/IRuntimeBlockStrategy.ts` | Strategy pattern for JIT compilation |
| `IBlockContext` | `src/runtime/IBlockContext.ts` | Memory allocation context per block |
| `IRuntimeClock` | `src/runtime/IRuntimeClock.ts` | Time tracking for runtime |
| `IRuntimeAction` | `src/runtime/IRuntimeAction.ts` | Command pattern for runtime mutations |
| `IEvent` | `src/runtime/IEvent.ts` | Base event contract |
| `IEventHandler` | `src/runtime/IEventHandler.ts` | Event handling with action production |
| `IMemoryReference` | `src/runtime/IMemoryReference.ts` | Reference handle for memory locations |

### Secondary Interfaces

| Interface | Location | Purpose |
|-----------|----------|---------|
| `IScript` | `src/parser/WodScript.ts` | Parsed workout script representation |
| `ICodeStatement` | `src/core/models/CodeStatement.ts` | Single parsed statement node |
| `ICodeFragment` | `src/core/models/CodeFragment.ts` | Fragment within a statement |
| `IDialect` | `src/core/models/Dialect.ts` | Semantic hint generation |
| `ITrackerCommand` | `src/tracker/ITrackerCommand.ts` | Command pattern for execution tracking |
| `IFragmentMetricCollector` | `src/runtime/FragmentMetricCollector.ts` | Fragment-based metric collection |
| `IProjectionEngine` | `src/timeline/analytics/analytics/IProjectionEngine.ts` | Analytics projection engine |
| `ICardParserStrategy` | `src/editor/parsers/ICardParserStrategy.ts` | Editor card parsing strategy |
| `IDistributedFragments` | `src/runtime/IDistributedFragments.ts` | Fragment distribution for iterations |
| `IFragmentCompiler` | `src/runtime/FragmentCompilationManager.ts` | Fragment-to-metric compilation |
| `IRuntimeFactory` | `src/runtime/RuntimeFactory.ts` | Factory for runtime instances |
| `IAnchorValue` | `src/runtime/IAnchorValue.ts` | Anchor memory reference value |

### Behavior Interface

The canonical behavior interface is `IRuntimeBehavior`:

| Interface | Location | Purpose |
|-----------|----------|---------|
| `IRuntimeBehavior` | `src/runtime/IRuntimeBehavior.ts` | **Canonical** composable behavior contract for runtime blocks |

> **Note**: The `IBehavior` pattern in `src/runtime/behaviors/IBehavior.ts` is **deprecated**. All production behaviors implement `IRuntimeBehavior` directly.

### Testing Interfaces

| Interface | Location | Purpose |
|-----------|----------|---------|
| `ITestSetupAction` | `src/runtime/testing/actions/ITestSetupAction.ts` | Test scenario setup actions |

### Display/UI Interfaces

| Interface | Location | Purpose |
|-----------|----------|---------|
| `IDisplayItem` | `src/core/models/DisplayItem.ts` | Unified display model for UI |
| `ITimerDisplayEntry` | `src/clock/types/DisplayTypes.ts` | Timer display data |
| `IDisplayButton` | `src/clock/types/DisplayTypes.ts` | Control button display data |
| `IDisplayCardEntry` | `src/clock/types/DisplayTypes.ts` | Card display data |
| `IDisplayMetric` | `src/clock/types/DisplayTypes.ts` | Metric display data |
| `IDisplayStackState` | `src/clock/types/DisplayTypes.ts` | Full display stack state |

---

## Dependency Chains

### Core Runtime Dependencies

```
IScriptRuntime
├── IRuntimeStack (contains IRuntimeBlock[])
├── IRuntimeMemory (contains IMemoryReference[])
├── IEventBus (manages IEventHandler[])
├── IRuntimeClock
├── JitCompiler (uses IRuntimeBlockStrategy[])
└── RuntimeReporter (uses ITrackerCommand[])

IRuntimeBlock
├── IBlockContext (memory allocation)
├── IRuntimeBehavior[] (composable behaviors)
└── ICodeFragment[][] (execution data)

IRuntimeBlockStrategy
├── ICodeStatement[] (input)
├── IScriptRuntime (context)
└── IRuntimeBlock (output)
```

### Memory System Dependencies

```
IRuntimeMemory
├── TypedMemoryReference<T> (implements IMemoryReference)
│   └── IMemorySubscription<T>[]
└── MemoryEventDispatcher → IEventBus

IBlockContext
├── IRuntimeMemory (allocation target)
├── IMemoryReference[] (tracked references)
└── IAnchorValue (anchor memory)
```

### Event System Dependencies

```
IEventBus
├── IEventHandler[] (registered handlers)
│   └── IEvent → IRuntimeAction[]
└── EventCallback[] (simple listeners)

IEventHandler
├── IEvent (input)
├── IScriptRuntime (context)
└── IRuntimeAction[] (output)
```

---

## Mermaid.js Class Diagrams

### Core Runtime Architecture

```mermaid
classDiagram
    direction TB
    
    class IScriptRuntime {
        <<interface>>
        +script: WodScript
        +eventBus: IEventBus
        +memory: IRuntimeMemory
        +stack: IRuntimeStack
        +jit: JitCompiler
        +clock: IRuntimeClock
        +tracker: RuntimeReporter
        +pushBlock(block, options)
        +popBlock(options)
        +handle(event)
        +isComplete()
    }
    
    class IRuntimeStack {
        <<interface>>
        +blocks: IRuntimeBlock[]
        +count: number
        +current: IRuntimeBlock
        +keys: BlockKey[]
        +push(block)
        +pop()
        +clear()
    }
    
    class IRuntimeBlock {
        <<interface>>
        +key: BlockKey
        +sourceIds: number[]
        +blockType: string
        +label: string
        +fragments: ICodeFragment[][]
        +context: IBlockContext
        +mount(runtime, options)
        +next(runtime, options)
        +unmount(runtime, options)
        +dispose(runtime)
        +getBehavior(type)
    }
    
    class IRuntimeMemory {
        <<interface>>
        +allocate(type, ownerId, value, visibility)
        +get(reference)
        +set(reference, value)
        +search(criteria)
        +release(reference)
        +setEventDispatcher(dispatcher)
        +subscribe(callback)
    }
    
    class IEventBus {
        <<interface>>
        +register(eventName, handler, ownerId, priority)
        +on(eventName, callback, ownerId)
        +unregisterById(handlerId)
        +unregisterByOwner(ownerId)
        +dispatch(event, runtime)
    }
    
    class IRuntimeClock {
        <<interface>>
        +now: Date
        +elapsed: number
        +isRunning: boolean
        +spans: TimeSpan[]
        +start()
        +stop()
    }
    
    IScriptRuntime --> IRuntimeStack
    IScriptRuntime --> IRuntimeMemory
    IScriptRuntime --> IEventBus
    IScriptRuntime --> IRuntimeClock
    IRuntimeStack --> IRuntimeBlock
```

### Block Lifecycle & Behavior Pattern

```mermaid
classDiagram
    direction LR
    
    class IRuntimeBlock {
        <<interface>>
        +mount(runtime, options)
        +next(runtime, options)
        +unmount(runtime, options)
        +dispose(runtime)
        +getBehavior(type)
    }
    
    class IRuntimeBehavior {
        <<interface>>
        +onPush(runtime, block, options)?
        +onNext(runtime, block, options)?
        +onPop(runtime, block, options)?
        +onDispose(runtime, block)?
        +onEvent(event, runtime, block)?
    }
    
    class IBlockContext {
        <<interface>>
        +ownerId: string
        +exerciseId: string
        +references: IMemoryReference[]
        +allocate(type, value, visibility)
        +get(type)
        +getAll(type)
        +release()
        +isReleased()
        +getOrCreateAnchor(anchorId)
    }
    
    class IRuntimeAction {
        <<interface>>
        +type: string
        +target: string
        +payload: unknown
        +do(runtime)
    }
    
    IRuntimeBlock --> IBlockContext
    IRuntimeBlock --> IRuntimeBehavior
    IRuntimeBehavior --> IRuntimeAction
```

### JIT Compilation Strategy Pattern

```mermaid
classDiagram
    direction TB
    
    class JitCompiler {
        -strategies: IRuntimeBlockStrategy[]
        -dialectRegistry: DialectRegistry
        +registerStrategy(strategy)
        +getDialectRegistry()
        +compile(nodes, runtime)
    }
    
    class IRuntimeBlockStrategy {
        <<interface>>
        +match(statements, runtime): boolean
        +compile(statements, runtime): IRuntimeBlock
    }
    
    class TimerStrategy {
        +match(statements, runtime)
        +compile(statements, runtime)
    }
    
    class RoundsStrategy {
        +match(statements, runtime)
        +compile(statements, runtime)
    }
    
    class GroupStrategy {
        +match(statements, runtime)
        +compile(statements, runtime)
    }
    
    class EffortStrategy {
        +match(statements, runtime)
        +compile(statements, runtime)
    }
    
    class IntervalStrategy {
        +match(statements, runtime)
        +compile(statements, runtime)
    }
    
    class TimeBoundRoundsStrategy {
        +match(statements, runtime)
        +compile(statements, runtime)
    }
    
    JitCompiler --> IRuntimeBlockStrategy
    IRuntimeBlockStrategy <|.. TimerStrategy
    IRuntimeBlockStrategy <|.. RoundsStrategy
    IRuntimeBlockStrategy <|.. GroupStrategy
    IRuntimeBlockStrategy <|.. EffortStrategy
    IRuntimeBlockStrategy <|.. IntervalStrategy
    IRuntimeBlockStrategy <|.. TimeBoundRoundsStrategy
```

### Memory Reference System

```mermaid
classDiagram
    direction TB
    
    class IMemoryReference {
        <<interface>>
        +id: string
        +ownerId: string
        +type: string
        +visibility: string
        +value(): unknown
        +subscriptions: IMemorySubscription[]
    }
    
    class TypedMemoryReference~T~ {
        -_memory: IRuntimeMemory
        -_subscriptions: IMemorySubscription[]
        +get(): T
        +set(value: T)
        +subscribe(callback, options)
        +unsubscribe(id)
        +hasSubscribers()
        +notifySubscribers(newVal, oldVal)
    }
    
    class IMemorySubscription~T~ {
        <<interface>>
        +id: string
        +callback: function
        +memoryId: string
        +createdAt: Date
    }
    
    class IAnchorValue {
        <<interface>>
        +searchCriteria: MemorySearchCriteria
    }
    
    IMemoryReference <|.. TypedMemoryReference
    TypedMemoryReference --> IMemorySubscription
    TypedMemoryReference --> IAnchorValue : stores
```

### Event System

```mermaid
classDiagram
    direction LR
    
    class IEvent {
        <<interface>>
        +name: string
        +timestamp: Date
        +data: unknown
    }
    
    class IEventHandler {
        <<interface>>
        +id: string
        +name: string
        +handler(event, runtime): IRuntimeAction[]
    }
    
    class IEventBus {
        <<interface>>
        +register(eventName, handler, ownerId, priority)
        +on(eventName, callback, ownerId)
        +dispatch(event, runtime)
        +unregisterById(handlerId)
        +unregisterByOwner(ownerId)
    }
    
    class EventBus {
        -handlersByEvent: Map
        -callbacksByEvent: Map
    }
    
    IEventBus <|.. EventBus
    IEventBus --> IEventHandler
    IEventHandler --> IEvent
```

### Parser & Script Model

```mermaid
classDiagram
    direction TB
    
    class IScript {
        <<interface>>
        +source: string
        +statements: ICodeStatement[]
        +errors: ParseError[]
        +getIds(ids): ICodeStatement[]
        +getId(id): ICodeStatement
        +getAt(index): ICodeStatement
    }
    
    class ICodeStatement {
        <<interface>>
        +id: number
        +parent: number
        +children: number[][]
        +fragments: ICodeFragment[]
        +isLeaf: boolean
        +meta: CodeMetadata
        +hints: Set~string~
    }
    
    class ICodeFragment {
        <<interface>>
        +image: string
        +value: unknown
        +type: string
        +fragmentType: FragmentType
        +collectionState: FragmentCollectionState
        +behavior: MetricBehavior
        +meta: CodeMetadata
    }
    
    class IDialect {
        <<interface>>
        +id: string
        +name: string
        +analyze(statement): DialectAnalysis
    }
    
    IScript --> ICodeStatement
    ICodeStatement --> ICodeFragment
    IDialect --> ICodeStatement
```

---

## Redundancy & Hygiene Report

### 1. Dead Code: Interfaces Defined but Never Implemented

| Interface          | Location                                     | Status                          | Recommendation                                   |
| ------------------ | -------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| `IValidationRule`  | ~~`src/parser/IValidationRule.ts`~~          | **✅ REMOVED**                  | ~~Remove or implement validation rules~~         |
| `IMetricCollector` | ~~`src/runtime/MetricCollector.ts`~~         | **✅ REMOVED**                  | ~~Complete migration to `IFragmentMetricCollector`~~ |
| `IRuntimeAdapter`  | `src/runtime-test-bench/types/interfaces.ts` | Test-bench only interface       | Consider removing if unused                      |

### 2. Redundant/Overlapping Interfaces

| Issue                                            | Interfaces                                                                                                        | Analysis                                                                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Duplicate ICodeStatement**                     | `src/core/models/CodeStatement.ts` <br> `src/core/types/core.ts`                                                  | Same interface defined in two locations. The `core/types/core.ts` version imports from models. **Consolidate to single source.** |
| **Duplicate IScript**                            | `src/parser/WodScript.ts` <br> `src/core/types/core.ts`                                                           | Re-exported from parser. **Keep single definition.**                                                                             |
| **~~Duplicate IScriptRuntime~~**                 | ~~`src/runtime/IScriptRuntime.ts` <br> `src/core/types/runtime.ts`~~                                              | **✅ CONSOLIDATED** - `core/types/runtime.ts` now re-exports from `src/runtime/`                                                 |
| **~~Duplicate IRuntimeBlock~~**                  | ~~`src/runtime/IRuntimeBlock.ts` <br> `src/core/types/runtime.ts`~~                                               | **✅ CONSOLIDATED** - `core/types/runtime.ts` now re-exports from `src/runtime/`                                                 |
| **~~Duplicate IRuntimeAction~~**                 | ~~`src/runtime/IRuntimeAction.ts` <br> `src/core/types/runtime.ts`~~                                              | **✅ CONSOLIDATED** - `core/types/runtime.ts` now re-exports from `src/runtime/`                                                 |
| **~~Duplicate IMemoryReference~~**               | ~~`src/runtime/IMemoryReference.ts` <br> `src/core/types/runtime.ts`~~                                            | **✅ CONSOLIDATED** - `core/types/runtime.ts` now re-exports from `src/runtime/`                                                 |
| **~~IBehavior vs IRuntimeBehavior~~**            | ~~`src/runtime/behaviors/IBehavior.ts` <br> `src/runtime/IRuntimeBehavior.ts`~~                                   | **✅ DOCUMENTED** - `IRuntimeBehavior` is canonical; `IBehavior` is deprecated                                                   |
| **~~IMetricCollector vs IFragmentMetricCollector~~** | ~~`src/runtime/MetricCollector.ts` <br> `src/runtime/FragmentMetricCollector.ts`~~                            | **✅ COMPLETED** - `IMetricCollector` removed, only `IFragmentMetricCollector` remains                                           |

### 3. Circular Dependencies

| Cycle | Components | Risk Level | Mitigation |
|-------|------------|------------|------------|
| **IScriptRuntime ↔ IRuntimeBlock** | `IScriptRuntime` references `IRuntimeBlock`; `IRuntimeBlock.mount/next/unmount` require `IScriptRuntime` | **Low** | Acceptable design - bidirectional communication pattern |
| **IRuntimeMemory ↔ TypedMemoryReference** | `TypedMemoryReference` holds `_memory: IRuntimeMemory`; `IRuntimeMemory.allocate` returns `TypedMemoryReference` | **Low** | Intentional - memory references need parent for get/set |
| **IEventBus ↔ IScriptRuntime** | `IEventBus.dispatch` requires `IScriptRuntime`; `IScriptRuntime.eventBus` is `IEventBus` | **Low** | Acceptable - runtime context needed for handlers |

### 4. Interface Hygiene Issues

| Issue                                 | Location                                | Severity | Status/Recommendation                            |
| ------------------------------------- | --------------------------------------- | -------- | ------------------------------------------------ |
| **~~Deprecated interface still in use~~** | ~~`IMetricCollector`~~              | ~~Medium~~ | **✅ COMPLETED** - Removed                       |
| **Large interface**                   | `IBlockContext` (8 methods)             | Low      | Consider splitting read vs write operations      |
| **Optional members in interface**     | `IRuntimeBehavior` (all hooks optional) | Low      | Acceptable - partial implementation pattern      |
| **~~Type duplication in core/types~~**| ~~Multiple runtime type re-exports~~    | ~~Medium~~ | **✅ COMPLETED** - Consolidated to re-exports    |

### 5. Completed Cleanups ✅

1. **✅ Consolidate Type Definitions**: `src/core/types/runtime.ts` now re-exports from `src/runtime/` as single source of truth
2. **✅ Complete Deprecation**: `IMetricCollector` and `MetricCollector` removed; only `IFragmentMetricCollector` remains
3. **✅ Remove IValidationRule**: Removed - no implementations existed
4. **✅ Document IBehavior vs IRuntimeBehavior**: `IRuntimeBehavior` is the canonical interface; `IBehavior` is deprecated with documentation

---

## Architectural Goal Summary

### High-Level Architecture

The WOD Wiki codebase implements a **JIT-compiled stack-based runtime** for executing workout scripts. The architecture follows several key patterns:

#### 1. **Stack-Based Execution Model**

`IScriptRuntime` acts as the **central orchestrator** that coordinates:
- `IRuntimeStack`: Manages a LIFO stack of `IRuntimeBlock` instances representing nested workout constructs
- `IRuntimeMemory`: Provides separate memory storage for state management and debugging
- `IEventBus`: Enables loose coupling between runtime components through event-driven communication

**Business Goal**: Enable hierarchical workout structures (rounds containing exercises, intervals with sub-routines) with clean lifecycle management.

#### 2. **Strategy Pattern for JIT Compilation**

`JitCompiler` uses `IRuntimeBlockStrategy` implementations to compile parsed statements into executable blocks:
- **Precedence-based matching**: Strategies are tried in order (TimeBoundRounds → Interval → Timer → Rounds → Group → Effort)
- **Dialect integration**: `IDialect` implementations provide semantic hints for strategy matching

**Business Goal**: Support multiple workout formats (AMRAP, EMOM, For Time, Tabata) through pluggable compilation strategies.

#### 3. **Composable Behavior Pattern**

`IRuntimeBlock` delegates lifecycle logic to `IRuntimeBehavior` instances:
- Behaviors handle specific concerns: timing (`TimerBehavior`), sound cues (`SoundBehavior`), loop coordination (`LoopCoordinatorBehavior`)
- Behaviors are injected during block construction by strategies

**Business Goal**: Enable reusable, testable behavior components that can be composed to create complex workout logic.

#### 4. **Command Pattern for State Mutations**

`IRuntimeAction` provides a consistent interface for runtime mutations:
- Actions are produced by event handlers and behaviors
- All mutations flow through `action.do(runtime)`

**Business Goal**: Centralized mutation handling for debugging, logging, and undo/redo capabilities.

#### 5. **Memory Separation for Debugging**

`IRuntimeMemory` and `IBlockContext` provide:
- Type-safe memory allocation via `TypedMemoryReference<T>`
- Ownership tracking via `ownerId` for automatic cleanup
- Subscription system for reactive UI updates

**Business Goal**: Enable debugging and state inspection independently of program execution flow.

### Interface Interaction Summary

```
Parser ──[IScript]──► JitCompiler ──[IRuntimeBlock]──► RuntimeStack
                           │                               │
                     [IDialect]                     [IRuntimeBehavior]
                           │                               │
                    [ICodeStatement]               [IRuntimeAction]
                           │                               │
                    [ICodeFragment]                  [IEventBus]
                                                          │
                                                    [IEventHandler]
```

### Key Design Decisions

1. **Constructor-Based Initialization**: Blocks initialize during construction, not when pushed to stack
2. **Consumer-Managed Disposal**: Consumers must call `dispose()` on popped blocks
3. **Event-Driven Communication**: Loose coupling via `IEventBus` rather than direct references
4. **Strategy + Behavior Composition**: Separation of compilation (strategy) from execution (behavior)
5. **Typed Memory References**: Generic `TypedMemoryReference<T>` for type-safe memory access
6. **IRuntimeBehavior as Canonical Pattern**: All behaviors implement `IRuntimeBehavior` for consistent lifecycle hooks

### Completed Cleanups (2025-12)

- ✅ Removed deprecated `IMetricCollector` - use `IFragmentMetricCollector` instead
- ✅ Removed unused `IValidationRule` interface
- ✅ Consolidated duplicate interface definitions in `core/types/runtime.ts` to re-export from `src/runtime/`
- ✅ Documented `IRuntimeBehavior` as the canonical behavior interface; deprecated `IBehavior`

### Future Considerations

- Consider removing `IBehavior` entirely after migration period
- Evaluate need for `IBlockContext` interface splitting (read vs write operations)
