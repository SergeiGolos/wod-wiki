# Memory Layer (Simplified)

> **Role:** Optional cross-block storage (deprecated for UI binding)

## Option D Changes

With block-owned handlers:
- **UI binding** → Use `block.on()` directly
- **State access** → Read `block.timerState`, `block.roundState`
- **Memory** → Only needed for cross-block shared state

## Retained Uses

| Use Case | Keep Memory? | Alternative |
|----------|--------------|-------------|
| Timer elapsed | ❌ | `block.timerState.elapsed` |
| Round counter | ❌ | `block.roundState.current` |
| UI subscriptions | ❌ | `block.on('tick', ...)` |
| Cross-block data | ✅ | Still use memory |
| Debug/inspection | ✅ | Memory search useful |

## Migration Example

**Before:**
```typescript
// Allocate memory
const timerRef = memory.allocate('timer', blockKey, { elapsed: 0 });

// UI subscribes to memory
const unsubscribe = timerRef.subscribe(state => setElapsed(state.elapsed));

// Behavior updates memory
memory.set(timerRef, { elapsed: currentTime - startTime });
```

**After:**
```typescript
// Block owns state
class TimerBlock {
  timerState = { elapsed: 0, running: false };
  
  updateElapsed(now: Date) {
    this.timerState.elapsed = now - this.startTime;
    this.emit('tick');
  }
}

// UI binds to block
useEffect(() => block.on('tick', () => setElapsed(block.timerState.elapsed)), [block]);
```

## Related Files

- [[IRuntimeBlock|IRuntimeBlock]] (owns state now)
- [[05-ui-layer|UI Layer]] (binds to blocks)
