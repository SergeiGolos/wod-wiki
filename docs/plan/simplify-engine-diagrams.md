# Architecture Diagrams: Current vs Proposed

This document provides visual representations of both architectures for easy comparison.

---

## Proposed Architecture (From Canvas)

The canvas diagram represents a streamlined runtime engine with the following structure:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRACKER SCREEN                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │   Results   │  │   History   │  │    Clock    │                          │
│  │    Panel    │  │    Panel    │  │    Panel    │                          │
│  └──────▲──────┘  └──────▲──────┘  └──────▲──────┘                          │
│         │ reads          │ subscribes     │ subscribes                      │
└─────────┼────────────────┼────────────────┼─────────────────────────────────┘
          │                │                │
┌─────────┼────────────────┼────────────────┼─────────────────────────────────┐
│         │                │                │         RUNTIME CORE            │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐                          │
│  │   Tracker   │  │    Stack    │  │   Memory    │                          │
│  │             │  │             │  │             │                          │
│  │  - Spans    │  │  - Blocks   │  │ - block-id  │                          │
│  │  - Metrics  │  │  - Depth    │  │ - modifier  │                          │
│  └──────▲──────┘  └──────┬──────┘  │ - type      │                          │
│         │                │         │ - data      │                          │
│         │                ▼         └──────▲──────┘                          │
│         │         ┌─────────────┐         │                                  │
│         │         │   Block     │         │                                  │
│         │         │  Functions  │◄────────┤                                  │
│         │         │             │         │                                  │
│         │         │ • push      │         │                                  │
│         │         │ • pop       │         │                                  │
│         │         │ • next      │         │                                  │
│         │         └──────┬──────┘         │                                  │
│         │                │ Run            │                                  │
│         │                ▼                │                                  │
│  ┌──────┼─────────────────────────────────┼──────┐                          │
│  │      │         ┌─────────────┐         │      │                          │
│  │      │         │ Fn IBehavior│─────────┘      │                          │
│  │      │         │             │ Read/Write     │                          │
│  │      │         └──────┬──────┘  State         │                          │
│  │      │                │                       │                          │
│  └──────┼────────────────┼───────────────────────┘                          │
│         │                │                                                   │
│         │                ▼                                                   │
│  ┌──────┴────────────────────────────────────────┐                          │
│  │           RuntimeAction[]                      │                          │
│  │                                                │                          │
│  │  • Start Timer      • PlaySoundAction          │                          │
│  │  • Stop Timer       • ErrorAction              │                          │
│  │  • Track            • UnregisterEventHandler   │                          │
│  │  • Display          • RegisterEventHandler     │                          │
│  │                     • RegisterAction           │                          │
│  │                     • UnregisterAction         │                          │
│  └───────────────────────┬───────────────────────┘                          │
│                          │ Register                                          │
│                          ▼                                                   │
│  ┌───────────────────────────────────────────────┐                          │
│  │           Event Handlers                       │                          │
│  │                                                │◄─────┐                   │
│  │  • Start Timer                                 │      │                   │
│  │  • Stop Timer                                  │──────┘ Triggers          │
│  │                                                │                          │
│  └───────────────────────▲───────────────────────┘                          │
│                          │                                                   │
└──────────────────────────┼──────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────────────┐
│                          │              EVENTS                               │
│  ┌─────────────┐  ┌──────┴──────┐                                           │
│  │ User Event  │  │ Tick Event  │                                           │
│  └─────────────┘  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Current Architecture

The current implementation has significantly more components and interconnections:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UI LAYER                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ useExecution │  │ useDisplay   │  │ useRuntime   │  │ useActions   │     │
│  │    Spans     │  │    Stack     │  │    Clock     │  │    Stack     │     │
│  └──────▲───────┘  └──────▲───────┘  └──────▲───────┘  └──────▲───────┘     │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │ subscribes      │ subscribes      │ subscribes      │ subscribes
┌─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┐
│         │                 │                 │                 │             │
│  ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐     │
│  │ Execution   │   │ DISPLAY_    │   │  Runtime    │   │ ACTION_     │     │
│  │  Tracker    │   │ STACK_STATE │   │   Clock     │   │ STACK_STATE │     │
│  │             │   │             │   │             │   │             │     │
│  │ Commands:   │   │ timerStack  │   │ Unified     │   │ layers[]    │     │
│  │ TrackSpan   │   │ cardStack   │   │ monotonic   │   │ visible[]   │     │
│  │ TrackSection│   │ workoutState│   │ tick source │   │             │     │
│  │ TrackEvent  │   │ roundsDisplay│  │             │   │             │     │
│  └──────▲──────┘   └──────▲──────┘   └─────────────┘   └──────▲──────┘     │
│         │                 │                                    │             │
│         │                 │         RUNTIME MEMORY             │             │
│  ┌──────┴─────────────────┴────────────────────────────────────┴──────┐     │
│  │  RuntimeMemory (TypedMemoryReference<T>)                           │     │
│  │  - allocate<T>(type, ownerId, initialValue, visibility)           │     │
│  │  - get<T>(reference) / set<T>(reference, value)                   │     │
│  │  - search(criteria: Nullable<IMemoryReference>)                   │     │
│  │  - subscribe(callback) / release(reference)                        │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      ScriptRuntime                                  │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │     │
│  │  │  WodScript  │  │ JitCompiler │  │  EventBus   │                 │     │
│  │  │             │  │             │  │             │                 │     │
│  │  │ statements  │  │ strategies: │  │ handlers:   │                 │     │
│  │  │ fragments   │  │ - Effort    │  │ - register  │                 │     │
│  │  │             │  │ - Timer     │  │ - dispatch  │                 │     │
│  │  │             │  │ - Rounds    │  │ - unregister│                 │     │
│  │  │             │  │ - AMRAP     │  │             │                 │     │
│  │  │             │  │ - EMOM      │  │             │                 │     │
│  │  │             │  │ - Group     │  │             │                 │     │
│  │  └─────────────┘  │ - Interval  │  └──────▲──────┘                 │     │
│  │                   └──────┬──────┘         │                         │     │
│  │                          │                │                         │     │
│  │                          ▼                │                         │     │
│  │  ┌─────────────────────────────────────────────────────────────┐   │     │
│  │  │  RuntimeStack / MemoryAwareRuntimeStack / DebugRuntimeStack │   │     │
│  │  │                                                              │   │     │
│  │  │  Options:                         Hooks:                     │   │     │
│  │  │  - tracker                        - onBeforePush             │   │     │
│  │  │  - wrapper                        - onAfterPush              │   │     │
│  │  │  - logger                         - onBeforePop              │   │     │
│  │  │  - hooks                          - onAfterPop               │   │     │
│  │  │  - debugMode                      - unregisterByOwner        │   │     │
│  │  │  - blockWrapperFactory                                       │   │     │
│  │  └───────────────────────┬─────────────────────────────────────┘   │     │
│  │                          │                                          │     │
│  │                          ▼                                          │     │
│  │  ┌─────────────────────────────────────────────────────────────┐   │     │
│  │  │  IRuntimeBlock (RuntimeBlock, TimerBlock, RoundsBlock, etc) │   │     │
│  │  │                                                              │   │     │
│  │  │  Lifecycle:              Context:                            │   │     │
│  │  │  - mount()               - IBlockContext                     │   │     │
│  │  │  - next()                - BlockKey                          │   │     │
│  │  │  - unmount()             - sourceIds[]                       │   │     │
│  │  │  - dispose()             - fragments[][]                     │   │     │
│  │  │                                                              │   │     │
│  │  │  Behaviors (composed):                                       │   │     │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │     │
│  │  │  │ Timer   │ │ Loop    │ │Complete │ │ History │            │   │     │
│  │  │  │Behavior │ │Coordin. │ │Behavior │ │Behavior │            │   │     │
│  │  │  │ 484 LOC │ │ 525 LOC │ │         │ │         │            │   │     │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │   │     │
│  │  │       │           │           │           │                  │   │     │
│  │  │       └───────────┴───────────┴───────────┘                  │   │     │
│  │  │                           │                                   │   │     │
│  │  └───────────────────────────┼───────────────────────────────────┘   │     │
│  │                              │                                        │     │
│  └──────────────────────────────┼────────────────────────────────────────┘     │
│                                 ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │                        IRuntimeAction[]                                 │   │
│  │                                                                         │   │
│  │  Timer Actions:           Display Actions:        Segment Actions:      │   │
│  │  - StartTimerAction       - PushTimerDisplay      - StartSegmentAction  │   │
│  │  - StopTimerAction        - PopTimerDisplay       - EndSegmentAction    │   │
│  │                           - UpdateTimerDisplay    - RecordMetricAction  │   │
│  │                           - PushCardDisplay       - RecordRoundAction   │   │
│  │                           - PopCardDisplay        - EmitMetricAction    │   │
│  │                           - UpdateCardDisplay                           │   │
│  │                                                                         │   │
│  │  Handler Actions:         Stack Actions:          State Actions:        │   │
│  │  - RegisterEventHandler   - PushStackItem         - SetWorkoutState     │   │
│  │  - UnregisterEventHandler - PopStackItem          - SetRoundsDisplay    │   │
│  │                           - PushActionsAction     - ResetDisplayStack   │   │
│  │                           - PopActionsAction                            │   │
│  │                                                                         │   │
│  │  Other Actions:                                                         │   │
│  │  - EmitEventAction        - PlaySoundAction       - ErrorAction         │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Differences Visualized

### Component Reduction

```
Current                              Proposed
═══════                              ════════

Stack Variants: 3                    Stack: 1
├─ RuntimeStack                      └─ Stack
├─ MemoryAwareRuntimeStack
└─ DebugRuntimeStack

Behaviors: 11                        Behaviors: ~1
├─ TimerBehavior (484 LOC)           └─ IBehavior (functional)
├─ LoopCoordinatorBehavior (525 LOC)
├─ RootLifecycleBehavior (339 LOC)
├─ CompletionBehavior
├─ HistoryBehavior
├─ SoundBehavior
├─ IdleBehavior
├─ ActionLayerBehavior
├─ PrimaryClockBehavior
├─ RuntimeControlsBehavior
└─ TimerStateManager

Actions: 15+                         Actions: 10
├─ StartTimerAction                  ├─ Start Timer
├─ StopTimerAction                   ├─ Stop Timer
├─ PushTimerDisplayAction            ├─ Track
├─ PopTimerDisplayAction             ├─ Display
├─ UpdateTimerDisplayAction          ├─ PlaySoundAction
├─ PushCardDisplayAction             ├─ ErrorAction
├─ PopCardDisplayAction              ├─ UnregisterEventHandler
├─ UpdateCardDisplayAction           ├─ RegisterEventHandler
├─ StartSegmentAction                ├─ RegisterAction
├─ EndSegmentAction                  └─ UnregisterAction
├─ RecordMetricAction
├─ EmitMetricAction
├─ RegisterEventHandlerAction
├─ UnregisterEventHandlerAction
├─ SetWorkoutStateAction
├─ SetRoundsDisplayAction
├─ PlaySoundAction
├─ ErrorAction
└─ ...more
```

### Data Flow Simplification

```
Current Flow (Multiple Paths)        Proposed Flow (Single Path)
═════════════════════════════        ═══════════════════════════

Event                                Event
  │                                    │
  ▼                                    ▼
EventBus.dispatch()                  Event Handlers
  │                                    │
  ▼                                    ▼
Priority-sorted handlers             RuntimeAction[]
  │                                    │
  ├─▶ Timer handlers                   ├─▶ Stack
  ├─▶ Display handlers                 ├─▶ Tracker
  ├─▶ Segment handlers                 └─▶ Memory
  └─▶ Custom handlers
  │
  ▼
Action collection
  │
  ├─▶ Stack mutations
  ├─▶ Memory mutations
  ├─▶ Tracker mutations
  └─▶ EventBus mutations
```

---

## Migration Path Visualization

```
Phase 1: Analysis            Phase 2: Consolidate       Phase 3: Simplify
════════════════════        ═══════════════════════    ══════════════════

┌─────────────────┐         ┌─────────────────┐        ┌─────────────────┐
│ 3 Stack Types   │   →     │ 1 RuntimeStack  │   →    │     Stack       │
└─────────────────┘         └─────────────────┘        └─────────────────┘

┌─────────────────┐         ┌─────────────────┐        ┌─────────────────┐
│ 11 Behaviors    │   →     │ 5-6 Behaviors   │   →    │   IBehavior     │
└─────────────────┘         └─────────────────┘        └─────────────────┘

┌─────────────────┐         ┌─────────────────┐        ┌─────────────────┐
│ 15+ Actions     │   →     │ 10-12 Actions   │   →    │   10 Actions    │
└─────────────────┘         └─────────────────┘        └─────────────────┘

┌─────────────────┐         ┌─────────────────┐        ┌─────────────────┐
│ Complex Memory  │   →     │ Typed Memory    │   →    │ Simple Memory   │
│ + Search        │         │ (reduced types) │        │ (key-value)     │
└─────────────────┘         └─────────────────┘        └─────────────────┘
```

---

*Document generated: December 2024*
*Reference: [simplify-engine.md](./simplify-engine.md)*
