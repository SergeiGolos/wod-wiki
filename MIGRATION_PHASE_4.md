# Phase 4: Fragment Memory Migration - Breaking Changes

## Summary

Phase 4 completes the migration to the new list-based memory API by removing the old Map-based memory infrastructure. This is a **breaking change** that requires updates to all behaviors and consumers that interact with block memory.

## What Was Removed

### Memory Classes
- `IMemoryEntry` - Interface for memory entries
- `BaseMemoryEntry` - Abstract base class
- `SimpleMemoryEntry` - Simple key-value memory entry
- `FragmentMemory` - Fragment storage memory entry
- `DisplayFragmentMemory` - Display fragment memory entry
- `TimerMemory` - Timer-specific memory entry
- `RoundMemory` - Round-specific memory entry

### API Methods Removed

#### IRuntimeBlock
- `hasMemory<T>(type: T): boolean`
- `getMemory<T>(type: T): IMemoryEntry<T, MemoryValueOf<T>> | undefined`
- `getMemoryTypes(): MemoryType[]`
- `setMemoryValue<T>(type: T, value: MemoryValueOf<T>): void`
- `allocateMemory<T>(type: T, entry: IMemoryEntry<T, MemoryValueOf<T>>): void` (protected)
- `setMemory<T>(type: T, entry: IMemoryEntry<T, MemoryValueOf<T>>): void` (protected)

#### IBehaviorContext  
- `getMemory<T>(type: T): MemoryValueOf<T> | undefined`
- `setMemory<T>(type: T, value: MemoryValueOf<T>): void`

### Test Files Deleted
- `src/runtime/memory/__tests__/MemoryEntries.test.ts`
- `src/runtime/memory/__tests__/DisplayFragmentMemory.test.ts`

## Migration Guide

### For Behaviors

**Before (Old Map-based API):**
```typescript
// Reading memory
const timer = ctx.getMemory('timer') as TimerState | undefined;
if (timer) {
    // Use timer.spans, timer.direction, etc.
}

// Writing memory
ctx.setMemory('timer', {
    direction: 'down',
    durationMs: 60000,
    spans: [new TimeSpan(now)]
});
```

**After (New List-based API):**
```typescript
// Reading memory
const timerLocations = ctx.block.getMemoryByTag('timer');
if (timerLocations.length > 0) {
    const timerFragments = timerLocations[0].fragments;
    if (timerFragments.length > 0) {
        const timerValue = timerFragments[0].value as {
            direction: string;
            durationMs: number;
            spans: TimeSpan[];
        } | undefined;
        if (timerValue) {
            // Use timerValue.spans, timerValue.direction, etc.
        }
    }
}

// Writing memory  
const timerFragment: ICodeFragment = {
    fragmentType: FragmentType.Timer,
    type: 'timer',
    image: '01:00',
    origin: 'runtime',
    value: {
        direction: 'down',
        durationMs: 60000,
        spans: [new TimeSpan(now)]
    },
    sourceBlockKey: ctx.block.key.toString(),
    timestamp: ctx.clock.now,
};
ctx.pushMemory('timer', [timerFragment]);
```

### For Block Implementations

**Before:**
```typescript
// Allocating memory in block constructors
this.allocateMemory('fragment', new FragmentMemory(fragments));
this.allocateMemory('fragment:display', new DisplayFragmentMemory(sourceId, fragmentMemory));
```

**After:**
```typescript
// Use pushMemory in BlockBuilder or during block initialization
for (const group of fragmentGroups) {
    block.pushMemory(new MemoryLocation('fragment:display', group));
}
```

## Behaviors Updated

The following behaviors have been migrated to the new API:

- ✅ `TimerInitBehavior` - Uses `ctx.pushMemory('timer', [fragment])`
- ✅ `TimerTickBehavior` - Uses `ctx.updateMemory('timer', [fragment])`
- ✅ `RoundInitBehavior` - Uses `ctx.pushMemory('round', [fragment])`
- ✅ `RoundAdvanceBehavior` - Uses `ctx.updateMemory('round', [fragment])`
- ✅ `DisplayInitBehavior` - Uses `ctx.pushMemory('display', fragments)`
- ✅ `ButtonBehavior` - Uses `ctx.pushMemory('controls', fragments)`
- ✅ `RoundDisplayBehavior` - Uses new memory API

## Behaviors Still Requiring Updates

The following behaviors still use the old API and will need to be updated:

- ❌ `ChildLoopBehavior`
- ❌ `HistoryRecordBehavior`  
- ❌ `RestBlockBehavior`
- ❌ `RoundCompletionBehavior`
- ❌ `RoundOutputBehavior`
- ❌ `SegmentOutputBehavior`
- ❌ `SoundCueBehavior`
- ❌ `TimerCompletionBehavior`
- ❌ `TimerOutputBehavior`
- ❌ `TimerPauseBehavior`

## Test Files Requiring Updates

The following test files reference the old API and need updates:

- `src/clock/components/TimerHarness.tsx`
- `src/runtime-test-bench/adapters/RuntimeAdapter.ts`
- `src/runtime/__tests__/BehaviorContext.test.ts`
- `src/runtime/__tests__/RuntimeBlockLifecycle.test.ts`
- `src/runtime/__tests__/RuntimeBlockMemory.test.ts`
- `src/runtime/__tests__/RuntimeDebugMode.test.ts`
- `src/runtime/__tests__/OutputStatementEmission.test.ts`
- `src/runtime/behaviors/__tests__/AspectBehaviors.test.ts`
- `src/testing/testable/TestableBlock.ts`
- `src/testing/harness/MockBlock.ts`

## Benefits of New API

1. **Uniform Contract**: All memory is `ICodeFragment[]` - no type-specific handling needed
2. **Multi-Row Display**: Multiple memory locations with same tag naturally create rows
3. **Observable State**: Each location has its own subscriber list for fine-grained reactivity
4. **Scalability**: List allows duplicates (multiple timers, multiple displays per block)
5. **Self-Describing**: Fragments contain type, value, origin, and image - no translation layer needed

## Next Steps

1. Update remaining behaviors to use new memory API
2. Update test files to use new memory API
3. Update TestableBlock and MockBlock implementations
4. Run full test suite
5. Verify Storybook builds
6. Update documentation

## Timeline

- **Phase 1 (Complete)**: Infrastructure - Added list-based memory system
- **Phase 2 (Complete)**: Behavior Migration - Dual-write pattern for 6 core behaviors
- **Phase 3 (Planned)**: UI Migration - Update hooks and components
- **Phase 4 (In Progress)**: Cleanup - Remove old Map-based API
