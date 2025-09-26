# WOD Wiki Runtime API Documentation

## Overview

The WOD Wiki Runtime API provides a stack-based execution environment for workout scripts. This document describes the enhanced runtime stack with constructor-based initialization and consumer-managed disposal patterns.

## Architecture

### RuntimeStack Class

The `RuntimeStack` is the core component managing the execution flow of workout blocks.

```typescript
class RuntimeStack {
  push(block: IRuntimeBlock): void;
  pop(): IRuntimeBlock | undefined;
  current(): IRuntimeBlock | undefined;
  graph(): IRuntimeBlock[];
}
```

### IRuntimeBlock Interface

Runtime blocks represent executable components within workout scripts.

```typescript
interface IRuntimeBlock {
  readonly key: BlockKey;
  readonly sourceId: number[];
  
  // Core lifecycle methods
  push(): IRuntimeAction[];
  next(): IRuntimeAction[];
  pop(): IRuntimeAction[];
  dispose(): void;
  
  // Optional lifecycle methods
  initialize?(current?: IRuntimeBlock): void;
  cleanup?(): void;
}
```

## Lifecycle Management

### 1. Constructor-Based Initialization Pattern

**Preferred approach** for block initialization:

```typescript
// Block initialization happens during construction
const timerBlock = new TimerBlock({
  duration: Duration.seconds(30),
  label: "Rest Period"
});

// Push adds block to stack without lifecycle calls
stack.push(timerBlock);
```

**Benefits:**
- Better performance (no method call overhead)
- Cleaner separation of concerns
- Explicit dependency management
- Easier to test and debug

**Implementation Details:**
- `RuntimeStack.push()` adds block immediately
- No `initialize()` method calls during push
- Block constructor handles all setup logic
- Supports dependency injection patterns

### 2. Consumer-Managed Disposal Pattern

**Required approach** for resource cleanup:

```typescript
// Pop returns block without cleanup
const completedBlock = stack.pop();

if (completedBlock) {
  // Consumer must dispose of resources
  completedBlock.dispose();
}
```

**Benefits:**
- Explicit resource management
- Prevents memory leaks
- Clear ownership semantics
- Better error handling control

**Implementation Details:**
- `RuntimeStack.pop()` returns block without calling cleanup methods
- Consumer must call `dispose()` on returned blocks
- Optional `cleanup()` method called before `dispose()` if present
- Disposal should complete within 50ms for performance

## API Reference

### RuntimeStack Methods

#### `push(block: IRuntimeBlock): void`

Adds a block to the top of the execution stack.

**Parameters:**
- `block` - The runtime block to add

**Behavior:**
- Adds block to top of internal stack
- Updates current block reference
- Does NOT call initialization methods
- Logs operation for debugging

**Performance:** < 1ms for typical operations

**Example:**
```typescript
const block = new WorkoutBlock(config);
stack.push(block);
console.log(stack.current()?.key); // block.key
```

#### `pop(): IRuntimeBlock | undefined`

Removes and returns the top block from the stack.

**Returns:** 
- Top block if stack is not empty
- `undefined` if stack is empty

**Behavior:**
- Removes top block from internal stack
- Updates current block to previous block
- Does NOT call cleanup methods
- Returns block for consumer disposal

**Performance:** < 1ms for typical operations

**Example:**
```typescript
const block = stack.pop();
if (block) {
  // Consumer responsibility
  block.dispose();
}
```

#### `current(): IRuntimeBlock | undefined`

Returns the current top block without modifying the stack.

**Returns:**
- Current top block if stack is not empty
- `undefined` if stack is empty

**Behavior:**
- Read-only operation
- No side effects
- Idempotent operation
- Safe for concurrent access

**Performance:** < 0.1ms

**Example:**
```typescript
const current = stack.current();
if (current) {
  console.log(`Current: ${current.key}`);
}
```

#### `graph(): IRuntimeBlock[]`

Returns a top-first ordered array of all blocks in the stack.

**Returns:** Array of blocks ordered from top to bottom

**Behavior:**
- Creates new array (not reference to internal storage)
- Top block is at index 0
- Bottom block is at index length-1
- Empty array for empty stack

**Performance:** < 5ms for stacks up to 100 blocks

**Example:**
```typescript
const blocks = stack.graph();
console.log(`Stack depth: ${blocks.length}`);
console.log(`Top block: ${blocks[0]?.key}`);
console.log(`Bottom block: ${blocks[blocks.length - 1]?.key}`);
```

### IRuntimeBlock Methods

#### `dispose(): void`

Cleans up resources held by the block.

**Requirements:**
- MUST be called by consumer after popping
- Should complete within 50ms
- Must handle multiple calls safely
- Should never throw exceptions

**Example:**
```typescript
class MyRuntimeBlock implements IRuntimeBlock {
  private resources: Resource[] = [];
  
  dispose(): void {
    try {
      this.resources.forEach(r => r.close());
      this.resources.length = 0;
    } catch (error) {
      console.warn('Disposal error:', error);
    }
  }
}
```

#### `initialize?(current?: IRuntimeBlock): void` (Optional)

Optional initialization for advanced lifecycle scenarios.

**Parameters:**
- `current` - Currently active block (if any)

**Use Cases:**
- Setting up relationships between blocks
- Runtime context initialization
- Advanced dependency resolution

**Example:**
```typescript
initialize(current?: IRuntimeBlock): void {
  if (current?.key.includes('timer')) {
    this.inheritTimerState(current);
  }
}
```

#### `cleanup?(): void` (Optional)

Optional cleanup before disposal.

**Use Cases:**
- Saving final state
- Notifying dependent blocks
- Graceful shutdown procedures

**Example:**
```typescript
cleanup(): void {
  this.saveResults();
  this.notifyCompletion();
}
```

## Performance Guidelines

### Timing Requirements

All stack operations must meet these performance targets:

- `push()`: < 1ms
- `pop()`: < 1ms
- `current()`: < 0.1ms
- `graph()`: < 5ms (for stacks ≤ 100 blocks)
- `dispose()`: < 50ms

### Memory Management

- Blocks should minimize memory footprint during execution
- Dispose of large objects promptly in `dispose()`
- Avoid circular references between blocks
- Use weak references for optional relationships

### Error Handling

- `dispose()` and `cleanup()` methods should never throw
- Handle all errors internally and log warnings
- Provide meaningful error messages for debugging
- Use defensive programming practices

## Migration Guide

### From Legacy Lifecycle Pattern

**Old Pattern (Deprecated):**
```typescript
// Stack managed initialization
stack.push(block); // Called block.initialize()

// Stack managed cleanup
const block = stack.pop(); // Called block.cleanup()
```

**New Pattern (Current):**
```typescript
// Constructor-based initialization
const block = new MyBlock(config); // Initialization here
stack.push(block); // Just adds to stack

// Consumer-managed disposal
const block = stack.pop(); // Just removes from stack
if (block) {
  block.dispose(); // Consumer responsibility
}
```

### Benefits of Migration

1. **Performance**: Eliminates method call overhead in hot paths
2. **Clarity**: Explicit resource ownership
3. **Testing**: Easier to unit test lifecycle logic
4. **Debugging**: Clearer stack traces and error handling

## Best Practices

### Block Implementation

1. **Initialize in Constructor**
   ```typescript
   constructor(config: BlockConfig) {
     this.setupResources(config);
     this.validateInputs(config);
   }
   ```

2. **Implement Robust Disposal**
   ```typescript
   dispose(): void {
     try {
       this.closeConnections();
       this.clearCaches();
       this.disposed = true;
     } catch (error) {
       console.warn('Disposal failed:', error);
     }
   }
   ```

3. **Handle Multiple Dispose Calls**
   ```typescript
   dispose(): void {
     if (this.disposed) return;
     // ... cleanup logic
     this.disposed = true;
   }
   ```

### Consumer Code

1. **Always Dispose Popped Blocks**
   ```typescript
   const block = stack.pop();
   if (block) {
     try {
       block.dispose();
     } catch (error) {
       console.error('Disposal error:', error);
     }
   }
   ```

2. **Use Helper Methods**
   ```typescript
   // ScriptRuntime provides helper methods
   runtime.popAndDispose(); // Handles disposal automatically
   runtime.disposeAllBlocks(); // Cleans up entire stack
   ```

## Debugging and Monitoring

### Logging

The runtime stack provides comprehensive logging:

```typescript
// Enable debug logging
console.log = (...args) => { /* your logger */ };

// Stack operations are logged with:
// - Operation type (push/pop/graph)
// - Block identifiers
// - Stack depth changes
// - Performance metrics
```

### Common Issues

1. **Memory Leaks**: Forgetting to call `dispose()`
2. **Performance Issues**: Slow `dispose()` methods
3. **State Issues**: Accessing disposed blocks
4. **Stack Overflow**: Infinite push cycles

### Debugging Tools

Use the `graph()` method for stack inspection:

```typescript
const blocks = stack.graph();
console.log('Current Stack:', blocks.map(b => b.key));
```

## Examples

### Complete Lifecycle Example

```typescript
// 1. Create and configure block
const timerBlock = new TimerRuntimeBlock({
  duration: Duration.minutes(5),
  onComplete: () => console.log('Timer finished')
});

// 2. Push to stack (constructor-based initialization)
stack.push(timerBlock);

// 3. Execute block logic
const actions = timerBlock.push();
runtime.execute(actions);

// 4. Pop and dispose (consumer-managed disposal)
const completedBlock = stack.pop();
if (completedBlock) {
  completedBlock.dispose();
}
```

### Error Handling Example

```typescript
class RobustRuntimeBlock implements IRuntimeBlock {
  private disposed = false;
  
  dispose(): void {
    if (this.disposed) {
      console.warn('Block already disposed:', this.key);
      return;
    }
    
    try {
      this.cleanupResources();
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      this.disposed = true;
    }
  }
  
  private cleanupResources(): void {
    // Resource cleanup logic
  }
}
```

---

**Last Updated**: December 2024  
**Version**: 2.0 (Enhanced Lifecycle Patterns)  
**Status**: Current Implementation