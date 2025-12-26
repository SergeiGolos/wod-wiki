# Services

Shared services and utilities used across the WOD Wiki system.

## Overview

The services module provides:

- **DialectRegistry** - Manages semantic hint dialects
- **AudioService** - Audio cue playback
- **EventBus** - Event dispatching and handling
- **MetricsContext** - React context for metrics
- **WorkoutEventBus** - Workout-specific event handling
- **ExecutionLogService** - Execution tracking and logging
- **AnalyticsTransformer** - Analytics data transformation
- **Dialect** - Base interface for semantic dialects

## DialectRegistry

Registry for managing and processing workout dialects.

### Purpose

Dialects analyze parsed statements and add semantic hints that guide JIT compilation. Hints help strategies match appropriate block types.

### Constructor

```typescript
constructor()
```

### Methods

#### `register(dialect: IDialect): void`

Registers a dialect for processing.

**Parameters:**
- `dialect` - Dialect instance implementing `IDialect`

**Example:**

```typescript
const registry = new DialectRegistry();
registry.register(new CrossFitDialect());
```

#### `unregister(dialectId: string): void`

Unregisters a dialect by ID.

**Parameters:**
- `dialectId` - Unique dialect identifier

#### `get(dialectId: string): IDialect | undefined`

Retrieves a registered dialect.

**Returns:** Dialect instance or `undefined` if not found

#### `getRegisteredIds(): string[]`

Gets all registered dialect IDs.

**Returns:** Array of dialect identifiers

#### `process(statement: ICodeStatement): void`

Processes a single statement through all dialects.

**Parameters:**
- `statement` - Statement to process

**Behavior:**
1. Ensures hints Set exists
2. Iterates through all registered dialects
3. Accumulates hints onto statement's hints Set

**Example:**

```typescript
dialectRegistry.process(statement);

// After processing, statement.hints might contain:
// - 'time_bound' (from AMRAP dialect)
// - 'repeating_interval' (from EMOM dialect)
// - 'group' (from nested statement dialect)
```

#### `processAll(statements: ICodeStatement[]): void`

Processes multiple statements.

#### `clear(): void`

Clears all registered dialects.

## IDialect Interface

Base interface for dialect implementations.

### Interface

```typescript
interface IDialect {
  id: string;
  analyze(statement: ICodeStatement): DialectAnalysis;
}
```

### Methods

#### `analyze(statement: ICodeStatement): DialectAnalysis`

Analyzes a statement and returns semantic hints.

**Parameters:**
- `statement` - Statement to analyze

**Returns:** `DialectAnalysis` containing hints and inheritance rules

```typescript
interface DialectAnalysis {
  hints: string[];
  inheritance?: InheritanceRule[];
}
```

### Example Dialect

```typescript
class AMRAPDialect implements IDialect {
  id = 'amrap';
  
  analyze(statement: ICodeStatement): DialectAnalysis {
    // Check for AMRAP pattern
    const hasTimer = statement.fragments.some(f => 
      f.fragmentType === FragmentType.Timer
    );
    const hasRounds = statement.fragments.some(f => 
      f.fragmentType === FragmentType.Rounds
    );
    
    if (hasTimer && hasRounds) {
      return {
        hints: ['time_bound']
      };
    }
    
    return { hints: [] };
  }
}
```

## AudioService

Manages audio cue playback for workout execution.

### Purpose

Plays predefined sounds at specific points during workout:
- Countdown ticks (3, 2, 1 seconds remaining)
- Buzzer on timer completion
- Start beep for count-up timers

### Methods

#### `play(soundKey: string): void`

Plays a sound by key.

**Parameters:**
- `soundKey` - Identifier for the sound

**Predefined Sounds:**

| Key | Sound | Usage |
|-----|--------|-------|
| `tick` | Short beep | Countdown (3, 2, 1s remaining) |
| `buzzer` | Long buzz | Timer completion |
| `start` | Single beep | Timer start (count-up) |

#### `stop(soundKey: string): void`

Stops a currently playing sound.

#### `pauseAll(): void`

Pauses all active sounds.

#### `resumeAll(): void`

Resumes all paused sounds.

**Example:**

```typescript
// Play countdown tick
audioService.play('tick');

// Play completion buzzer
audioService.play('buzzer');

// Pause all sounds during workout pause
audioService.pauseAll();
```

## EventBus

Generic event dispatching and subscription system.

### Purpose

Provides pub/sub pattern for runtime events like timer ticks, block completions, and user actions.

### Methods

#### `dispatch(event: IEvent, source?: any): void`

Dispatches an event to all handlers.

**Parameters:**
- `event` - Event to dispatch
- `source` - Optional source identifier

#### `register(eventType: string, handler: IEventHandler, owner?: string): void`

Registers a handler for specific event type.

**Parameters:**
- `eventType` - Event type to handle
- `handler` - Handler function
- `owner` - Optional owner for cleanup

#### `unregister(eventType: string, handler: IEventHandler): void`

Unregisters a specific handler.

#### `unregisterByOwner(owner: string): void`

Unregisters all handlers owned by specific owner.

### IEvent Interface

```typescript
interface IEvent {
  type: string;
  timestamp: Date;
  source?: string;
  data?: any;
}
```

### Common Events

| Event Type | Description | Data |
|-----------|-------------|-------|
| `timer:tick` | Timer tick update | `{ elapsedMs, remainingMs, direction }` |
| `timer:complete` | Timer reached end | `{ blockId }` |
| `timer:start` | Timer started | `{ blockId }` |
| `timer:pause` | Timer paused | `{ blockId }` |
| `timer:resume` | Timer resumed | `{ blockId }` |
| `block:complete` | Block execution finished | `{ blockId, blockKey }` |
| `next` | Advance to next block | `{ source }` |
| `reps:updated` | Rep count changed | `{ blockId, value }` |
| `reps:complete` | Rep target reached | `{ blockId }` |

**Example:**

```typescript
// Register handler
eventBus.register('timer:complete', handler, 'my-component');

// Dispatch event
eventBus.dispatch({
  type: 'timer:complete',
  timestamp: new Date(),
  data: { blockId: '123' }
});
```

## ExecutionLogService

Tracks and logs workout execution for analytics and history.

### Purpose

Captures execution spans, metrics, and events for:
- Post-workout analytics
- Historical tracking
- Performance analysis

### Methods

#### `recordSpan(span: TrackedSpan): void`

Records an execution span.

#### `recordMetric(blockId: string, metric: RuntimeMetric): void`

Records a metric for a specific block.

#### `getHistory(): TrackedSpan[]`

Gets all recorded execution spans.

#### `clear(): void`

Clears all execution logs.

## MetricsContext

React context provider for metrics data.

### Purpose

Shares metrics and execution state across component tree.

### Use

```typescript
import { MetricsProvider } from '@/services/MetricsContext';

function App() {
  return (
    <MetricsProvider>
      <WorkoutTimer />
    </MetricsProvider>
  );
}

function WorkoutTimer() {
  const { metrics, updateMetric } = useMetrics();
  
  return (
    <div>Timer: {metrics.elapsed}ms</div>
  );
}
```

## AnalyticsTransformer

Transforms raw execution data into analytics format.

### Purpose

Converts runtime metrics and spans into:
- Performance summaries
- Progress tracking
- Comparison data

## WorkoutEventBus

Specialized event bus for workout-specific events.

### Purpose

Extends generic EventBus with workout-specific:
- Predefined event types
- Workout lifecycle events
- Performance optimization

## See Also

- [Runtime System](./runtime-system.md) - Runtime event handling
- [Block Types Reference](../block-types-behaviors-reference.md) - Event-driven behaviors
- [Editor Integration](./editor-integration.md) - Editor-specific services
