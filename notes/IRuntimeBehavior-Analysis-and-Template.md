# IRuntimeBehavior Interface Analysis and Configurable Template

## Executive Summary

The `IRuntimeBehavior` interface represents a sophisticated composable behavior system for runtime blocks in workout script execution. This analysis examines seven concrete implementations, their memory dependencies, lifecycle method usage patterns, and provides a configurable template to standardize behavior creation while maintaining flexibility.

## 1. Interface Architecture and Design Principles

### 1.1 Core Interface Structure

The `IRuntimeBehavior` interface implements a **composable pattern** with three optional lifecycle hooks:

```typescript
export interface IRuntimeBehavior {
  onPush?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
  onNext?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
  onPop?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
}
```

**Design Goals**:
- **Constructor-configurable**: Behaviors accept arbitrary configuration parameters
- **Application-time context**: Hooks receive both runtime and block instances
- **Optional implementation**: Developers implement only required hooks
- **Composable functionality**: Multiple behaviors can be combined on single blocks

### 1.2 Runtime and Memory System Integration

Behaviors interact with two critical systems:
- **IScriptRuntime**: Provides access to JIT compiler, event handling, and memory management
- **IRuntimeMemory**: Manages typed memory references with subscription capabilities
- **IRuntimeAction**: Encapsulates executable operations returned by behaviors

## 2. Behavior Implementation Analysis

### 2.1 TimerBehavior - Time Management and Memory Persistence

**Purpose**: Manages time tracking with count-up/count-down modes and pause/resume functionality.

**Lifecycle Method Usage**:
- **onPush**: Initializes timing, sets up intervals, allocates memory references
- **onPop**: Cleans up intervals, updates memory state, closes time spans
- **onNext**: *Not implemented*

**Memory Dependencies**:
```typescript
// Pre-allocated memory references (constructor injection)
private readonly timeSpansRef?: TypedMemoryReference<TimeSpan[]>;
private readonly isRunningRef?: TypedMemoryReference<boolean>;

// Fallback allocation (backward compatibility)
runtime.memory.allocate<TimeSpan[]>(TIMER_MEMORY_TYPES.TIME_SPANS, block.key.toString(), [...]);
runtime.memory.allocate<boolean>(TIMER_MEMORY_TYPES.IS_RUNNING, block.key.toString(), true);
```

**Action Outcomes**:
- **timer:started** event emission on initialization
- **timer:tick** events every 100ms during execution
- **timer:complete** event when countdown reaches zero
- Memory state updates for time spans and running status

**Conditions and Logic**:
- Count-up mode: Timer runs indefinitely until manual stop
- Count-down mode: Timer stops when `elapsedMs >= durationMs`
- Memory allocation follows "injection first, fallback second" pattern

### 2.2 RoundsBehavior - Round Progression Tracking

**Purpose**: Manages round counting with support for variable rep schemes.

**Lifecycle Method Usage**:
- **onPush**: Initializes round counter (1-indexed), allocates rounds state memory
- **onNext**: Advances round counter, emits completion/progression events
- **onPop**: *Not implemented*

**Memory Dependencies**:
```typescript
private readonly roundsStateRef?: TypedMemoryReference<RoundsState>;
// RoundsState interface: { currentRound, totalRounds, completedRounds }
```

**Action Outcomes**:
- **rounds:changed** event when advancing to next round
- **rounds:complete** event when all rounds finished
- Memory updates for round progression state

**Conditions and Logic**:
- Rounds are 1-indexed (currentRound starts at 1)
- Completion triggered when `currentRound > totalRounds`
- Supports variable rep schemes with validation

### 2.3 CompletionBehavior - Generic Completion Detection

**Purpose**: Provides flexible completion detection through configurable conditions.

**Lifecycle Method Usage**:
- **onPush**: Checks completion condition for immediate completion scenarios
- **onNext**: Validates completion condition during progression
- **onPop**: *Not implemented*
- **onEvent**: *Optional extension* for event-driven completion

**Memory Dependencies**: *None (stateless by design)*

**Action Outcomes**:
- **block:complete** event when condition returns true
- Irreversible completion state (isCompleteFlag prevents re-evaluation)

**Conditions and Logic**:
- Condition function receives `(runtime, block)` parameters
- Supports trigger event filtering for event-driven scenarios
- Completion state is cached after first successful condition evaluation

### 2.4 LazyCompilationBehavior - On-Demand JIT Compilation

**Purpose**: Compiles child statements just-in-time using JIT compiler with optional caching.

**Lifecycle Method Usage**:
- **onPush**: *Not implemented*
- **onNext**: Compiles current child statement, manages cache
- **onPop**: *Not implemented*

**Memory Dependencies**:
```typescript
private compilationCache?: Map<number, IRuntimeBlock>;
// Optional caching based on constructor parameter
```

**Action Outcomes**:
- **PushBlockAction** containing compiled child block
- Compilation logging via NextBlockLogger
- Error handling for compilation failures

**Conditions and Logic**:
- Requires collaboration with ChildAdvancementBehavior
- Cache lookup before compilation (when enabled)
- Compilation error results in empty action array

### 2.5 ChildAdvancementBehavior - Sequential Child Navigation

**Purpose**: Tracks position within child statement array and advances sequentially.

**Lifecycle Method Usage**:
- **onPush**: *Not implemented*
- **onNext**: Advances currentChildIndex, logs progression
- **onPop**: *Not implemented*

**Memory Dependencies**: *None (pure state management)*

**Action Outcomes**:
- Empty action array (compilation handled separately)
- Progress logging via NextBlockLogger
- State change for currentChildIndex

**Conditions and Logic**:
- 0-based indexing for internal tracking
- Completion when `currentChildIndex >= children.length`
- Immutable children array (Object.freeze)

### 2.6 ParentContextBehavior - Context Reference Management

**Purpose**: Maintains reference to parent runtime block for hierarchical context.

**Lifecycle Method Usage**:
- **onPush**: No-op (maintains reference only)
- **onNext**: *Not implemented*
- **onPop**: *Not implemented*

**Memory Dependencies**: *None (reference storage only)*

**Action Outcomes**: *None (passive context provider)*

**Conditions and Logic**:
- Simple reference storage with getter methods
- No active behavior modification
- Used by other behaviors for context-aware operations

### 2.7 CompletionTrackingBehavior - Child Progress Monitoring

**Purpose**: Monitors child advancement progress and marks completion status.

**Lifecycle Method Usage**:
- **onPush**: *Not implemented*
- **onNext**: Checks ChildAdvancementBehavior for completion
- **onPop**: *Not implemented*

**Memory Dependencies**: *None (state tracking only)*

**Action Outcomes**: *None (passive monitoring)*

**Conditions and Logic**:
- Collaborative dependency on ChildAdvancementBehavior
- Irreversible completion transition
- Provides completion status query interface

## 3. Memory Dependency Patterns and Shared References

### 3.1 Memory Injection vs Fallback Allocation

**Pattern 1: Constructor Injection (Preferred)**
```typescript
constructor(
  private readonly timeSpansRef?: TypedMemoryReference<TimeSpan[]>,
  private readonly isRunningRef?: TypedMemoryReference<boolean>
)
```

**Pattern 2: Fallback Allocation (Backward Compatibility)**
```typescript
if (!this.timeSpansRef) {
  (this as any).timeSpansRef = runtime.memory.allocate<TimeSpan[]>(
    TIMER_MEMORY_TYPES.TIME_SPANS,
    block.key.toString(),
    [{ start: new Date(), stop: undefined }],
    'public'
  );
}
```

### 3.2 Memory Type Constants

Behaviors define type constants for memory allocation:
- `TIMER_MEMORY_TYPES.TIME_SPANS = 'timer-time-spans'`
- `TIMER_MEMORY_TYPES.IS_RUNNING = 'timer-is-running'`
- `ROUNDS_MEMORY_TYPES.STATE = 'rounds-state'`

### 3.3 Memory Reference Lifecycle

1. **Allocation**: During onPush (constructor injection or fallback)
2. **Updates**: Throughout behavior lifecycle
3. **Subscription**: External components can subscribe to changes
4. **Cleanup**: Automatic when associated stack items are removed

## 4. Action Outcomes and Event Emission Patterns

### 4.1 Event Categories

**Timer Events**:
- `timer:started` - Timer initialization
- `timer:tick` - Regular progress updates (100ms intervals)
- `timer:complete` - Countdown completion

**Rounds Events**:
- `rounds:changed` - Round advancement
- `rounds:complete` - All rounds finished

**Generic Events**:
- `block:complete` - Generic completion notification

### 4.2 Action Return Patterns

**Empty Actions**: State changes only (ChildAdvancementBehavior, CompletionTrackingBehavior)
**Event Actions**: Side-effect notifications (TimerBehavior, RoundsBehavior)
**Push Actions**: Stack manipulation (LazyCompilationBehavior)

## 5. Configurable Behavior Template

```typescript
/**
 * Configurable Runtime Behavior Template
 *
 * Provides standardized structure for creating IRuntimeBehavior implementations
 * with configurable lifecycle methods, memory management, and action patterns.
 */
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { TypedMemoryReference } from '../IMemoryReference';

export interface BehaviorConfig<TMemory = any> {
  /** Memory configuration for automatic allocation/injection */
  memory?: {
    type: string;
    defaultValue?: TMemory;
    visibility?: 'public' | 'private';
    ref?: TypedMemoryReference<TMemory>;
  }[];

  /** Event emission configuration */
  events?: {
    onPush?: string[];
    onNext?: string[];
    onPop?: string[];
  };

  /** Lifecycle method configuration */
  lifecycle?: {
    implementOnPush?: boolean;
    implementOnNext?: boolean;
    implementOnPop?: boolean;
  };

  /** Behavior-specific configuration */
  behavior?: Record<string, any>;
}

export abstract class ConfigurableBehavior<TMemory = any> implements IRuntimeBehavior {
  protected memoryRefs: Map<string, TypedMemoryReference<any>> = new Map();
  protected config: BehaviorConfig<TMemory>;

  constructor(config: BehaviorConfig<TMemory>) {
    this.config = {
      lifecycle: {
        implementOnPush: true,
        implementOnNext: true,
        implementOnPop: true,
        ...config.lifecycle
      },
      events: {
        onPush: [],
        onNext: [],
        onPop: [],
        ...config.events
      },
      ...config
    };
  }

  /**
   * Standardized onPush implementation with memory management
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (!this.config.lifecycle?.implementOnPush) {
      return [];
    }

    // Initialize memory references
    this.initializeMemory(runtime, block);

    // Execute behavior-specific initialization
    const actions = this.handleOnPush(runtime, block);

    // Emit configured events
    this.emitEvents(this.config.events?.onPush || [], runtime, block);

    return actions;
  }

  /**
   * Standardized onNext implementation with state progression
   */
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (!this.config.lifecycle?.implementOnNext) {
      return [];
    }

    // Execute behavior-specific next logic
    const actions = this.handleOnNext(runtime, block);

    // Update memory state if needed
    this.updateMemory(runtime, block);

    // Emit configured events
    this.emitEvents(this.config.events?.onNext || [], runtime, block);

    return actions;
  }

  /**
   * Standardized onPop implementation with cleanup
   */
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (!this.config.lifecycle?.implementOnPop) {
      return [];
    }

    // Execute behavior-specific cleanup
    const actions = this.handleOnPop(runtime, block);

    // Final memory state update
    this.finalizeMemory(runtime, block);

    // Emit configured events
    this.emitEvents(this.config.events?.onPop || [], runtime, block);

    return actions;
  }

  /**
   * Initialize memory references based on configuration
   */
  private initializeMemory(runtime: IScriptRuntime, block: IRuntimeBlock): void {
    if (!this.config.memory) return;

    for (const memConfig of this.config.memory) {
      if (memConfig.ref) {
        // Use injected reference
        this.memoryRefs.set(memConfig.type, memConfig.ref);
        if (memConfig.defaultValue !== undefined) {
          memConfig.ref.set(memConfig.defaultValue);
        }
      } else {
        // Allocate new reference
        const ref = runtime.memory.allocate(
          memConfig.type,
          block.key.toString(),
          memConfig.defaultValue,
          memConfig.visibility || 'private'
        );
        this.memoryRefs.set(memConfig.type, ref);
      }
    }
  }

  /**
   * Emit events based on configuration
   */
  private emitEvents(eventNames: string[], runtime: IScriptRuntime, block: IRuntimeBlock): void {
    for (const eventName of eventNames) {
      runtime.handle({
        name: eventName,
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          ...this.config.behavior
        }
      });
    }
  }

  // Abstract methods for behavior-specific implementation

  /**
   * Behavior-specific onPush logic
   */
  protected abstract handleOnPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];

  /**
   * Behavior-specific onNext logic
   */
  protected abstract handleOnNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];

  /**
   * Behavior-specific onPop logic
   */
  protected abstract handleOnPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];

  /**
   * Update memory state during progression (optional)
   */
  protected updateMemory(runtime: IScriptRuntime, block: IRuntimeBlock): void {
    // Default implementation - override for custom memory updates
  }

  /**
   * Finalize memory state during cleanup (optional)
   */
  protected finalizeMemory(runtime: IScriptRuntime, block: IRuntimeBlock): void {
    // Default implementation - override for custom finalization
  }

  /**
   * Get typed memory reference by type
   */
  protected getMemoryRef<T>(type: string): TypedMemoryReference<T> | undefined {
    return this.memoryRefs.get(type) as TypedMemoryReference<T>;
  }
}

/**
 * Example usage: Timer behavior built with configurable template
 */
export class ConfigurableTimerBehavior extends ConfigurableBehavior {
  private intervalId?: ReturnType<typeof setInterval>;
  private startTime = 0;

  constructor(
    private direction: 'up' | 'down' = 'up',
    private durationMs?: number,
    timeSpansRef?: TypedMemoryReference<any[]>,
    isRunningRef?: TypedMemoryReference<boolean>
  ) {
    super({
      memory: [
        {
          type: 'timer-time-spans',
          defaultValue: [{ start: new Date(), stop: undefined }],
          visibility: 'public',
          ref: timeSpansRef
        },
        {
          type: 'timer-is-running',
          defaultValue: true,
          visibility: 'public',
          ref: isRunningRef
        }
      ],
      events: {
        onPush: ['timer:started'],
        onPop: []
      },
      behavior: {
        direction,
        durationMs
      }
    });
  }

  protected handleOnPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this.startTime = performance.now();

    // Start interval for timer ticks
    this.intervalId = setInterval(() => {
      this.emitEvents(['timer:tick'], runtime, block);
    }, 100);

    return [];
  }

  protected handleOnNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Timer progression logic
    const elapsedMs = performance.now() - this.startTime;

    if (this.direction === 'down' && this.durationMs && elapsedMs >= this.durationMs) {
      this.emitEvents(['timer:complete'], runtime, block);
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
    }

    return [];
  }

  protected handleOnPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Update time spans memory
    const timeSpansRef = this.getMemoryRef<any[]>('timer-time-spans');
    if (timeSpansRef) {
      const spans = timeSpansRef.get() || [];
      if (spans.length > 0 && !spans[spans.length - 1].stop) {
        spans[spans.length - 1].stop = new Date();
        timeSpansRef.set([...spans]);
      }
    }

    return [];
  }
}
```

## 6. Strategic Recommendations

### 6.1 Memory Management Standardization

1. **Adopt Constructor Injection Pattern**: Phase out fallback allocation in favor of explicit memory reference injection
2. **Standardize Memory Type Constants**: Create centralized registry for memory type definitions
3. **Implement Memory Lifecycle Contracts**: Define clear patterns for memory initialization, updates, and cleanup

### 6.2 Behavior Composition Patterns

1. **Behavior Dependency Injection**: Establish formal contracts for inter-behavior collaboration
2. **Event-Driven Communication**: Standardize event naming conventions and payload structures
3. **State Synchronization**: Implement patterns for coordinating state across multiple behaviors

### 6.3 Configurable Template Adoption

1. **Base Class Migration**: Gradually migrate existing behaviors to extend `ConfigurableBehavior`
2. **Configuration-Driven Development**: Enable behavior creation through configuration objects
3. **Testing Framework Integration**: Provide standardized testing utilities for configurable behaviors

### 6.4 Performance Optimization

1. **Memory Pool Management**: Implement efficient memory allocation and deallocation patterns
2. **Event Throttling**: Add configurable event throttling for high-frequency operations
3. **Lazy Loading Patterns**: Optimize behavior initialization based on actual usage patterns

## 7. Implementation Guidelines

### 7.1 Creating New Behaviors

When creating new behaviors, follow this checklist:

1. **Determine Lifecycle Requirements**: Which hooks (onPush, onNext, onPop) are needed?
2. **Identify Memory Dependencies**: What state needs to persist across lifecycle calls?
3. **Define Event Emissions**: What events should be emitted and when?
4. **Choose Memory Injection Pattern**: Use constructor injection for new implementations
5. **Implement Collaborative Dependencies**: If other behaviors are needed, define clear contracts
6. **Add Comprehensive Testing**: Test all lifecycle methods and memory interactions

### 7.2 Migration Strategy

For migrating existing behaviors to the configurable template:

1. **Analyze Current Implementation**: Identify memory patterns, event emissions, and lifecycle usage
2. **Create Configuration Object**: Define memory, events, and lifecycle configuration
3. **Implement Abstract Methods**: Move behavior-specific logic to handleOnPush/handleOnNext/handleOnPop
4. **Test Compatibility**: Ensure migrated behavior maintains existing functionality
5. **Update Documentation**: Reflect new configuration-based approach in API docs

---

*Document generated: 2025-10-11*
*Analysis covers all IRuntimeBehavior implementations in the codebase as of this date*