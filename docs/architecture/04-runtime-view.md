# Runtime View

> **Status**: Draft
> **Last Updated**: 2026-02-14
> **Category**: Architecture Documentation
> **arc42 Section**: 4

## Overview

This document describes the dynamic behavior of the WOD Wiki system through runtime scenarios. It shows how components interact during key operations.

## Runtime Scenarios

### Scenario 1: Parse and Compile Workflow

**Goal**: Transform workout script text into executable runtime blocks.

**Actors**:
- User (provides workout script)
- Parser (Chevrotain-based)
- Compiler (JIT with strategies)
- RuntimeStack (execution environment)

**Sequence**:

```
User                Parser            Compiler          RuntimeStack
 │                    │                  │                   │
 ├─ input script ────▶│                  │                   │
 │                    │                  │                   │
 │                    ├─ tokenize ◀─────┤                   │
 │                    ├─ parse ◀────────┤                   │
 │                    │                  │                   │
 │                    ├─ AST ───────────▶│                   │
 │                    │                  │                   │
 │                    │                  ├─ for each stmt   │
 │                    │                  │   ├─ find strategy│
 │                    │                  │   ├─ compile()    │
 │                    │                  │   ├─ build block  │
 │                    │                  │   └─ push() ─────▶│
 │                    │                  │                   │
 │◀──── compiled ─────┴──────────────────┴───────────────────┘
```

**Steps**:

1. **User Input**: User writes workout script in editor
   ```typescript
   const script = `
   10:00 Run
   3 Rounds:
     10 Pushups
     20 Air Squats
   `;
   ```

2. **Tokenization**: Parser creates token stream
   ```typescript
   // Lexer output
   [
     { type: 'Timer', value: '10:00' },
     { type: 'Exercise', value: 'Run' },
     { type: 'Rep', value: '3' },
     { type: 'Keyword', value: 'Rounds' },
     // ...
   ]
   ```

3. **Parsing**: Parser creates AST
   ```typescript
   // Parser output
   const ast: ICodeStatement[] = [
     {
       id: 'stmt-1',
       type: 'timer',
       fragments: [{ type: 'timer', duration: 600000 }],
     },
     {
       id: 'stmt-2',
       type: 'rounds',
       fragments: [{ type: 'round', count: 3 }],
       children: [
         { id: 'stmt-3', type: 'rep', fragments: [...] },
         { id: 'stmt-4', type: 'rep', fragments: [...] },
       ],
     },
   ];
   ```

4. **Strategy Selection**: Compiler finds appropriate strategy
   ```typescript
   for (const stmt of ast) {
     const strategy = strategies.find(s => s.canHandle(stmt));
     const block = strategy.compile(stmt, context);
     stack.push(block);
   }
   ```

5. **Block Construction**: BlockBuilder creates runtime block
   ```typescript
   const block = new BlockBuilder(stmt.id)
     .asTimer('up')
     .withState({ targetMs: 600000 })
     .build();
   ```

6. **Stack Push**: Block added to runtime stack
   ```typescript
   stack.push(block);
   // Block already initialized via constructor
   ```

**Performance**:
- Tokenization: ~10ms for 100 lines
- Parsing: ~20ms for 100 lines
- Compilation: ~50ms for 50 blocks
- **Total**: < 100ms for typical workouts

### Scenario 2: Block Lifecycle Execution

**Goal**: Execute a runtime block from mount to disposal.

**Sequence**:

```
RuntimeStack      RuntimeBlock      Behaviors         Memory
    │                 │                 │                │
    ├─ current() ────▶│                 │                │
    │                 │                 │                │
    ├─ mount() ───────▶                 │                │
    │                 ├─ for each behavior               │
    │                 ├─ onMount(ctx) ─▶│                │
    │                 │                 ├─ pushMemory() ▶│
    │                 │                 │                ├─ create location
    │                 │                 │                ├─ return location
    │                 │                 │◀───────────────┤
    │                 │                 ├─ emit(event)   │
    │                 │                 │                │
    │                 │                 │                │
    ├─ next() ────────▶                 │                │
    │                 ├─ for each behavior               │
    │                 ├─ onNext(ctx) ──▶│                │
    │                 │                 ├─ updateMemory()▶│
    │                 │                 │                ├─ notify subscribers
    │                 │                 │                │
    │                 │                 │                │
    ├─ unmount() ─────▶                 │                │
    │                 ├─ for each behavior               │
    │                 ├─ onUnmount(ctx)▶│                │
    │                 │                 ├─ cleanup       │
    │                 │                 │                │
    │                 │                 │                │
    ├─ pop() ─────────▶                 │                │
    │                 │                 │                │
    ├─ dispose() ─────▶                 │                │
    │                 ├─ dispose locations               ▶│
    │                 │                 │                ├─ notify([])
    │                 │                 │                │
    │                 ├─ clear behaviors                 │
    │                 │                 │                │
```

**Steps**:

1. **Mount**: Initialize block
   ```typescript
   const block = stack.current();
   block.mount();

   // Each behavior initializes
   for (const behavior of block.behaviors) {
     behavior.onMount(ctx);
   }
   ```

2. **Execute**: Run block logic
   ```typescript
   block.next();

   // Each behavior updates
   for (const behavior of block.behaviors) {
     behavior.onNext(ctx);
   }
   ```

3. **Complete**: Mark as done
   ```typescript
   if (block.state.isComplete) {
     block.unmount();
   }
   ```

4. **Unmount**: Cleanup block
   ```typescript
   for (const behavior of block.behaviors) {
     behavior.onUnmount(ctx);
   }
   ```

5. **Pop**: Remove from stack
   ```typescript
   const block = stack.pop();
   ```

6. **Dispose**: Release resources
   ```typescript
   block.dispose();
   // Notifies memory subscribers with []
   // Clears behavior references
   ```

**Timing**:
- mount(): ~5ms (behavior initialization)
- next(): ~2ms (update logic)
- unmount(): ~3ms (cleanup)
- dispose(): ~30ms (memory cleanup)

### Scenario 3: Child Block Execution

**Goal**: Execute nested workout blocks (e.g., rounds with children).

**Sequence**:

```
Container Block    ChildRunnerBehavior    Child Block
       │                   │                    │
       ├─ mount() ─────────▶                    │
       │                   ├─ init child index  │
       │                   │                    │
       ├─ next() ──────────▶                    │
       │                   ├─ get current child │
       │                   ├─ push child ──────▶│
       │                   │                    ├─ mount()
       │                   │                    │
       ├─ next() ──────────▶                    │
       │                   ├─ current child next()
       │                   │                    ├─ next()
       │                   │                    │
       │                   ├─ child complete?   │
       │                   │                    ├─ isComplete = true
       │                   │                    │
       │                   ├─ pop child ────────┤
       │                   │                    ├─ unmount()
       │                   │                    ├─ dispose()
       │                   │                    │
       │                   ├─ advance index     │
       │                   ├─ more children?    │
       │                   │                    │
       ├─ isComplete ◀─────┤ (all done)         │
       │                   │                    │
```

**Key Behaviors**:
- **ChildLoopBehavior**: Resets child index for each iteration
- **ChildRunnerBehavior**: Manages child execution
- **Ordering**: ChildLoopBehavior MUST run before ChildRunnerBehavior

**Example**:
```typescript
// Container: 3 Rounds
const container = new BlockBuilder('rounds-3')
  .withState({ rounds: 3 })
  .asRepeater(3)
  .asContainer()  // Adds ChildLoopBehavior, ChildRunnerBehavior
  .build();

// On each round:
// 1. ChildLoopBehavior resets childIndex to 0
// 2. ChildRunnerBehavior pushes first child
// 3. Child executes
// 4. Child completes and is popped
// 5. ChildRunnerBehavior pushes next child
// 6. Repeat until all children done
// 7. RoundBehavior increments round counter
// 8. Repeat rounds
```

### Scenario 4: Memory Subscription Flow

**Goal**: React component subscribes to runtime memory updates.

**Sequence**:

```
React Component    MemoryLocation    Behavior
       │                │                │
       ├─ useEffect ────┤                │
       ├─ subscribe() ──▶                │
       │                ├─ add callback  │
       │                │                │
       │                │                ├─ updateMemory()
       │                │                │
       │                ├─ notify ◀──────┤
       │                │   subscribers  │
       │                │                │
       │◀─ callback() ──┤                │
       ├─ setState()    │                │
       │                │                │
       │                │                │
       ├─ unmount ──────┤                │
       │                │                ├─ dispose()
       │                │                │
       │◀─ callback([]) ┤                │
       ├─ setState([])  │                │
       │                │                │
       ├─ unsubscribe() ▶                │
       │                ├─ remove callback│
       │                │                │
```

**React Hook Example**:
```typescript
function useBlockMemory(block: IRuntimeBlock, tag: MemoryTag) {
  const [fragments, setFragments] = useState<ICodeFragment[]>([]);

  useEffect(() => {
    const location = block.getMemory(tag);
    if (!location) return;

    // Subscribe to updates
    const unsubscribe = location.subscribe((frags) => {
      setFragments(frags);
    });

    // Initial state
    setFragments(location.fragments);

    // Cleanup
    return unsubscribe;
  }, [block, tag]);

  return fragments;
}
```

**Benefits**:
- Automatic React re-renders on memory updates
- Cleanup handled by effect
- No manual event listeners

### Scenario 5: Timer Countdown Execution

**Goal**: Execute a countdown timer (e.g., "10:00 AMRAP").

**Sequence**:

```
Time: 0:00         Time: 5:30         Time: 10:00
   │                   │                   │
   ├─ mount()          │                   │
   │  ├─ startTime     │                   │
   │                   │                   │
   ├─ next()           ├─ next()           ├─ next()
   │  ├─ elapsed: 0    │  ├─ elapsed: 5:30 │  ├─ elapsed: 10:00
   │  ├─ remaining:10  │  ├─ remaining:4:30│  ├─ remaining: 0
   │  ├─ update()      │  ├─ update()      │  ├─ update()
   │                   │                   │  ├─ isComplete = true
   │                   │                   │
   │                   │                   ├─ unmount()
```

**Behavior Implementation**:
```typescript
class TimerBehavior implements IRuntimeBehavior {
  private startTime: number | null = null;

  onMount(ctx: IBehaviorContext): void {
    this.startTime = ctx.clock.now().getTime();
  }

  onNext(ctx: IBehaviorContext): void {
    const elapsed = ctx.clock.now().getTime() - this.startTime!;
    const targetMs = ctx.block.state.targetMs || Infinity;
    const remaining = Math.max(0, targetMs - elapsed);

    // Update timer memory
    ctx.updateMemory('timer', [{
      type: FragmentType.Timer,
      elapsedMs: elapsed,
      remainingMs: remaining,
      direction: 'down',
    }]);

    // Check completion
    if (remaining === 0) {
      ctx.block.state.isComplete = true;
    }
  }

  onUnmount(ctx: IBehaviorContext): void {
    this.startTime = null;
  }
}
```

### Scenario 6: Error Handling

**Goal**: Handle errors during compilation and execution.

**Sequence**:

```
Compiler          Strategy         RuntimeBlock      ErrorHandler
   │                 │                   │                │
   ├─ compile()      │                   │                │
   ├─ canHandle() ───▶                   │                │
   │                 ├─ return false     │                │
   │                 │                   │                │
   ├─ no strategy ───┴──────────────────▶│                │
   ├─ throw error ───────────────────────┴───────────────▶│
   │                                                       ├─ log error
   │                                                       ├─ show user
   │                                                       │
   │                                                       │
   ├─ mount() ───────────────────────────▶                │
   │                                     ├─ behavior throws│
   │                                     ├─ catch ────────▶│
   │                                                       ├─ log error
   │                                                       ├─ continue
```

**Error Types**:

1. **Syntax Errors** (Parser)
   ```typescript
   try {
     const statements = parseWorkoutScript(script);
   } catch (error) {
     console.error('Parse error:', error);
     // Show error in editor
   }
   ```

2. **Compilation Errors** (Compiler)
   ```typescript
   const strategy = strategies.find(s => s.canHandle(stmt));
   if (!strategy) {
     throw new Error(`No strategy for statement type: ${stmt.type}`);
   }
   ```

3. **Runtime Errors** (Execution)
   ```typescript
   try {
     behavior.onNext(ctx);
   } catch (error) {
     console.error('Behavior error:', error);
     // Continue with other behaviors
   }
   ```

4. **Disposal Errors** (Cleanup)
   ```typescript
   try {
     block.dispose();
   } catch (error) {
     console.error('Disposal error:', error);
     // Already disposed or invalid state
   }
   ```

## Performance Characteristics

### Compilation Performance

| Workout Size | Parse Time | Compile Time | Total |
|--------------|------------|--------------|-------|
| 10 lines | ~5ms | ~10ms | ~15ms |
| 50 lines | ~15ms | ~40ms | ~55ms |
| 100 lines | ~30ms | ~80ms | ~110ms |

### Execution Performance

| Operation | Target | Typical | Notes |
|-----------|--------|---------|-------|
| Block mount | < 10ms | ~5ms | Init behaviors |
| Block next | < 5ms | ~2ms | Update logic |
| Block unmount | < 10ms | ~3ms | Cleanup |
| Stack push | < 1ms | ~0.5ms | Array operation |
| Stack pop | < 1ms | ~0.5ms | Array operation |
| Stack current | < 0.1ms | ~0.05ms | Simple access |
| Memory update | < 5ms | ~2ms | Notify subscribers |
| Block dispose | < 50ms | ~30ms | Full cleanup |

### Memory Performance

| Operation | Target | Notes |
|-----------|--------|-------|
| pushMemory() | < 1ms | Create location |
| updateMemory() | < 5ms | Notify subscribers |
| subscribe() | < 1ms | Add callback |
| unsubscribe() | < 1ms | Remove callback |
| dispose() | < 10ms | Notify all subscribers |

## Concurrency Considerations

**Single-Threaded**: JavaScript runtime is single-threaded.

**React Concurrent Mode**:
- Memory subscriptions work with concurrent rendering
- State updates may be batched
- Suspense boundaries can wrap runtime components

**Timer Precision**:
- Timers use `requestAnimationFrame` for smooth updates
- Target: 60fps (16.67ms per frame)
- Actual precision: ±10ms due to browser throttling

## Related Documentation

- [Building Blocks](./03-building-blocks.md) - Component details
- [Solution Strategy](./02-solution-strategy.md) - Design decisions
- [Deployment View](./05-deployment-view.md) - Infrastructure
- [How-To: Test Blocks](../how-to/test-blocks.md) - Testing guide

---

**Previous**: [← Building Blocks](./03-building-blocks.md) | **Next**: [Deployment View →](./05-deployment-view.md)
