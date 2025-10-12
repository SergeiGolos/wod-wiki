# Runtime Behavior Architecture: IRuntimeBehavior Implementation Analysis

## Executive Summary and Introduction

The WOD Wiki runtime employs a composable behavior-based architecture where discrete `IRuntimeBehavior` implementations orchestrate block lifecycle management, memory allocation, and execution flow control. This analysis provides a comprehensive examination of the seven concrete behavior implementations, their lifecycle hook utilization patterns, memory dependency structures, and action outcomes. The research reveals a consistent pattern of constructor-based dependency injection for memory references, strategic hook usage based on operational requirements, and a well-defined action return model that enables declarative runtime control.

The `IRuntimeBehavior` interface defines three optional lifecycle hooks (`onPush`, `onNext`, `onPop`) that correspond to the fundamental phases of a runtime block's execution: initialization, child progression, and cleanup. Each behavior implementation selectively implements these hooks based on its specific responsibilities, creating a modular and extensible system for runtime block orchestration.

## Current Landscape: Behavior Implementations

### Overview of Behavior Classes

The codebase contains seven concrete implementations of `IRuntimeBehavior`, each serving distinct functional roles:

1. **TimerBehavior** - Time tracking and interval-based event emission
2. **RoundsBehavior** - Round progression and variable rep scheme management
3. **ChildAdvancementBehavior** - Sequential child statement traversal
4. **LazyCompilationBehavior** - JIT compilation of child statements on demand
5. **CompletionBehavior** - Generic completion condition detection
6. **CompletionTrackingBehavior** - Child advancement completion monitoring
7. **ParentContextBehavior** - Parent block reference maintenance

### Behavior Composition Patterns

Behaviors are instantiated by strategy implementations (`EffortStrategy`, `TimerStrategy`, `RoundsStrategy`) and injected into `RuntimeBlock` constructors. The `RuntimeBlock` class orchestrates behavior execution by iterating over the behaviors array during `push()`, `next()`, and `pop()` lifecycle methods:

```typescript
// RuntimeBlock.push() orchestration pattern
push(): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
        const result = behavior?.onPush?.(this._runtime, this);
        if (result) { actions.push(...result); }
    }
    return actions;
}
```

This pattern ensures all behaviors receive lifecycle notifications and can contribute actions to the execution queue.

## Technical Deep Dive: Hook Implementation Analysis

### Hook 1: onPush(runtime, block) - Initialization Phase

The `onPush` hook is invoked when a block is pushed onto the runtime stack. This phase handles resource allocation, initial state setup, and startup events.

#### TimerBehavior.onPush

**Purpose**: Initialize timer intervals and memory tracking  
**Memory Dependencies**:
- `timeSpansRef: TypedMemoryReference<TimeSpan[]>` - Array of start/stop timestamp pairs
- `isRunningRef: TypedMemoryReference<boolean>` - Current running state flag

**Actions Performed**:
1. Store runtime reference for interval callbacks
2. Initialize or validate memory references (constructor-injected or fallback allocation)
3. Record start time via `performance.now()`
4. Start `setInterval` for 100ms tick emissions
5. Emit `timer:started` event via `runtime.handle()`

**Memory Allocation Pattern**:
```typescript
// Constructor injection (preferred)
constructor(
    direction: 'up' | 'down',
    durationMs?: number,
    timeSpansRef?: TypedMemoryReference<TimeSpan[]>,
    isRunningRef?: TypedMemoryReference<boolean>
) { /* ... */ }

// Fallback allocation for backward compatibility
if (!this.timeSpansRef) {
    (this as any).timeSpansRef = runtime.memory.allocate<TimeSpan[]>(
        TIMER_MEMORY_TYPES.TIME_SPANS,
        block.key.toString(),
        [{ start: new Date(), stop: undefined }],
        'public'
    );
}
```

**Return Value**: Empty array `[]` - no immediate actions required

**Conditions**: Always executes when timer block is pushed

---

#### RoundsBehavior.onPush

**Purpose**: Initialize round tracking state  
**Memory Dependencies**:
- `roundsStateRef: TypedMemoryReference<RoundsState>` - Current round, total rounds, completion status

**Actions Performed**:
1. Set `currentRound` to 1 (1-indexed rounds)
2. Initialize memory reference with initial state
3. Validate `totalRounds` and optional `repScheme` parameters

**Memory Allocation Pattern**:
```typescript
// Constructor injection with fallback
if (this.roundsStateRef) {
    this.roundsStateRef.set({
        currentRound: 1,
        totalRounds: this.totalRounds,
        completedRounds: 0,
    });
} else {
    (this as any).roundsStateRef = runtime.memory.allocate<RoundsState>(
        ROUNDS_MEMORY_TYPES.STATE,
        block.key.toString(),
        { currentRound: 1, totalRounds: this.totalRounds, completedRounds: 0 },
        'public'
    );
}
```

**Return Value**: Empty array `[]`

**Conditions**: Always executes when rounds block is pushed

---

#### CompletionBehavior.onPush

**Purpose**: Check for immediate completion (leaf blocks)  
**Memory Dependencies**: None - stateless condition evaluation

**Actions Performed**:
1. Evaluate condition function: `condition(runtime, block)`
2. If true, set internal `isCompleteFlag`
3. Emit `block:complete` event via `runtime.handle()`

**Condition Function Signature**:
```typescript
private readonly condition: (runtime: IScriptRuntime, block: IRuntimeBlock) => boolean
```

**Return Value**: Empty array `[]`

**Conditions**: Executes condition check on push, allows immediate completion for leaf nodes

---

#### ParentContextBehavior.onPush

**Purpose**: Maintain parent reference (no-op initialization)  
**Memory Dependencies**: 
- `parentContext: IRuntimeBlock | undefined` - Stored as private field, not in memory system

**Actions Performed**: None - reference maintained in constructor

**Return Value**: Empty array `[]`

**Conditions**: Always called but performs no operations

---

#### Behaviors NOT Implementing onPush

- **ChildAdvancementBehavior** - No initialization needed, starts at index 0
- **LazyCompilationBehavior** - Compilation cache initialized in constructor
- **CompletionTrackingBehavior** - Starts in incomplete state by default

### Hook 2: onNext(runtime, block) - Progression Phase

The `onNext` hook is invoked when a child block completes and the parent must determine the next action. This is the most critical hook for execution flow control.

#### LazyCompilationBehavior.onNext

**Purpose**: Compile current child statement and push to stack  
**Memory Dependencies**: None (relies on `ChildAdvancementBehavior` for child access)

**Dependencies**: Requires `ChildAdvancementBehavior` in same block's behavior array

**Actions Performed**:
1. Query `ChildAdvancementBehavior.getCurrentChild()` via `getBehavior()`
2. Check optional compilation cache for pre-compiled blocks
3. Invoke `runtime.jit.compile([currentChild], runtime)`
4. Cache compiled block if caching enabled
5. Log compilation success/failure via `NextBlockLogger`

**Return Value**: 
```typescript
[new PushBlockAction(compiledBlock)]  // Success
[]                                     // Failure or completion
```

**Conditions**:
- Has `ChildAdvancementBehavior` sibling behavior
- Current child is not `undefined`
- JIT compilation succeeds without throwing

**Error Handling**: Catches compilation errors, logs via `NextBlockLogger`, returns empty array

---

#### ChildAdvancementBehavior.onNext

**Purpose**: Advance internal child index pointer  
**Memory Dependencies**: None - index stored as private field

**Actions Performed**:
1. Check if `currentChildIndex >= children.length` (completion check)
2. Increment `currentChildIndex++`
3. Log advancement status via `NextBlockLogger`

**Return Value**: Always empty array `[]` (compilation delegated to `LazyCompilationBehavior`)

**State Transition**:
```
currentChildIndex: 0 → 1 → 2 → ... → children.length (complete)
```

**Conditions**: Always executes on `next()`, irreversible progression

---

#### CompletionBehavior.onNext

**Purpose**: Check completion condition on each advancement  
**Memory Dependencies**: None

**Actions Performed**:
1. Short-circuit if `isCompleteFlag` already true
2. Evaluate `condition(runtime, block)`
3. If true, set flag and emit `block:complete` event

**Return Value**: Empty array `[]`

**Conditions**: Re-evaluates condition on every `next()` call until complete

**Event Emission**:
```typescript
runtime.handle({
    name: 'block:complete',
    timestamp: new Date(),
    data: { blockId: block.key.toString() }
});
```

---

#### CompletionTrackingBehavior.onNext

**Purpose**: Monitor child advancement completion  
**Memory Dependencies**: None

**Dependencies**: Requires `ChildAdvancementBehavior` sibling

**Actions Performed**:
1. Short-circuit if already marked complete
2. Query `ChildAdvancementBehavior.isComplete()`
3. Store result in internal `_isComplete` flag

**Return Value**: Empty array `[]`

**State Logic**:
```typescript
if (this._isComplete) return [];  // Irreversible completion
this._isComplete = childBehavior.isComplete();
```

---

#### RoundsBehavior.onNext

**Purpose**: Advance round counter and emit progression events  
**Memory Dependencies**: 
- `roundsStateRef` - Updated with new round state

**Actions Performed**:
1. Increment `currentRound++`
2. Update memory reference with new state
3. Conditional event emission:
   - If `currentRound > totalRounds`: emit `rounds:complete`
   - Else: emit `rounds:changed` with progression data

**Return Value**: Empty array `[]`

**Memory Update Pattern**:
```typescript
this.roundsStateRef.set({
    currentRound: this.currentRound,
    totalRounds: this.totalRounds,
    completedRounds: this.currentRound - 1,
});
```

**Event Branching**:
- **Complete Event**: Emitted when all rounds finished
- **Changed Event**: Emitted on round advancement (includes current/completed counts)

---

#### Behaviors NOT Implementing onNext

- **TimerBehavior** - Timer ticks via interval, not child progression
- **ParentContextBehavior** - Static reference, no progression logic

### Hook 3: onPop(runtime, block) - Cleanup Phase

The `onPop` hook is invoked immediately before a block is popped from the stack. This phase handles resource cleanup, final state updates, and termination events.

#### TimerBehavior.onPop

**Purpose**: Stop timer interval and finalize memory  
**Memory Dependencies**:
- `timeSpansRef` - Closed by setting `stop` timestamp
- `isRunningRef` - Set to `false`

**Actions Performed**:
1. Clear interval via `clearInterval(this.intervalId)`
2. Close open time span: `spans[spans.length - 1].stop = new Date()`
3. Update `isRunningRef` to `false`
4. Nullify `intervalId` reference

**Memory Finalization**:
```typescript
const spans = this.timeSpansRef.get() || [];
if (spans.length > 0 && !spans[spans.length - 1].stop) {
    spans[spans.length - 1].stop = new Date();
    this.timeSpansRef.set([...spans]);  // Immutable update
}
this.isRunningRef.set(false);
```

**Return Value**: Empty array `[]`

**Conditions**: Always executes when timer block is popped

---

#### Behaviors NOT Implementing onPop

All other behaviors do not implement `onPop`:

- **RoundsBehavior** - Memory cleanup delegated to `BlockContext.release()`
- **ChildAdvancementBehavior** - No resources to clean (index is ephemeral)
- **LazyCompilationBehavior** - Cleanup handled via `onDispose` hook
- **CompletionBehavior** - Stateless condition function
- **CompletionTrackingBehavior** - Boolean flag is ephemeral
- **ParentContextBehavior** - Reference is external, not owned

### Additional Hook: onDispose(runtime, block)

Not part of the `IRuntimeBehavior` interface but implemented as an optional extension method.

#### LazyCompilationBehavior.onDispose

**Purpose**: Clear compilation cache  
**Actions Performed**: `this.compilationCache?.clear()`

#### RoundsBehavior.onDispose

**Purpose**: Backward compatibility placeholder  
**Actions Performed**: None (comment indicates memory cleanup now handled by `BlockContext.release()`)

## Primary Challenges and Operational Limitations

### Memory Ownership Ambiguity

The dual pattern of constructor injection and fallback allocation creates ambiguity in memory ownership:

```typescript
// Pattern 1: Constructor injection (new approach)
const timerRef = context.allocate<TimeSpan[]>('timer-time-spans', []);
const behavior = new TimerBehavior('up', undefined, timerRef);

// Pattern 2: Fallback allocation (backward compatibility)
if (!this.timeSpansRef) {
    (this as any).timeSpansRef = runtime.memory.allocate(/* ... */);
}
```

**Issue**: Behaviors allocating their own memory bypass `BlockContext` tracking, potentially causing memory leaks if `context.release()` is not called.

### Hook Orchestration Complexity

The `RuntimeBlock` class iterates over all behaviors for each lifecycle phase:

```typescript
for (const behavior of this.behaviors) {
    const result = behavior?.onNext?.(this._runtime, this);
    if (result) { actions.push(...result); }
}
```

**Issue**: Action accumulation without priority or ordering guarantees. If multiple behaviors return `PushBlockAction`, all will be executed in iteration order.

### Inter-Behavior Dependencies

Some behaviors require sibling behaviors to function:

- `LazyCompilationBehavior` depends on `ChildAdvancementBehavior`
- `CompletionTrackingBehavior` depends on `ChildAdvancementBehavior`

**Issue**: No explicit dependency declaration or validation. Incorrect behavior composition causes silent failures:

```typescript
const childBehavior = this.getChildBehavior(block);
if (!childBehavior) {
    return [];  // Silent no-op if dependency missing
}
```

### Event vs. Action Duality

Behaviors emit events via `runtime.handle()` AND return actions via `IRuntimeAction[]`:

```typescript
// Event emission (side effect)
runtime.handle({ name: 'timer:complete', timestamp: new Date(), data: { /* ... */ } });

// Action return (declarative)
return [new PushBlockAction(compiledBlock)];
```

**Issue**: Mixing imperative event handling with declarative action returns creates two parallel execution paths. Consumers must understand both mechanisms.

### TypeScript Type Safety Gaps

Memory reference casting bypasses type safety:

```typescript
(this as any).timeSpansRef = runtime.memory.allocate<TimeSpan[]>(/* ... */);
```

**Issue**: The `as any` cast circumvents TypeScript's readonly checks, allowing mutation of constructor-initialized fields.

## Market Trajectory and Future Projections

### Strategy Pattern Maturation

The current strategy implementations (`EffortStrategy`, `TimerStrategy`, `RoundsStrategy`) demonstrate emerging patterns for behavior composition:

```typescript
// TimerStrategy.compile() - Memory-first pattern
const context = new BlockContext(runtime, blockId);
const timeSpansRef = context.allocate<TimeSpan[]>(TIMER_MEMORY_TYPES.TIME_SPANS, []);
const isRunningRef = context.allocate<boolean>(TIMER_MEMORY_TYPES.IS_RUNNING, true);
const timerBehavior = new TimerBehavior(direction, durationMs, timeSpansRef, isRunningRef);
```

**Projection**: All strategies will converge on this "allocate-then-inject" pattern, eliminating fallback allocation within behaviors.

### Behavior Template Standardization

Current implementations follow divergent patterns for similar operations. A standard template could enforce:

1. **Constructor Parameter Order**: `(config, ...memoryRefs)`
2. **Memory Initialization**: Always via constructor injection
3. **Hook Implementation**: Explicit no-op methods instead of omission
4. **Error Handling**: Consistent error logging and recovery

### Action Return Conventions

The current action return pattern lacks consistency:

- `LazyCompilationBehavior.onNext()` returns `[PushBlockAction]`
- `TimerBehavior.onPush()` returns `[]`
- `RoundsBehavior.onNext()` returns `[]` (uses events instead)

**Projection**: Standardized action types for common operations:
- `EmitEventAction` - Encapsulate `runtime.handle()` calls
- `UpdateMemoryAction` - Encapsulate memory reference updates
- `PushBlockAction` / `PopBlockAction` - Existing stack operations

## Conclusion and Strategic Recommendations

### Recommended Behavior Template

A standardized behavior template should enforce consistent patterns across all implementations:

```typescript
/**
 * Standardized Behavior Template
 * 
 * Design Requirements:
 * 1. All memory references passed via constructor
 * 2. All lifecycle hooks explicitly implemented (no-op if unused)
 * 3. All actions returned declaratively (no direct runtime.handle())
 * 4. All dependencies declared via constructor parameters
 */
export class StandardBehaviorTemplate implements IRuntimeBehavior {
    // 1. Memory references (constructor-injected)
    private readonly memoryRef?: TypedMemoryReference<StateType>;
    
    // 2. Configuration (constructor-injected)
    private readonly config: BehaviorConfig;
    
    // 3. Dependencies (constructor-injected)
    private readonly dependency?: OtherBehavior;
    
    constructor(
        config: BehaviorConfig,
        memoryRef?: TypedMemoryReference<StateType>,
        dependency?: OtherBehavior
    ) {
        this.config = config;
        this.memoryRef = memoryRef;
        this.dependency = dependency;
        
        // Validate configuration in constructor
        this.validateConfig();
    }
    
    // 4. Always implement all hooks (explicit no-ops)
    onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        if (!this.memoryRef) return [];
        
        // Initialize memory
        this.memoryRef.set(this.getInitialState());
        
        // Return declarative actions
        return [
            new EmitEventAction('behavior:initialized', {
                blockId: block.key.toString(),
            }),
        ];
    }
    
    onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        if (!this.dependency) return [];
        
        // Check dependency state
        const dependencyState = this.dependency.getState();
        if (!dependencyState.isReady) return [];
        
        // Perform behavior logic
        const nextState = this.computeNextState(dependencyState);
        
        // Update memory
        if (this.memoryRef) {
            this.memoryRef.set(nextState);
        }
        
        // Return declarative actions
        return this.createActions(nextState);
    }
    
    onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // Finalize memory state
        if (this.memoryRef) {
            const finalState = this.getFinalState();
            this.memoryRef.set(finalState);
        }
        
        return [
            new EmitEventAction('behavior:finalized', {
                blockId: block.key.toString(),
            }),
        ];
    }
    
    // 5. Optional disposal hook
    onDispose?(runtime: IScriptRuntime, block: IRuntimeBlock): void {
        // Clear caches, remove listeners, etc.
        this.cleanup();
    }
    
    // 6. Private helpers for state management
    private validateConfig(): void { /* ... */ }
    private getInitialState(): StateType { /* ... */ }
    private computeNextState(input: any): StateType { /* ... */ }
    private getFinalState(): StateType { /* ... */ }
    private createActions(state: StateType): IRuntimeAction[] { /* ... */ }
    private cleanup(): void { /* ... */ }
}
```

### Memory Allocation Best Practices

**Strategy Responsibility Pattern**:

```typescript
// Strategy allocates ALL memory BEFORE behavior construction
export class ExampleStrategy implements IRuntimeBlockStrategy {
    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 1. Create context
        const context = new BlockContext(runtime, blockId);
        
        // 2. Allocate all required memory
        const memRef1 = context.allocate<Type1>('memory-type-1', initialValue1, 'public');
        const memRef2 = context.allocate<Type2>('memory-type-2', initialValue2, 'private');
        
        // 3. Construct behaviors with memory references
        const behaviors: IRuntimeBehavior[] = [
            new BehaviorA(config, memRef1),
            new BehaviorB(config, memRef1, memRef2),
        ];
        
        // 4. Create block with context
        return new RuntimeBlock(runtime, sourceIds, behaviors, context, blockKey, blockType);
    }
}
```

### Dependency Injection Pattern

**Explicit Behavior Dependencies**:

```typescript
// Behaviors declare dependencies via constructor parameters
export class LazyCompilationBehavior implements IRuntimeBehavior {
    constructor(
        private readonly childAdvancement: ChildAdvancementBehavior,
        private readonly enableCaching: boolean = false
    ) {
        // Validate dependency at construction time
        if (!childAdvancement) {
            throw new Error('LazyCompilationBehavior requires ChildAdvancementBehavior');
        }
    }
    
    onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // No runtime dependency resolution needed
        const currentChild = this.childAdvancement.getCurrentChild();
        // ... compile and return actions
    }
}

// Strategy ensures dependencies are satisfied
const childAdvancement = new ChildAdvancementBehavior(children);
const lazyCompilation = new LazyCompilationBehavior(childAdvancement, false);
const behaviors = [childAdvancement, lazyCompilation];
```

### Action-Based Event Emission

**Declarative Event Actions**:

```typescript
// Replace: runtime.handle({ name: 'event', data: {} });
// With: return [new EmitEventAction('event', data)];

export class EmitEventAction implements IRuntimeAction {
    readonly type = 'emit-event';
    
    constructor(
        private readonly eventName: string,
        private readonly eventData: any
    ) {}
    
    do(runtime: IScriptRuntime): void {
        runtime.handle({
            name: this.eventName,
            timestamp: new Date(),
            data: this.eventData,
        });
    }
}

// Usage in behaviors
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    return [
        new EmitEventAction('timer:started', {
            blockId: block.key.toString(),
            direction: this.direction,
        }),
    ];
}
```

### Behavior Composition Validation

**Strategy-Level Validation**:

```typescript
export abstract class ValidatedStrategy implements IRuntimeBlockStrategy {
    protected validateBehaviors(behaviors: IRuntimeBehavior[]): void {
        const behaviorTypes = behaviors.map(b => b.constructor.name);
        
        // Check required combinations
        if (behaviorTypes.includes('LazyCompilationBehavior')) {
            if (!behaviorTypes.includes('ChildAdvancementBehavior')) {
                throw new Error(
                    'LazyCompilationBehavior requires ChildAdvancementBehavior'
                );
            }
        }
        
        // Check mutually exclusive behaviors
        const completionBehaviors = behaviors.filter(
            b => b instanceof CompletionBehavior || b instanceof CompletionTrackingBehavior
        );
        if (completionBehaviors.length > 1) {
            throw new Error(
                'Cannot combine multiple completion detection behaviors'
            );
        }
    }
    
    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const behaviors = this.createBehaviors(code, runtime);
        this.validateBehaviors(behaviors);
        // ... continue with block creation
    }
}
```

### Testing Strategy Recommendations

**Behavior Contract Tests**:

Each behavior should have corresponding contract tests validating:

1. **Hook Invocation**: All implemented hooks are called correctly
2. **Memory Lifecycle**: Memory allocated in `onPush` is accessible in `onNext` and finalized in `onPop`
3. **Action Returns**: Returned actions are valid and executable
4. **Dependency Handling**: Missing dependencies fail gracefully or throw explicit errors
5. **State Transitions**: Irreversible state changes (completion flags) behave correctly

Example test structure:
```typescript
describe('BehaviorName Contract', () => {
    describe('onPush()', () => {
        it('should initialize memory with expected values');
        it('should return valid actions');
        it('should emit expected events');
        it('should validate configuration');
    });
    
    describe('onNext()', () => {
        it('should progress through expected states');
        it('should handle completion correctly');
        it('should interact with dependencies correctly');
    });
    
    describe('onPop()', () => {
        it('should finalize memory state');
        it('should clean up resources');
    });
    
    describe('Lifecycle Integration', () => {
        it('should execute push → next → pop sequence');
        it('should handle multiple next() calls');
        it('should maintain consistent memory state');
    });
});
```

## Implementation Alignment Matrix

The following matrix summarizes current behavior implementations and recommended alignment:

| Behavior | onPush | onNext | onPop | Memory Refs | Dependencies | Actions Returned |
|----------|--------|--------|-------|-------------|--------------|------------------|
| **TimerBehavior** | ✅ Init timer | ❌ | ✅ Stop timer | timeSpans, isRunning | None | ✅ EmitEvent |
| **RoundsBehavior** | ✅ Init rounds | ✅ Advance | ❌ | roundsState | None | ✅ EmitEvent |
| **ChildAdvancement** | ❌ | ✅ Advance | ❌ | None | None | ⚠️ None |
| **LazyCompilation** | ❌ | ✅ Compile | ❌ | None | ChildAdvancement | ✅ PushBlock |
| **CompletionBehavior** | ✅ Check | ✅ Check | ❌ | None | None | ✅ EmitEvent |
| **CompletionTracking** | ❌ | ✅ Monitor | ❌ | None | ChildAdvancement | ⚠️ None |
| **ParentContext** | ✅ No-op | ❌ | ❌ | None | None | ⚠️ None |

**Legend**:
- ✅ Implemented correctly
- ❌ Not implemented (by design)
- ⚠️ Potential improvement opportunity

## Conclusion

The `IRuntimeBehavior` architecture demonstrates mature composability patterns with clear separation of concerns across lifecycle phases. The primary opportunities for improvement lie in standardizing memory allocation patterns, formalizing inter-behavior dependencies, and unifying event emission through declarative actions. By adopting the recommended behavior template and strategy-level validation, the system can achieve greater consistency, type safety, and maintainability while preserving the flexibility that makes the behavior pattern effective.

The transition from fallback allocation to constructor-injected memory references represents a critical architectural evolution that eliminates ambiguity in memory ownership and enables proper lifecycle management through `BlockContext.release()`. This pattern should be enforced across all future behavior implementations and backported to existing behaviors during refactoring efforts.
