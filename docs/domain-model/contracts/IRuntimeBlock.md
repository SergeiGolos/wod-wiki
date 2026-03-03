# IRuntimeBlock

> Runtime block with behavior composition, list-based memory, and lifecycle management

## Definition

```typescript
interface IRuntimeBlock {
    // ═══════════════════════════════════════════════════════════════════
    // Identity
    // ═══════════════════════════════════════════════════════════════════
    
    /** Execution timing metadata (start/completion timestamps) */
    executionTiming?: BlockLifecycleOptions;
    
    /** Unique identifier for this block instance */
    readonly key: BlockKey;
    
    /** Source code location identifiers */
    readonly sourceIds: number[];
    
    /** Type discriminator (Timer, Rounds, Effort, etc.) */
    readonly blockType?: string;
    
    /** Human-readable label (from fragment:display memory or blockType) */
    readonly label: string;
    
    /** Execution context managing memory allocation and cleanup */
    readonly context: IBlockContext;

    // ═══════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════
    
    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];
    next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];
    unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];
    dispose(runtime: IScriptRuntime): void;

    // ═══════════════════════════════════════════════════════════════════
    // Behaviors
    // ═══════════════════════════════════════════════════════════════════
    
    /** Get a specific behavior by type */
    getBehavior<T extends IRuntimeBehavior>(
        behaviorType: new (...args: any[]) => T
    ): T | undefined;
    
    /** Read-only list of all attached behaviors */
    readonly behaviors: readonly IRuntimeBehavior[];

    // ═══════════════════════════════════════════════════════════════════
    // List-Based Memory API
    // ═══════════════════════════════════════════════════════════════════
    
    /** Push a new memory location onto the block's memory list */
    pushMemory(location: IMemoryLocation): void;
    
    /** Get all memory locations matching the given tag */
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];
    
    /** Get all memory locations owned by this block */
    getAllMemory(): IMemoryLocation[];
    
    /** Get fragment memory locations by visibility tier */
    getFragmentMemoryByVisibility(visibility: FragmentVisibility): IMemoryLocation[];

    // ═══════════════════════════════════════════════════════════════════
    // Completion
    // ═══════════════════════════════════════════════════════════════════
    
    /** Whether this block has completed execution */
    readonly isComplete: boolean;
    
    /** Reason for completion (set by markComplete) */
    readonly completionReason?: string;
    
    /** Mark the block as complete (idempotent) */
    markComplete(reason?: string): void;

    // ═══════════════════════════════════════════════════════════════════
    // Backward-Compatible Memory API (deprecated)
    // ═══════════════════════════════════════════════════════════════════
    
    /** @deprecated Use getMemoryByTag() instead */
    getMemory<T extends MemoryType>(type: T): IMemoryEntryShim<MemoryValueOf<T>> | undefined;
    
    /** @deprecated Use getMemoryByTag().length > 0 instead */
    hasMemory(type: MemoryType): boolean;
    
    /** @deprecated Use pushMemory() or BehaviorContext API instead */
    setMemoryValue<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void;
}
```

## Supporting Types

```typescript
interface BlockLifecycleOptions {
    startTime?: Date;
    completedAt?: Date;
    now?: Date;
    clock?: IRuntimeClock;  // Snapshot clock for consistent timing in chains
}

/** Backward-compatible memory entry shape */
interface IMemoryEntryShim<V = unknown> {
    readonly value: V;
    subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void;
}
```

## Lifecycle

All lifecycle methods receive `IScriptRuntime` and optional `BlockLifecycleOptions`:

| Method | When Called | Purpose |
|--------|------------|---------|
| `mount` | Block pushed onto stack | Initialize state, register events, emit initial outputs |
| `next` | Child completes, user advance, timer triggers | Advance state, push next child, check completion |
| `unmount` | Block popped from stack | Emit completion outputs, close spans |
| `dispose` | After unmount | Final cleanup, release resources |

```
push(block) → block.mount(runtime, { startTime })
                     ↓
              block.next(runtime)  ← child pops / user advance
                     ↓
pop(block)  → block.unmount(runtime, { completedAt })
              block.dispose(runtime)
```

## Memory System

Blocks use a **list-based memory** system where all values are `ICodeFragment[]`.
Multiple locations with the same tag can coexist (e.g., multiple display rows).

```typescript
// Push memory (typically done by behaviors via ctx.pushMemory)
block.pushMemory(new MemoryLocation('fragment:display', [timerFrag, actionFrag]));

// Read memory by tag
const timerLocs = block.getMemoryByTag('time');
const fragments = timerLocs[0]?.fragments ?? [];

// Get display-visible fragment memory
const displayLocs = block.getFragmentMemoryByVisibility('display');

// Get all memory
const all = block.getAllMemory();
```

### Fragment Visibility Tiers

Fragment memory tags (`fragment:*`) are classified into visibility tiers:

| Tier | Tags | Purpose |
|------|------|---------|
| `display` | `fragment:display` | Shown on UI cards |
| `result` | `fragment:result` | Collected on block pop |
| `promote` | `fragment:promote`, `fragment:rep-target` | Inherited by child blocks |
| `private` | `fragment:tracked`, `fragment:label` | Internal behavior state |

## UI Integration

UI components observe block memory via subscriptions:

```typescript
function TimerDisplay({ block }: { block: IRuntimeBlock }) {
  const [fragments, setFragments] = useState<ICodeFragment[]>([]);
  
  useEffect(() => {
    const timerLocs = block.getMemoryByTag('time');
    if (timerLocs.length === 0) return;
    
    setFragments(timerLocs[0].fragments);
    return timerLocs[0].subscribe((newFrags) => {
      setFragments(newFrags);
    });
  }, [block]);
  
  const duration = fragments.find(f => f.fragmentType === FragmentType.Duration);
  return <span>{duration?.image ?? '--:--'}</span>;
}
```

## Testing

Use `BehaviorTestHarness` and `MockBlock` from `tests/harness/`:

```typescript
describe('ExitBehavior', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should pop block when marked complete', () => {
    const block = new MockBlock('timer', [
      new CountdownTimerBehavior(),
      new ExitBehavior()
    ]);
    
    harness.push(block);
    harness.mount();
    block.state.isComplete = true;
    harness.next();
    
    // ExitBehavior should have produced a pop action
  });
});
```

## Related Files

- [[IBehaviorContext]] - Context for behavior interaction
- [[IRuntimeBehavior]] - Behavior lifecycle hooks
- [[02-compiler-layer|Compiler Layer]] (producer)
- [[03-runtime-layer|Runtime Layer]] (executor)
- [[05-ui-layer|UI Layer]] (consumer)

## Source Files

- `src/runtime/contracts/IRuntimeBlock.ts`
- `src/runtime/contracts/IBlockContext.ts`
- `src/runtime/memory/MemoryLocation.ts`
- `src/runtime/memory/MemoryTypes.ts`
