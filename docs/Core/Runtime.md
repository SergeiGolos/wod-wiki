# Runtime Component

The Runtime component is the core execution engine of wod.wiki, responsible for interpreting and executing workout scripts that have been [compiled](../Core/Compile.md) from the specialized wod.wiki syntax entered in the [Editor](../Components/Editor.md).

**Runtime:** The overall execution engine. It manages:
  - A stack of Runtime Blocks.
  - The current "cursor" position (which block is active).
  - Counters/depth tracking (e.g., completed rounds).

## Core Concepts

### Runtime Architecture

The wod.wiki runtime follows an event-driven architecture with an action-based pattern:

1. **Event Processing**: Events flow into the runtime via the `tick()` method
2. **State Management**: The runtime maintains state about the current workout execution
3. **Action Generation**: Events are processed to generate actions that update the UI
4. **Strategy Pattern**: Different workout structures are handled by specialized compiler strategies

### Key Components

The runtime is composed of several key components:

- **TimerRuntime**: The central execution engine that processes events
- **CompiledRuntime**: Manages the compiled script representation
- **RuntimeBlock**: Represents individual blocks of execution within a workout
- **Compiler Strategies**: Process different types of workout structures
- **Runtime Actions**: Define UI updates in response to runtime events

## Event Processing Flow

```
┌──────────┐      ┌─────────────┐       ┌──────────-─┐       ┌──────────┐
│ UI Event │─────▶│ TimerRuntime│──────▶│ Strategies │──────▶│  Actions │
└──────────┘      └─────────────┘       └───────────-┘       └──────────┘
                         │                                         │
                         │                                         │
                         ▼                                         ▼
                  ┌─────────────┐                          ┌──────────────┐
                  │   State     │                          │     UI       │
                  └─────────────┘                          │    Updates   │
                                                           └──────────────┘ 
```

## Runtime State

The runtime maintains several types of state:

- **Execution Pointer**: Tracks the current position in the workout
- **Runtime Stack**: Maintains the hierarchy of active blocks
- **Timer State**: Tracks elapsed and remaining time
- **Round Counters**: Tracks current round within repeating structures
- **Event History**: Records significant events for results calculation

## Action Types

Events processed by the runtime generate actions that update the UI:

1. **EventAction**: Base abstract class for all actions with the `apply()` method
2. **SetDisplayAction**: Updates the timer display
3. **SetButtonAction**: Updates available control buttons
4. **SetResultAction**: Updates workout results and metrics

Each action implements the `apply()` method which is responsible for updating the appropriate part of the UI state.

## Compiler Strategies

The runtime employs multiple strategies to handle different workout structures:

| Strategy                   | Purpose                                                   |
| -------------------------- | --------------------------------------------------------- |
| RepeatingGroupStrategy     | Handles structured round repetitions (e.g., `(5)` rounds) |
| AMRAPStrategy              | Handles "As Many Rounds As Possible" workouts             |
| RepeatingStatementStrategy | Processes individual repeating elements                   |
| StatementStrategy          | Handles basic statements                                  |
| SingleUnitStrategy         | Processes atomic workout elements                         |
| CompoundStrategy           | Combines multiple strategies                              |

## Integration Points

The runtime integrates with other components through:

- **Input**: Receives compiled `WodRuntimeScript` from the [Editor](../Components/Editor.md)
- **Output**: Generates UI updates consumed by the [Editor](../Components/Editor.md) container
- **Events**: Processes UI events (start, stop, reset) and system events (tick)

## Technical Implementation

The runtime is implemented using TypeScript with:

- **Strong Typing**: Interfaces define the structure of all components
- **Immutable Operations**: State is updated through immutable operations
- **Strategy Pattern**: Extensible processing strategies
- **Observer Pattern**: UI components observe runtime state changes

## Future Enhancements

Planned enhancements for the Runtime component include:

- Enhanced metrics calculation for different workout types
- Support for more complex workout patterns
- Improved time estimation and pacing features
- Integration with external fitness tracking systems

The Runtime component forms the execution core of wod.wiki, bringing the structured workout definitions to life by managing timing, repetitions, and workout flow.

- Core execution engine
- Key methods: tick(events) - process events and return actions


`current == undefined`

- first block on the --> 

- Group (2) (round  0)
	- group (?)  (round 0)
		- item1 -- here  (current index (2),  parents [1, 0], round 0 )  
		- item2

--- 
0 item1 (1)(1)
item2 (1)(1)
item1 (1)(2)
item2 (1)(2)
item1 (2)(1)
item2 (2)(1)
item1 (2)(2)
item2 (2)(2)

---

next() group has children pushNext()
