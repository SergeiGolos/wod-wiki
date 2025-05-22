# Runtime Actions Architecture

## Abstract Action Hierarchy

The action system has been refactored to provide a consistent way to apply actions to runtime blocks.

### AbstractRuntimeAction

Base abstract class that implements the `IRuntimeAction` interface and defines the template pattern for actions:

```typescript
export abstract class AbstractRuntimeAction implements IRuntimeAction {
  abstract name: string;
  
  apply(runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>): void {
    this.applyImplementation(runtime);
  }
  
  protected abstract applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void;
  protected abstract applyImplementation(runtime: ITimerRuntime): void;
}
```

### LeafNodeAction

For actions that operate on the current block only:

```typescript
export abstract class LeafNodeAction extends AbstractRuntimeAction {
  protected applyImplementation(runtime: ITimerRuntime): void {
    const currentBlock = runtime.trace.current();
    if (currentBlock) {
      this.applyBlock(runtime, currentBlock);
    }
  }
  
  protected abstract applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void;
}
```

### BubbleUpAction

For actions that need to propagate up the block hierarchy:

```typescript
export abstract class BubbleUpAction extends AbstractRuntimeAction {
  protected applyImplementation(runtime: ITimerRuntime): void {
    let currentBlock = runtime.trace.current();
    while (currentBlock) {
      this.applyBlock(runtime, currentBlock);
      currentBlock = currentBlock.parent;
    }
  }
  
  protected abstract applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void;
}
```

## Action Categories

1. **Leaf Node Actions** - Actions that operate only on the current block:
   - UpdateMetricsAction
   - PushNextAction
   - CompleteTimerAction
   
2. **Bubble Up Actions** - Actions that propagate up the block hierarchy:
   - StartTimerAction
   - StopTimerAction
   - GotoEndAction
   
3. **Runtime-Specific Actions** - Actions that operate on the runtime directly:
   - PopBlockAction
   - ResetAction
   - etc.

## Usage

When implementing a new action, decide which category it falls into:

1. If it acts only on the current block, extend `LeafNodeAction`
2. If it should propagate up the block hierarchy, extend `BubbleUpAction`
3. If it performs operations on the runtime directly, implement `IRuntimeAction` directly

This architecture allows for consistent handling of actions in the runtime system while providing clear patterns for different action behaviors.