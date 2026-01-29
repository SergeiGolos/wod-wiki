# IRuntimeMemory (Deprecated)

> **Status:** Simplified in Option D architecture

## Deprecation Notice

With the **Block-Owned Handlers** architecture:
- Blocks own their own state as typed properties
- UI binds directly to blocks via `block.on()`
- No separate memory system needed for UI binding

## Migration Path

**Before (Memory-based):**
```typescript
const ref = memory.allocate<number>('timer', blockKey, 0);
ref.subscribe(value => setElapsed(value));
```

**After (Block-based):**
```typescript
block.on('tick', () => setElapsed(block.timerState.elapsed));
```

## Retained Use Cases

`RuntimeMemory` may still be useful for:
- Cross-block shared state (rare)
- Debug/inspection tooling
- Analytics collection

## Related Files

- [[IRuntimeBlock|IRuntimeBlock]] (new pattern)
- [[../layers/05-ui-layer|UI Layer]]
