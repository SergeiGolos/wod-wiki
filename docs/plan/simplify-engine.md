# Runtime Engine Simplification Plan

## Executive Summary

This document provides a comprehensive comparison between the **proposed simplified architecture** (represented in the Runtime Cycle canvas diagram) and the **current runtime implementation**. The goal is to identify opportunities to reduce complexity while maintaining the essential functionality of the WOD workout execution engine.

The current runtime has grown to include numerous abstractions, strategies, and behavioral compositions that create a steep learning curve and maintenance burden. The proposed diagram suggests a more streamlined architecture with clearer data flows and fewer moving parts.

---

## Table of Contents

1. [Canvas Diagram Interpretation](#canvas-diagram-interpretation)
2. [Current Architecture Overview](#current-architecture-overview)
3. [Side-by-Side Comparison](#side-by-side-comparison)
4. [Data Flow Comparison](#data-flow-comparison)
5. [Complexity Analysis](#complexity-analysis)
6. [Migration Strategy](#migration-strategy)
7. [Appendices](#appendices)

---

## Canvas Diagram Interpretation

The Runtime Cycle canvas proposes a simplified architecture with these core components:

### Core Components (Proposed)

| Component | Description |
|-----------|-------------|
| **Stack** | Central execution stack for runtime blocks |
| **Tracker** | Records execution results and history |
| **Block Functions** | Simple operations: `push`, `pop`, `next` composed from `IBehaviors` |
| **IBehavior (Fn)** | Single functional behavior interface |
| **Memory** | State storage with: `block-id`, `access-modifier`, `type`, `data` |
| **RuntimeAction[]** | Unified action list for side effects |
| **Event Handlers** | Simple event routing (Start Timer, Stop Timer) |
| **Events** | User Event and Tick Event inputs |

### UI Components (Proposed)

| Component          | Description                |
| ------------------ | -------------------------- |
| **Tracker Screen** | Main UI container          |
| **Results**        | Displays execution results |
| **History Panel**  | Shows execution history    |
| **Clock Panel**    | Displays timer/clock state |

### Data Flow (Proposed)

```
Events (User/Tick) → Event Handlers → RuntimeAction[] ↔ Memory
                                              ↓
                             Stack ← Block Functions ← IBehavior
                                              ↓
                             Tracker → Results/History Panel
                             Memory → Clock Panel (display subscribe)
```

---

## Current Architecture Overview

### Current Component Count

| Category | Component Count | Files |
|----------|-----------------|-------|
| Actions | 15+ types | `src/runtime/actions/` |
| Behaviors | 11 types | `src/runtime/behaviors/` |
| Strategies | 7 types | `src/runtime/strategies/` |
| Block Types | 4 specialized | `src/runtime/blocks/` |
| Core Interfaces | 15+ | `src/runtime/I*.ts` |
| Stack Variants | 3 | `RuntimeStack`, `MemoryAwareRuntimeStack`, `DebugRuntimeStack` |
| Memory Types | Multiple | `MemoryTypeEnum.ts` enums |

### Current Core Components

```
ScriptRuntime
├── WodScript (parsed source)
├── JitCompiler (strategy-based compilation)
├── RuntimeStack / MemoryAwareRuntimeStack / DebugRuntimeStack
├── RuntimeMemory (typed references with visibility)
├── ExecutionTracker (spans, segments, metrics)
├── EventBus (priority-based handlers)
├── RuntimeClock (unified time source)
├── MetricCollector (aggregation)
└── FragmentCompilationManager (fragment compilers)
```

### Current Behavior Composition (Example: Timer Block)

```typescript
// Current: Timer Block requires 5 behaviors
TimerBlock {
  behaviors: [
    TimerBehavior,           // 484 lines
    HistoryBehavior,         // Execution tracking
    SoundBehavior,           // Audio cues
    LoopCoordinatorBehavior, // 525 lines (if has children)
    CompletionBehavior       // Completion detection
  ]
}
```

### Current Data Flow

```
User Input → EventBus.dispatch → IEventHandler[] → IRuntimeAction[]
                                       ↓
              RuntimeStack.push/pop/next → IRuntimeBlock.mount/next/unmount
                                       ↓
              IRuntimeBehavior[].onPush/onNext/onPop → IRuntimeAction[]
                                       ↓
              IRuntimeAction.do(runtime) → Mutates:
                - RuntimeMemory (multiple typed stores)
                - ExecutionTracker (spans/segments/metrics)
                - EventBus (handler registration)
                - RuntimeClock (timer state)
```

---

## Side-by-Side Comparison

### Stack Management

| Aspect               | Proposed              | Current                                                                    |
| -------------------- | --------------------- | -------------------------------------------------------------------------- |
| Stack Implementation | Single `Stack`        | 3 variants: `RuntimeStack`, `MemoryAwareRuntimeStack`, `DebugRuntimeStack` |
| Block Operations     | `push`, `pop`, `next` | Same + lifecycle hooks, wrappers, trackers, loggers                        |
| Block Wrapping       | None                  | `TestableBlock` wrapper for debugging                                      |
| Depth Tracking       | Implicit              | Explicit `MAX_STACK_DEPTH = 10`                                            |

### Memory Model

| Aspect           | Proposed                                  | Current                                                                    |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| Structure        | `{block-id, access-modifier, type, data}` | `TypedMemoryReference<T>` with `ownerId`, `type`, `visibility`             |
| Access Modifiers | `access-modifier` field                   | `'public' \| 'private' \| 'inherited'` visibility                          |
| Subscription     | Not shown                                 | Global + per-reference subscribers                                         |
| Search           | Not shown                                 | `search(criteria: Nullable<IMemoryReference>)`                             |
| Typed Stores     | Single unified                            | Multiple: `DISPLAY_STACK_STATE`, `ACTION_STACK_STATE`, `TIMER_SPANS`, etc. |

### Behaviors

| Aspect | Proposed | Current |
|--------|----------|---------|
| Interface | Single `IBehavior` | `IRuntimeBehavior` with 5 hooks |
| Composition | `Block Functions ← IBehavior` | Complex composition per block type |
| Count | Implied few | 11 behavior types, some 400-500 lines each |
| Lifecycle Hooks | Implied simple | `onPush`, `onNext`, `onPop`, `onDispose`, `onEvent` |

### Actions

| Aspect | Proposed | Current |
|--------|----------|---------|
| Types Listed | 10 action types | 15+ action types with nesting |
| Timer Actions | `Start Timer`, `Stop Timer` | `StartTimerAction`, `StopTimerAction` + push/pop/update display variants |
| Display Actions | `Display` | `PushTimerDisplayAction`, `PopTimerDisplayAction`, `UpdateTimerDisplayAction`, `PushCardDisplayAction`, `PopCardDisplayAction`, etc. |
| Registration | `RegisterAction`, `UnregisterAction` | `RegisterEventHandlerAction`, `UnregisterEventHandlerAction` + segment actions |

### Event Handling

| Aspect | Proposed | Current |
|--------|----------|---------|
| Event Types | `User Event`, `Tick Event` | `IEvent` with name, timestamp, data |
| Handler Registration | Simple | Priority-based with owner tracking |
| Dispatch | Implicit | `EventBus.dispatch()` with action aggregation |
| Cleanup | Not shown | `unregisterByOwner()` on block pop |

### UI Integration

| Aspect | Proposed | Current |
|--------|----------|---------|
| Tracker | Direct reads from Results | `ExecutionTracker` with Command Pattern |
| History | Subscribes to Tracker | Multiple hooks + memory subscriptions |
| Clock | Subscribes to Stack/Memory | Complex display stack with priorities |
| Display State | Simple | `IDisplayStackState` with timer/card stacks |

---

## Data Flow Comparison

### Proposed Data Flow (Simplified)

```mermaid
graph TD
    subgraph Events
        UE[User Event]
        TE[Tick Event]
    end

    subgraph Core
        EH[Event Handlers]
        RA[RuntimeAction[]]
        MEM[Memory]
        STK[Stack]
        BF[Block Functions]
        BH[IBehavior]
    end

    subgraph UI
        TS[Tracker Screen]
        TRK[Tracker]
        RES[Results]
        HP[History Panel]
        CP[Clock Panel]
    end

    UE --> EH
    TE --> EH
    EH --> RA
    RA --> STK
    RA --> TRK
    RA --> MEM
    EH --> MEM
    STK --> BF
    BF --> BH
    BH --> MEM
    BH --> RA
    MEM --> CP
    STK --> CP
    TRK --> RES
    TRK --> HP
    TS --> UE
```

### Current Data Flow (Complex)

```mermaid
graph TD
    subgraph Input
        UI[User Input]
        CLK[RuntimeClock Tick]
    end

    subgraph EventSystem
        EB[EventBus]
        IEH[IEventHandler[]]
    end

    subgraph BlockSystem
        STK[RuntimeStack]
        RB[IRuntimeBlock]
        BEH[IRuntimeBehavior[]]
    end

    subgraph ActionSystem
        ACT[IRuntimeAction[]]
        TA[Timer Actions]
        DA[Display Actions]
        SA[Segment Actions]
        HA[Handler Actions]
    end

    subgraph StateStores
        MEM[RuntimeMemory]
        DSS[DISPLAY_STACK_STATE]
        ASS[ACTION_STACK_STATE]
        TS[TIMER_SPANS]
    end

    subgraph TrackerSystem
        ET[ExecutionTracker]
        CMD[ITrackerCommand]
        SPAN[ExecutionSpan]
    end

    subgraph UIHooks
        UES[useExecutionSpans]
        UDS[useDisplayStack]
        URC[useRuntimeClock]
    end

    UI --> EB
    CLK --> EB
    EB --> IEH
    IEH --> ACT
    ACT --> STK
    STK --> RB
    RB --> BEH
    BEH --> ACT
    ACT --> TA
    ACT --> DA
    ACT --> SA
    ACT --> HA
    TA --> MEM
    DA --> DSS
    SA --> ET
    HA --> EB
    MEM --> TS
    ET --> CMD
    CMD --> SPAN
    DSS --> UDS
    MEM --> UES
    ET --> UES
```

---

## Complexity Analysis

### Lines of Code Comparison

| Component | Current LOC | Proposed (Estimated) |
|-----------|-------------|----------------------|
| RuntimeStack (all variants) | ~800 | ~150 |
| Behaviors (all) | ~2500 | ~300 |
| Actions (all) | ~1200 | ~400 |
| Event handling | ~200 | ~100 |
| Memory system | ~150 | ~80 |
| **Total Core Runtime** | **~4850** | **~1030** |

### Cognitive Load

| Metric | Current | Proposed |
|--------|---------|----------|
| Interfaces to understand | 15+ | 5-6 |
| Behavior combinations | Complex matrix | Simple composition |
| Stack variants | 3 (choose correct one) | 1 |
| Action types to memorize | 15+ | 10 |
| Data flow paths | Multiple branching | Single linear flow |

### Maintenance Burden

| Issue | Current Impact | Proposed Impact |
|-------|----------------|-----------------|
| Adding new block type | Create strategy + compose 5 behaviors | Implement IBehavior |
| Debugging execution | Trace through multiple layers | Single stack trace |
| Understanding timer flow | 484-line TimerBehavior + DisplayActions | Timer handler + simple action |
| Memory management | TypedReference + visibility + search | Simple key-value |

---

## Migration Strategy

### Phase 1: Analysis (Current)

- [x] Document proposed architecture from canvas
- [x] Document current architecture
- [x] Create comparison matrix
- [x] Identify complexity hotspots

### Phase 2: Interface Consolidation

1. **Unify Stack Variants**
   - Merge `RuntimeStack`, `MemoryAwareRuntimeStack`, `DebugRuntimeStack`
   - Use composition over inheritance for debug features
   - Target: Single `RuntimeStack` class

2. **Simplify Memory Model**
   - Reduce typed stores to essential types
   - Simplify visibility to `public` | `private`
   - Remove complex search patterns where possible

### Phase 3: Behavior Simplification

1. **Flatten Behavior Hierarchy**
   - Merge `LoopCoordinatorBehavior` into block logic
   - Combine `CompletionBehavior` into lifecycle
   - Simplify `TimerBehavior` to core operations

2. **Reduce Action Types**
   - Consolidate display actions (`Push/Pop/Update` → unified)
   - Merge segment tracking into tracker API
   - Simplify event handler actions

### Phase 4: Event Flow Streamlining

1. **Simplify EventBus**
   - Remove priority system if unused
   - Simplify owner tracking
   - Direct handler invocation

2. **Unify Tracker**
   - Remove Command Pattern overhead
   - Direct span/metric recording
   - Simplified history access

### Phase 5: UI Integration

1. **Simplify Display State**
   - Single display stack vs. timer/card split
   - Direct subscription model
   - Reduced intermediary transforms

---

## Appendices

### A. Files to Modify (High-Priority)

| File | Action | Complexity |
|------|--------|------------|
| `RuntimeStack.ts` | Major refactor - merge variants | High |
| `ScriptRuntime.ts` | Simplify initialization | Medium |
| `behaviors/TimerBehavior.ts` | Reduce to core | High |
| `behaviors/LoopCoordinatorBehavior.ts` | Flatten or merge | High |
| `actions/*.ts` | Consolidate | Medium |
| `EventBus.ts` | Simplify | Low |

### B. Supporting Documents

- [Current vs Proposed Architecture Diagram](./simplify-engine-diagrams.md)
- [Action Consolidation Map](./simplify-engine-actions.md)
- [Behavior Simplification Details](./simplify-engine-behaviors.md)

### C. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing workouts | Comprehensive test coverage before refactor |
| UI disruption | Maintain same hook contracts initially |
| Performance regression | Benchmark before/after |
| Lost debugging capability | Preserve TestableBlock as optional wrapper |

---

## Next Steps

1. Review this plan with stakeholders
2. Create branch for Phase 2 work
3. Write migration tests for current behavior
4. Begin interface consolidation
5. Iterate on behavior simplification

---

*Document generated: December 2024*
*Reference: Runtime Cycle.canvas*
