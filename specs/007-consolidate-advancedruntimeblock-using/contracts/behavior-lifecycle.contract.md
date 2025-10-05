# Behavior Lifecycle Contract

**Entity**: IRuntimeBehavior implementations (ChildAdvancementBehavior, LazyCompilationBehavior, ParentContextBehavior, CompletionTrackingBehavior)

## Contract Specification

### Behavior Initialization

**Endpoint**: Constructor  
**Method**: Constructor-based initialization

**Request Schema**:
```typescript
// ChildAdvancementBehavior
new ChildAdvancementBehavior(children: CodeStatement[])

// LazyCompilationBehavior
new LazyCompilationBehavior(enableCaching?: boolean)

// ParentContextBehavior
new ParentContextBehavior(parentContext?: IRuntimeBlock)

// CompletionTrackingBehavior
new CompletionTrackingBehavior()
```

**Response Schema**: Behavior instance ready for attachment to RuntimeBlock

**Success Criteria**:
- Behavior instance created with valid internal state
- Constructor parameters stored correctly
- No side effects during construction

**Error Cases**:
- Invalid children array (null/undefined where not optional): Throw TypeError
- Invalid parent context (not IRuntimeBlock): Throw TypeError

---

### onPush() Lifecycle Hook

**Endpoint**: `onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`  
**Method**: Lifecycle hook called when block pushed onto runtime stack

**Request Schema**:
```typescript
interface onPushRequest {
    runtime: IScriptRuntime;  // Runtime context with JIT compiler access
    block: IRuntimeBlock;     // The block being pushed
}
```

**Response Schema**:
```typescript
type onPushResponse = IRuntimeAction[];  // Array of actions to execute (can be empty)
```

**Success Criteria**:
- Returns array of actions (empty array if no actions)
- ParentContextBehavior: Initializes parent context access
- Other behaviors: Typically return empty array
- No exceptions thrown

**Error Cases**:
- Invalid runtime context: Throw TypeError
- Invalid block reference: Throw TypeError

**Performance Requirements**: < 1ms execution time

---

### onNext() Lifecycle Hook

**Endpoint**: `onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`  
**Method**: Lifecycle hook called when block advances to next execution step

**Request Schema**:
```typescript
interface onNextRequest {
    runtime: IScriptRuntime;  // Runtime context with JIT compiler access
    block: IRuntimeBlock;     // The block being advanced
}
```

**Response Schema**:
```typescript
type onNextResponse = IRuntimeAction[];  // Array of actions to execute (can be empty)
```

**Success Criteria**:

**ChildAdvancementBehavior**:
- Returns empty array when currentChildIndex >= children.length
- Advances currentChildIndex by 1 when not complete
- Delegates to other behaviors for action generation
- Maintains immutable children array

**LazyCompilationBehavior**:
- Gets current child from ChildAdvancementBehavior context
- Compiles child with runtime.jit.compile()
- Returns [NextAction(compiledBlock)] on success
- Returns [NextAction(ErrorRuntimeBlock)] on compilation failure
- Uses cache if enabled and cache hit

**CompletionTrackingBehavior**:
- Checks ChildAdvancementBehavior completion status
- Updates internal isComplete flag
- Returns empty array

**ParentContextBehavior**:
- Not implemented (no actions in onNext)
- Returns empty array or undefined

**Error Cases**:
- JIT compilation failure: Return NextAction(ErrorRuntimeBlock), do not throw
- Invalid state: Throw Error with descriptive message
- Runtime context missing: Throw TypeError

**Performance Requirements**: < 5ms execution time with all behaviors

---

### onPop() Lifecycle Hook

**Endpoint**: `onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`  
**Method**: Lifecycle hook called when block popped from runtime stack

**Request Schema**:
```typescript
interface onPopRequest {
    runtime: IScriptRuntime;  // Runtime context
    block: IRuntimeBlock;     // The block being popped
}
```

**Response Schema**:
```typescript
type onPopResponse = IRuntimeAction[];  // Array of actions to execute (can be empty)
```

**Success Criteria**:
- Returns array of actions (typically empty for these behaviors)
- No state mutations that would affect future behavior
- Cleanup of temporary resources if needed

**Error Cases**:
- Invalid runtime context: Throw TypeError
- Invalid block reference: Throw TypeError

**Performance Requirements**: < 1ms execution time

---

### onDispose() Lifecycle Hook

**Endpoint**: `onDispose(runtime: IScriptRuntime, block: IRuntimeBlock): void`  
**Method**: Lifecycle hook called when block is being disposed/cleaned up

**Request Schema**:
```typescript
interface onDisposeRequest {
    runtime: IScriptRuntime;  // Runtime context
    block: IRuntimeBlock;     // The block being disposed
}
```

**Response Schema**: void (no return value)

**Success Criteria**:
- All behavior-specific resources released
- LazyCompilationBehavior: Cache cleared if enabled
- No memory leaks
- No exceptions thrown

**Error Cases**:
- Should not throw exceptions (disposal must always succeed)
- Log errors if cleanup fails but continue

**Performance Requirements**: < 50ms execution time

---

## Behavior Composition Contract

### Multiple Behaviors on Single Block

**Endpoint**: RuntimeBlock.next() with multiple behaviors  
**Method**: Aggregate behavior actions

**Request Schema**:
```typescript
interface CompositionRequest {
    behaviors: IRuntimeBehavior[];  // Array of behaviors (2-4 typical)
    runtime: IScriptRuntime;
    block: IRuntimeBlock;
}
```

**Response Schema**:
```typescript
type CompositionResponse = IRuntimeAction[];  // Composed actions from all behaviors
```

**Success Criteria**:
- Behaviors execute in array iteration order (deterministic)
- Actions from all behaviors composed into single array
- Order: ChildAdvancement → LazyCompilation → CompletionTracking → ParentContext
- Each behavior receives same runtime and block context
- Early returns respected (if behavior returns actions, subsequent behaviors still execute)

**Error Cases**:
- Any behavior throws: Propagate exception immediately
- Invalid behavior in array: Throw TypeError

**Performance Requirements**: < 5ms total execution time for full stack

---

## State Management Contract

### Behavior Instance State

**Success Criteria**:
- Each behavior maintains private instance variables
- State persists across multiple lifecycle calls
- State immutable from external callers (private fields)
- Read-only access through public methods

**Example**:
```typescript
// ChildAdvancementBehavior state
private currentChildIndex: number = 0;
getCurrentChildIndex(): number; // Read-only access
```

### Shared State via RuntimeBlock Memory

**Success Criteria**:
- Behaviors can access shared state through block.getMemory<T>() and block.setMemory<T>()
- Memory references type-safe with generics
- Multiple behaviors can coordinate through shared memory keys
- Memory cleaned up on block disposal

**Example**:
```typescript
// Shared timer state
const timer = block.getMemory<number>('timer') ?? 0;
block.setMemory('timer', timer + deltaTime);
```

---

## Feature Parity Contract

### AdvancedRuntimeBlock Equivalence

**Success Criteria**:
All existing AdvancedRuntimeBlock functionality must be reproducible with behavior composition:

1. **Sequential child advancement**: ChildAdvancementBehavior
2. **Lazy JIT compilation**: LazyCompilationBehavior
3. **Parent context awareness**: ParentContextBehavior
4. **Completion tracking**: CompletionTrackingBehavior
5. **Error handling**: ErrorRuntimeBlock on compilation failure

**Validation Method**:
- Run all existing AdvancedRuntimeBlock contract tests against behavior-based implementation
- 100% test pass rate required
- Zero behavioral differences in workout execution

---

## Contract Test Requirements

Each contract must have failing tests before implementation:

### Test Files
```
tests/runtime/contract/behaviors/
├── child-advancement.contract.ts
├── lazy-compilation.contract.ts
├── parent-context.contract.ts
├── completion-tracking.contract.ts
├── behavior-composition.contract.ts
└── feature-parity.contract.ts
```

### Test Coverage
- Each lifecycle method (onPush/onNext/onPop/onDispose)
- Success cases and error cases
- Performance requirements
- State management
- Behavior composition
- Feature parity with AdvancedRuntimeBlock

### Test Execution
- All contract tests must fail initially (no implementation)
- Tests pass after implementation
- Tests serve as regression prevention
- Tests validate performance requirements
