# Contract: RuntimeAdapter

**Component**: RuntimeAdapter  
**Type**: Integration Adapter  
**Path**: `src/runtime-test-bench/adapters/RuntimeAdapter.ts`

---

## Contract Specification

### Purpose
Convert ScriptRuntime state into ExecutionSnapshot for UI rendering without modifying runtime internals.

### Dependencies
- `ScriptRuntime` from `src/runtime/ScriptRuntime.ts`
- `IRuntimeBlock` from `src/runtime/IRuntimeBlock.ts`
- `RuntimeMemory` from `src/runtime/RuntimeMemory.ts`

### Interface

```typescript
interface IRuntimeAdapter {
  createSnapshot(runtime: ScriptRuntime): ExecutionSnapshot;
  extractStackBlocks(runtime: ScriptRuntime): RuntimeStackBlock[];
  extractMemoryEntries(runtime: ScriptRuntime): MemoryEntry[];
  groupMemoryEntries(
    entries: MemoryEntry[],
    groupBy: MemoryGrouping
  ): Map<string, MemoryEntry[]>;
}
```

---

## Test Contract

### Test 1: createSnapshot with empty runtime
**Given**: ScriptRuntime with empty stack  
**When**: `createSnapshot(runtime)` called  
**Then**: 
- Returns ExecutionSnapshot with empty blocks array
- status is 'idle'
- activeIndex is 0
- memory.entries is empty array

```typescript
test('createSnapshot with empty runtime', () => {
  const runtime = createEmptyRuntime();
  const adapter = new RuntimeAdapter();
  
  const snapshot = adapter.createSnapshot(runtime);
  
  expect(snapshot.stack.blocks).toEqual([]);
  expect(snapshot.stack.activeIndex).toBe(0);
  expect(snapshot.memory.entries).toEqual([]);
  expect(snapshot.status).toBe('idle');
});
```

### Test 2: createSnapshot with active runtime
**Given**: ScriptRuntime with 3 blocks on stack  
**When**: `createSnapshot(runtime)` called  
**Then**:
- Returns ExecutionSnapshot with 3 RuntimeStackBlocks
- blocks[0].depth is 0 (root)
- blocks[1].depth is 1 (child)
- activeIndex points to current block

```typescript
test('createSnapshot with active runtime', () => {
  const runtime = createRuntimeWithBlocks([
    mockWorkoutBlock(),
    mockGroupBlock(),
    mockExerciseBlock()
  ]);
  const adapter = new RuntimeAdapter();
  
  const snapshot = adapter.createSnapshot(runtime);
  
  expect(snapshot.stack.blocks).toHaveLength(3);
  expect(snapshot.stack.blocks[0].depth).toBe(0);
  expect(snapshot.stack.blocks[1].depth).toBe(1);
  expect(snapshot.stack.blocks[1].parentKey).toBe(snapshot.stack.blocks[0].key);
});
```

### Test 3: extractStackBlocks preserves hierarchy
**Given**: Runtime with nested blocks (workout -> group -> exercise)  
**When**: `extractStackBlocks(runtime)` called  
**Then**:
- Parent-child relationships preserved
- children arrays populated correctly
- depth values correct

```typescript
test('extractStackBlocks preserves hierarchy', () => {
  const runtime = createNestedRuntime();
  const adapter = new RuntimeAdapter();
  
  const blocks = adapter.extractStackBlocks(runtime);
  
  const workout = blocks.find(b => b.blockType === 'workout');
  const group = blocks.find(b => b.blockType === 'group');
  const exercise = blocks.find(b => b.blockType === 'exercise');
  
  expect(workout.children).toContain(group.key);
  expect(group.parentKey).toBe(workout.key);
  expect(exercise.parentKey).toBe(group.key);
});
```

### Test 4: extractMemoryEntries maps runtime memory
**Given**: Runtime with 5 memory allocations  
**When**: `extractMemoryEntries(runtime)` called  
**Then**:
- Returns 5 MemoryEntry objects
- Each entry has valid id, ownerId, type
- valueFormatted is populated

```typescript
test('extractMemoryEntries maps runtime memory', () => {
  const runtime = createRuntimeWithMemory();
  const adapter = new RuntimeAdapter();
  
  const entries = adapter.extractMemoryEntries(runtime);
  
  expect(entries).toHaveLength(5);
  entries.forEach(entry => {
    expect(entry.id).toBeDefined();
    expect(entry.ownerId).toBeDefined();
    expect(entry.type).toBeDefined();
    expect(entry.valueFormatted).toBeDefined();
  });
});
```

### Test 5: groupMemoryEntries by owner
**Given**: 6 memory entries from 3 different owners  
**When**: `groupMemoryEntries(entries, 'owner')` called  
**Then**:
- Returns Map with 3 entries
- Each group contains correct entries
- No entries lost or duplicated

```typescript
test('groupMemoryEntries by owner', () => {
  const entries = [
    mockMemoryEntry('1', 'owner-A'),
    mockMemoryEntry('2', 'owner-A'),
    mockMemoryEntry('3', 'owner-B'),
    mockMemoryEntry('4', 'owner-B'),
    mockMemoryEntry('5', 'owner-C'),
    mockMemoryEntry('6', 'owner-C'),
  ];
  const adapter = new RuntimeAdapter();
  
  const grouped = adapter.groupMemoryEntries(entries, 'owner');
  
  expect(grouped.size).toBe(3);
  expect(grouped.get('owner-A')).toHaveLength(2);
  expect(grouped.get('owner-B')).toHaveLength(2);
  expect(grouped.get('owner-C')).toHaveLength(2);
});
```

### Test 6: groupMemoryEntries by type
**Given**: 6 memory entries of 2 different types  
**When**: `groupMemoryEntries(entries, 'type')` called  
**Then**:
- Returns Map with 2 entries
- Metrics grouped together
- Timer states grouped together

```typescript
test('groupMemoryEntries by type', () => {
  const entries = [
    mockMemoryEntry('1', 'owner-A', 'metric'),
    mockMemoryEntry('2', 'owner-B', 'metric'),
    mockMemoryEntry('3', 'owner-A', 'timer-state'),
    mockMemoryEntry('4', 'owner-B', 'timer-state'),
  ];
  const adapter = new RuntimeAdapter();
  
  const grouped = adapter.groupMemoryEntries(entries, 'type');
  
  expect(grouped.size).toBe(2);
  expect(grouped.get('metric')).toHaveLength(2);
  expect(grouped.get('timer-state')).toHaveLength(2);
});
```

### Test 7: Performance - snapshot creation <10ms
**Given**: Runtime with 50 blocks and 100 memory entries  
**When**: `createSnapshot(runtime)` called  
**Then**:
- Completes in <10ms
- Returns valid snapshot

```typescript
test('Performance - snapshot creation <10ms', () => {
  const runtime = createLargeRuntime(50, 100);
  const adapter = new RuntimeAdapter();
  
  const start = performance.now();
  const snapshot = adapter.createSnapshot(runtime);
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(10);
  expect(snapshot.stack.blocks).toHaveLength(50);
  expect(snapshot.memory.entries).toHaveLength(100);
});
```

### Test 8: Immutability - snapshot modification doesn't affect runtime
**Given**: Snapshot created from runtime  
**When**: Snapshot properties modified  
**Then**:
- Runtime state unchanged
- No side effects

```typescript
test('Immutability - snapshot modification doesnt affect runtime', () => {
  const runtime = createRuntimeWithBlocks([mockWorkoutBlock()]);
  const adapter = new RuntimeAdapter();
  
  const snapshot = adapter.createSnapshot(runtime);
  const originalStackLength = runtime.stack.length;
  
  // Attempt to modify snapshot
  snapshot.stack.blocks.push(mockRuntimeStackBlock());
  
  // Runtime unchanged
  expect(runtime.stack.length).toBe(originalStackLength);
});
```

---

## Expected Failures

All tests above should **FAIL** before implementation because:
- RuntimeAdapter class doesn't exist yet
- No methods implemented
- No snapshot conversion logic

**First passing test**: Test 1 (createSnapshot with empty runtime)  
**Last passing test**: Test 8 (immutability check)

---

## Success Criteria

- All 8 contract tests pass
- Performance test consistently <10ms
- No mutations to ScriptRuntime
- 100% TypeScript type safety
- No console errors or warnings

---

**Status**: ❌ Not Implemented (tests will fail)  
**Next**: Implement RuntimeAdapter to make tests pass
