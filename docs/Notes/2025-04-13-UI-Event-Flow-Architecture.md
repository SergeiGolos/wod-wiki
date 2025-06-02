# UI Event Flow Architecture in wod.wiki

This document outlines how events shape the flow of data in the wod.wiki application, including the key components, event handling mechanisms, and data structures.

## Application Components Overview

The wod.wiki UI application is built around an event-driven architecture with several key components:

1. **EditorContainer**: The main container component that orchestrates the UI
2. **WodWiki**: The custom Monaco-based editor for writing workout scripts
3. **TimerRuntime**: The core engine that processes events and manages the workout execution
4. **RunnerControls**: UI controls for starting, stopping, and resetting workouts
5. **ResultsDisplay**: Component for displaying workout results and metrics

## Event Flow Diagram

![[Event-Flow-Diagram.excalidraw]]

## Key Event Types

The application handles several types of events that flow through the system:

![[Key-Event-Types.excalidraw]]

## Event Lifecycle

### 1. User Input Events

When a user interacts with the application, events are generated:

![[User-Input-Events.excalidraw]]

### 2. Timer Events Processing

The TimerRuntime component processes events through a sophisticated event handling flow:

#### Event Reception and Processing Flow

1. **Event Reception Layer**
   - All events first enter the `TimerRuntime.eventQueue`
   - Events are tagged with priority levels (UI events vs. internal timer events)
   - Queue ensures proper sequencing of asynchronous events

2. **Event Dispatcher**
   - The `EventDispatcher` polls the queue and routes events to appropriate handlers
   - Maintains event history for debugging and analytics
   - Can filter or transform events based on current runtime state

3. **Block-Level Processors**
   - Each `IRuntimeBlock` instance receives relevant events
   - Blocks implement the `onEvent(event, runtime)` method
   - Returns arrays of `IRuntimeAction` objects to be executed

4. **Action Execution**
   - Actions are collected from all blocks and prioritized
   - UI update actions take precedence over internal state changes
   - Actions may generate new events (feedback loop)

#### Key Event Processing Strategies

- **Immediate Processing**: UI events (Start, Stop, Pause) trigger immediate state transitions
- **Deferred Processing**: Timer tick events may accumulate before triggering UI updates
- **Batch Processing**: Related events can be processed as a group for efficiency

#### Runtime Component Interactions

- **TimerManager**: Generates tick events at precise intervals
- **RuntimeJit**: Compiles and optimizes event handlers for workout blocks
- **EventLogger**: Records event flow for performance analysis and debugging


### 3. Data Structure Transformations

The transformation of workout scripts into executable runtime blocks follows a compilation-like process:

![[Timer-Events-Processing.excalidraw]]
#### Transformation Pipeline

1. **Text Input**
   - Raw text from the editor with specialized syntax (`:20`, `21-15-9`, `Pullups`, etc.)
   - Contains timing information, repetition counts, and exercise names

2. **Lexical Analysis**
   - Text is tokenized into meaningful elements:
     - Timer tokens (`:20`, `1:30`)
     - Number tokens (`21`, `95`)
     - Distance tokens (`25m`, `5km`)
     - Weight tokens (`95lb`, `50kg`)
     - Round notation (`(21-15-9)`, `(5)`)
     - Exercise identifiers (`Pullups`, `Thursters`)

3. **Syntactic Parsing**
   - Tokens are organized into a hierarchical Abstract Syntax Tree (AST)
   - Statements and expressions are identified
   - Structure is validated for correctness

4. **Semantic Analysis**
   - AST is validated for logical workout correctness
   - Type checking ensures valid combinations (e.g., reps with exercises)
   - Contextual information is added to nodes

5. **Intermediate Representation**
   - AST is transformed into `WodRuntimeScript` with `StatementNode` objects
   - Script contains all the structured data needed for execution

6. **Runtime Compilation**
   - `RuntimeJit` processes the `WodRuntimeScript`
   - Creates specialized `IRuntimeBlock` instances
   - Blocks are linked together in execution sequence

7. **Final Executable Blocks**
   - Each `IRuntimeBlock` contains:
     - Logic to handle events via `onEvent` method
     - Mechanism to produce `RuntimeAction` objects
     - Collection of past events and metrics
![[Data-Structure-Transformations.excalidraw]]

## Key Data Structures

1. **RuntimeEvent**: Events that flow through the system
   ```typescript
   { name: string, timestamp: Date }
   ```

2. **WodRuntimeScript**: Compiled workout script
   ```typescript
   { source: string, statements: StatementNode[] }
   ```

3. **IRuntimeBlock**: Execution blocks that process events
   ```typescript
   {
     type: string,
     blockId: number,
     events: RuntimeEvent[],
     onEvent(event, runtime): IRuntimeAction[]
   }
   ```

4. **RuntimeMetric**: Workout measurements
   ```typescript
   {
     effort: string,
     sourceId: string,
     values: MetricValue[]
   }
   ```

5. **ResultSpan**: Results of workout execution
   ```typescript
   {
     blockKey: string,
     start: RuntimeEvent,
     stop: RuntimeEvent,
     metrics: RuntimeMetric[]
   }
   ```

## Event State Transitions

The TimerRuntime system moves through distinct states based on events it receives, with each state transition triggering specific UI updates:

### Core Runtime States
1. **Idle** (Initial State)
   - *UI Effects*: Start button enabled, Pause/Stop disabled, Results cleared
   - *Components Affected*: ButtonRibbon shows only Start, ResultsDisplay empty

2. **Running** (Active Workout)
   - *UI Effects*: Pause/Stop buttons enabled, Start disabled, Timer incrementing
   - *Components Affected*: TimerDisplay updates continuously, current exercise highlighted

3. **Paused** (Temporarily Stopped)
   - *UI Effects*: Resume/Reset buttons enabled, timer display frozen
   - *Components Affected*: ButtonRibbon shows Resume and Reset options

4. **Finished** (Completed Workout)
   - *UI Effects*: Reset button enabled, full results displayed
   - *Components Affected*: ResultsDisplay populated with metrics, ButtonRibbon shows Reset

### State Transitions
- **Idle → Running**: Triggered by `{ name: "Start", timestamp: Date }` event
- **Running → Paused**: Triggered by `{ name: "Pause", timestamp: Date }` event
- **Paused → Running**: Triggered by `{ name: "Resume", timestamp: Date }` event
- **Running → Finished**: Triggered by `{ name: "Stop", timestamp: Date }` or automatically when workout completes
- **Paused → Finished**: Triggered by `{ name: "Stop", timestamp: Date }` event
- **Any State → Idle**: Triggered by `{ name: "Reset", timestamp: Date }` event

### Runtime Actions Based on State
- **On Enter Running**: Generates `DisplayUpdateAction` (starts timer), `SetButtonAction` (updates available buttons)
- **While in Running**: Continuously generates `DisplayUpdateAction` (updates timer value)
- **On Enter Paused**: Generates `SetButtonAction` (shows Resume/Reset)
- **On Enter Finished**: Generates `SetResultAction` (populates results with metrics)

![[Event-State-Transitions.excalidraw]]

## UI Update Mechanism

1. **Display Updates**: The runtime calls `onSetDisplay` to update timer values
2. **Button Updates**: The runtime calls `onSetButtons` to control available actions
3. **Results Updates**: The runtime calls `onSetResults` to display workout results
4. **Cursor Updates**: The runtime calls `onSetCursor` to highlight current block

## Conclusion

The wod.wiki application uses an event-driven architecture where:

1. User interactions generate events (button clicks, text edits)
2. Events flow through the runtime system
3. Runtime blocks process events and generate actions
4. Actions update UI components and state
5. Updated state is displayed to the user

This architecture provides a clean separation of concerns between the UI layer and the runtime execution engine, allowing for flexibility in how workouts are displayed and processed.

## 2025-04-13 11:33 - Research: UI Event Flow Architecture Analysis

### Summary

The research revealed that the wod.wiki application uses a sophisticated event-driven architecture with a clear separation of concerns between UI components and runtime execution. Events flow from user interactions through the runtime system, where they are processed by specialized runtime blocks that generate actions to update the UI. This approach enables the application to handle complex workout scripts with different structures while maintaining a responsive user interface.

### Completed Steps

* [x]: 11:33 - Examined key UI components and their relationships
* [x]: 11:33 - Studied the event flow between components
* [x]: 11:33 - Analyzed data structures and transformations
* [x]: 11:33 - Identified key event handlers and actions
* [x]: 11:33 - Created Mermaid diagrams for event flows
* [x]: 11:33 - Generated comprehensive document of UI event architecture
