# RuntimeBlock Architecture Diagrams

## Current Block Type Hierarchy

```mermaid
classDiagram
    class IRuntimeBlock {
        <<interface>>
        +blockKey: BlockKey
        +blockId: string
        +duration?: number
        +sources: JitStatement[]
        +enter(runtime): IRuntimeAction[]
        +next(runtime): IRuntimeAction[]
        +leave(runtime): IRuntimeAction[]
        +handle(runtime, event, system): IRuntimeAction[]
        +metrics(runtime): RuntimeMetric[]
    }
    
    class RuntimeBlock {
        <<abstract>>
        #onEnter(runtime): IRuntimeAction[]
        #onNext(runtime): IRuntimeAction[]
        #onLeave(runtime): IRuntimeAction[]
        #onBlockStart(runtime): IRuntimeAction[]
        #onBlockStop(runtime): IRuntimeAction[]
        +handlers: EventHandler[]
        -spanBuilder: ResultSpanBuilder
    }
    
    class IdleRuntimeBlock {
        +onEnter(): SetButtonAction[]
        +onNext(): PopBlockAction[]
        +onLeave(): IRuntimeAction[]
    }
    
    class DoneRuntimeBlock {
        +onEnter(): SetButtonAction[]
        +onNext(): PopBlockAction[]
        +onLeave(): IRuntimeAction[]
    }
    
    class RootBlock {
        +onEnter(): IRuntimeAction[]
        +onNext(): PushStatementAction[]
        +onLeave(): IRuntimeAction[]
    }
    
    class EffortBlock {
        +leaf: true
        +onEnter(): StartTimerAction, SetTimerStateAction
        +onNext(): PopBlockAction[]
        +onLeave(): StopTimerAction[]
        +handlers: CompleteHandler[]
    }
    
    class RepeatingBlock {
        -childIndex: number
        -roundIndex: number
        +onEnter(): IRuntimeAction[]
        +onNext(): PushStatementAction[]
        +onLeave(): StopTimerAction[]
        +handlers: CompleteHandler, LapHandler
    }
    
    class TimedGroupBlock {
        -childIndex: number
        -lastLap: string
        +onEnter(): StartTimerAction[]
        +onNext(): PushStatementAction[]
        +onLeave(): StopTimerAction[]
        +onBlockStart(): SetTimerStateAction
        +handlers: CompleteHandler, LapHandler
    }
    
    class TimerBlock {
        <<missing>>
        +leaf: true
        +onEnter(): StartTimerAction, SetTimerStateAction
        +onNext(): PopBlockAction[]
        +onLeave(): StopTimerAction[]
    }
    
    IRuntimeBlock <|-- RuntimeBlock
    RuntimeBlock <|-- IdleRuntimeBlock
    RuntimeBlock <|-- DoneRuntimeBlock
    RuntimeBlock <|-- RootBlock
    RuntimeBlock <|-- EffortBlock
    RuntimeBlock <|-- RepeatingBlock
    RuntimeBlock <|-- TimedGroupBlock
    RuntimeBlock <|-- TimerBlock
```

## Strategy Pattern Implementation

```mermaid
classDiagram
    class IRuntimeBlockStrategy {
        <<interface>>
        +canHandle(nodes, runtime): boolean
        +compile(nodes, runtime): IRuntimeBlock
    }
    
    class RuntimeJitStrategies {
        -strategies: IRuntimeBlockStrategy[]
        +addStrategy(strategy): void
        +compile(nodes, runtime): IRuntimeBlock
    }
    
    class BlockRootStrategy {
        +canHandle(): boolean "nodes[0].parent === undefined"
        +compile(): RootBlock
    }
    
    class GroupRepeatingStrategy {
        +canHandle(): boolean "rounds > 1 && children.length > 0"
        +compile(): RepeatingBlock
    }
    
    class BlockEffortStrategy {
        +canHandle(): boolean "effort || reps || duration, no children/rounds"
        +compile(): EffortBlock
    }
    
    class BlockCompoundStrategy {
        +canHandle(): boolean "no rounds, no children"
        +compile(): EffortBlock
    }
    
    class BlockTimerStrategy {
        <<missing>>
        +canHandle(): boolean "duration only, no effort/reps/children/rounds"
        +compile(): TimerBlock
    }
    
    class GroupCountdownStrategy {
        <<missing>>
        +canHandle(): boolean "duration && children.length > 0"
        +compile(): TimedGroupBlock
    }
    
    IRuntimeBlockStrategy <|-- BlockRootStrategy
    IRuntimeBlockStrategy <|-- GroupRepeatingStrategy
    IRuntimeBlockStrategy <|-- BlockEffortStrategy
    IRuntimeBlockStrategy <|-- BlockCompoundStrategy
    IRuntimeBlockStrategy <|-- BlockTimerStrategy
    IRuntimeBlockStrategy <|-- GroupCountdownStrategy
    
    RuntimeJitStrategies --> IRuntimeBlockStrategy : uses
```

## Timer State Management Flow

```mermaid
stateDiagram-v2
    [*] --> STOPPED: Initial State
    
    STOPPED --> RUNNING_COUNTUP: Start without duration
    STOPPED --> RUNNING_COUNTDOWN: Start with duration
    
    RUNNING_COUNTUP --> PAUSED: Pause Event
    RUNNING_COUNTDOWN --> PAUSED: Pause Event
    
    PAUSED --> RUNNING_COUNTUP: Resume (no duration)
    PAUSED --> RUNNING_COUNTDOWN: Resume (with duration)
    
    RUNNING_COUNTUP --> STOPPED: Stop/Complete Event
    RUNNING_COUNTDOWN --> STOPPED: Stop Event
    RUNNING_COUNTDOWN --> STOPPED: Duration Elapsed
    
    STOPPED --> [*]: Reset
    
    note right of RUNNING_COUNTDOWN
        TickHandler monitors duration
        Triggers CompleteEvent when
        remaining time <= 0
    end note
    
    note right of RUNNING_COUNTUP
        TickHandler ignores
        Runs indefinitely until
        manual completion
    end note
```

## Current Tick Handling Architecture

```mermaid
sequenceDiagram
    participant Timer as Timer Observable
    participant TH as TickHandler
    participant Runtime as TimerRuntime
    participant Block as Current Block
    participant UI as UI Components
    
    Timer->>TH: TickEvent (every interval)
    TH->>Runtime: Get current block
    Runtime->>TH: Current block
    TH->>Block: Check block.duration
    
    alt Block has duration
        TH->>Block: Get span builder
        Block->>TH: Current spans
        TH->>TH: Calculate elapsed time
        TH->>TH: Calculate remaining time
        
        alt Remaining <= 0
            TH->>Runtime: NotifyRuntimeAction(CompleteEvent)
            Runtime->>Block: Apply complete event
            Block->>UI: Stop timer, update state
        else Still time remaining
            TH->>TH: Continue timing
        end
    else No duration
        TH->>TH: Return empty actions (countup)
    end
```

## Missing Strategy Decision Tree

```mermaid
flowchart TD
    A[JitStatement Analysis] --> B{Has duration?}
    B -->|No| C{Has effort/reps?}
    B -->|Yes| D{Has children?}
    
    C -->|Yes| E[BlockEffortStrategy → EffortBlock]
    C -->|No| F[BlockCompoundStrategy → EffortBlock]
    
    D -->|No| G{Has effort/reps?}
    D -->|Yes| H{Has rounds?}
    
    G -->|Yes| I[BlockEffortStrategy → EffortBlock]
    G -->|No| J[🔴 MISSING: BlockTimerStrategy → TimerBlock]
    
    H -->|Yes| K[🔴 MISSING: GroupCountdownStrategy → TimedGroupBlock]
    H -->|No| L[🔴 MISSING: GroupCountdownStrategy → TimedGroupBlock]
    
    style J fill:#ffcccc
    style K fill:#ffcccc
    style L fill:#ffcccc
```

## Proposed Timer Handler Refactoring

```mermaid
classDiagram
    class TimerManager {
        -primaryTimer: TimerContext
        -secondaryTimer?: TimerContext
        +handleTick(event): IRuntimeAction[]
        +setPrimary(context): void
        +setSecondary(context): void
        +clearTimers(): void
    }
    
    class TimerContext {
        +state: TimerState
        +duration?: number
        +startTime: Date
        +blockKey: BlockKey
        +type: "primary" | "secondary"
    }
    
    class CountdownTickHandler {
        +handleTick(context): IRuntimeAction[]
        -checkCompletion(context): boolean
    }
    
    class CountupTickHandler {
        +handleTick(context): IRuntimeAction[]
    }
    
    class GroupTickHandler {
        +handleTick(context): IRuntimeAction[]
        -handleIntervals(context): IRuntimeAction[]
    }
    
    TimerManager --> TimerContext
    TimerManager --> CountdownTickHandler
    TimerManager --> CountupTickHandler
    TimerManager --> GroupTickHandler
```
