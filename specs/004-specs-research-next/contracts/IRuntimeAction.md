# Interface Contract: IRuntimeAction

**File**: `src/runtime/IRuntimeAction.ts`
**Purpose**: Defines the standard interface for runtime actions

## Interface Definition

```typescript
export interface IRuntimeAction {
  type: string;
  do(runtime: IScriptRuntime): void;
}
```

## Implementation Requirements

### NextAction Implementation
```typescript
export class NextAction implements IRuntimeAction {
  readonly type = 'next';

  do(runtime: IScriptRuntime): void {
    // Validate runtime state
    if (!this.validateRuntimeState(runtime)) {
      console.error('NextAction: Invalid runtime state');
      return;
    }

    // Get current block
    const currentBlock = runtime.stack.current;
    if (!currentBlock) {
      console.log('NextAction: No current block to advance from');
      return;
    }

    try {
      // Execute block's next logic
      console.log(`NextAction: Advancing from block ${currentBlock.key.toString()}`);
      const nextActions = currentBlock.next();

      // Execute all returned actions
      for (const action of nextActions) {
        action.do(runtime);
      }

      console.log(`NextAction: Completed, new stack depth: ${runtime.stack.blocks.length}`);
    } catch (error) {
      console.error('NextAction: Error during execution advancement', error);
      runtime.setError(error);
    }
  }

  private validateRuntimeState(runtime: IScriptRuntime): boolean {
    return runtime.stack !== undefined &&
           runtime.memory !== undefined &&
           !runtime.hasErrors();
  }
}
```

## Contract Constraints

### Required Properties
- `type`: Must be 'next' for NextAction instances
- `do`: Must accept IScriptRuntime and execute action

### Action Behavior Requirements
- Must validate runtime state before execution
- Must handle missing current block gracefully
- Must execute block.next() method
- Must execute all returned actions sequentially
- Must handle all exceptions gracefully

### Error Handling Requirements
- Must log execution errors
- Must set error state in runtime when appropriate
- Must not throw exceptions that crash the runtime
- Must provide meaningful error messages

### Performance Requirements
- Action execution must complete in <50ms
- Memory allocation must be minimal
- No blocking operations allowed

## Usage Pattern

```typescript
// Action creation (typically done by handler)
const action = new NextAction();

// Action execution (typically done by runtime)
action.do(runtime);

// Action chaining (when block.next() returns multiple actions)
const nextActions = currentBlock.next();
for (const action of nextActions) {
  action.do(runtime);
}
```

## Testing Requirements

### Unit Tests
- Test action creation and type property
- Test runtime state validation
- Test normal execution flow
- Test error handling scenarios
- Test missing current block handling
- Test action chaining behavior

### Integration Tests
- Test action execution through runtime
- Test action interaction with different block types
- Test error propagation and recovery
- Test performance under load

## Edge Cases to Handle

### Invalid Runtime States
- No current block available
- Runtime in error state
- Memory corruption detected
- Stack in inconsistent state

### Block Execution Errors
- Block.next() throws exception
- Block returns invalid actions
- Block modifies runtime unexpectedly
- Block disposal fails

### Performance Edge Cases
- Large number of actions returned
- Nested action execution
- Memory pressure situations
- Concurrency issues