# LoopCoordinatorBehavior Contract

**Interface**: `IRuntimeBehavior`  
**Type**: Runtime Coordination Behavior  
**Purpose**: Coordinate child looping with round advancement for multi-round workouts  
**Status**: New Implementation

---

## Constructor Signature

```typescript
constructor(mode: 'rounds' | 'timed-rounds' | 'intervals')
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | `'rounds' \| 'timed-rounds' \| 'intervals'` | Yes | Coordination mode determining looping behavior |

### Validation Rules

- `mode` must be one of the three valid values
- Constructor must not throw exceptions

---

## IRuntimeBehavior Implementation

### onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]

**Purpose**: Initialize coordination state when block enters stack

**Behavior**:
- Initialize internal state (`isComplete = false`)
- No actions returned (coordination happens in onNext)

**Performance**: Must complete in < 5ms

**Returns**: Empty array `[]`

---

### onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]

**Purpose**: Coordinate looping when child blocks complete

**Behavior**:
1. Find `ChildAdvancementBehavior` in sibling behaviors
2. Find `RoundsBehavior` in sibling behaviors (if mode is 'rounds' or 'timed-rounds')
3. Check if at end of children (`currentChildIndex >= children.length`)
4. If at end:
   - **rounds mode**: Loop to first child if more rounds remain
   - **timed-rounds mode**: Loop to first child if more rounds AND timer running
   - **intervals mode**: Wait for timer interval event
5. If looping:
   - Reset `currentChildIndex = 0`
   - Increment `currentRound`
   - Get inherited metrics from parent (reps for current round)
   - Compile first child with context
   - Return `[new PushBlockAction(compiledChild)]`
6. If all complete:
   - Emit `rounds:complete` event
   - Return empty array (let completion behavior handle)

**Performance**: Must complete in < 10ms

**Returns**: `IRuntimeAction[]` (0-1 actions)

**Edge Cases**:
- No `ChildAdvancementBehavior` found → return `[]`
- No `RoundsBehavior` found (for rounds modes) → return `[]`
- Children array empty → return `[]`
- JIT compilation fails → return `[]` (error logged)

---

### onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]

**Purpose**: Cleanup when block exits stack

**Behavior**:
- Set `isComplete = true`
- No explicit cleanup needed (stateless after pop)

**Performance**: Must complete in < 5ms

**Returns**: Empty array `[]`

---

### dispose(): void

**Purpose**: Resource cleanup (implements consumer-managed disposal)

**Behavior**:
- No resources to clean up (no intervals, no event listeners)
- Must be safe to call multiple times

**Performance**: Must complete in < 1ms

**Returns**: void

---

## Duck-Typing Helper Methods

### findBehavior<T>(block: IRuntimeBlock, pattern: string): T | undefined

**Purpose**: Discover sibling behaviors via duck-typing

**Implementation**:
```typescript
private findBehavior<T>(block: IRuntimeBlock, behaviorNamePattern: string): T | undefined {
  if (!(block as any).behaviors) return undefined;
  return (block as any).behaviors.find((b: any) => 
    b.constructor.name.includes(behaviorNamePattern)
  );
}
```

**Patterns Used**:
- `'ChildAdvancement'` → finds `ChildAdvancementBehavior`
- `'Rounds'` → finds `RoundsBehavior`
- `'Timer'` → finds `TimerBehavior`

---

## Coordination Modes

### Mode: 'rounds'

**Used for**: Standard multi-round workouts (e.g., Fran "21-15-9")

**Loop Condition**: `currentRound <= totalRounds`

**Completion**: All rounds done

**Example**: `(21-15-9) Thrusters, Pullups` (3 rounds, no timer)

---

### Mode: 'timed-rounds'

**Used for**: AMRAP workouts with timer and rounds

**Loop Condition**: `currentRound <= maxRounds AND timer.isRunning()`

**Completion**: Timer expires OR all rounds done (whichever first)

**Example**: `(21-15-9) 20:00 AMRAP Thrusters, Pullups` (loop until timer expires)

---

### Mode: 'intervals'

**Used for**: EMOM and interval-based workouts

**Loop Condition**: Timer interval events trigger round advancement

**Completion**: All intervals complete

**Example**: `10:00 EMOM: 10 Burpees` (10 rounds at 1-minute intervals)

**Note**: Phase 3 implementation (not in initial release)

---

## Error Handling

### Behavior Not Found

```typescript
const childBehavior = this.findBehavior<ChildAdvancementBehavior>(block, 'ChildAdvancement');
if (!childBehavior) {
  console.warn('LoopCoordinatorBehavior: ChildAdvancementBehavior not found');
  return [];
}
```

### Compilation Failure

```typescript
const compiledBlock = runtime.jit.compile([firstChild], runtime, context);
if (!compiledBlock) {
  console.error('LoopCoordinatorBehavior: Failed to compile child for next round');
  return [];
}
```

### Out of Bounds

```typescript
if (this.currentRound > this.totalRounds) {
  // All rounds complete, emit event
  runtime.handle({ name: 'rounds:complete', timestamp: new Date() });
  return [];
}
```

---

## Memory Interactions

**Reads**: None (coordinates via behavior state, not memory)

**Writes**: None (state managed by sibling behaviors)

**Memory Safety**: No memory leaks possible (no allocations)

---

## Test Scenarios

### Scenario 1: Basic Round Looping

```typescript
it('should loop children for multiple rounds', async () => {
  const runtime = createTestRuntime('(21-15-9) Thrusters, Pullups');
  const roundsBlock = runtime.stack.current;
  
  // Complete first Thrusters → should advance to Pullups
  runtime.handle({ name: 'next', timestamp: new Date() });
  expect(runtime.stack.current?.blockType).toBe('Effort'); // Pullups
  
  // Complete Pullups → should loop to round 2, Thrusters
  runtime.handle({ name: 'next', timestamp: new Date() });
  expect(runtime.stack.current?.blockType).toBe('Effort'); // Thrusters again
  expect(roundsBlock.currentRound).toBe(2);
});
```

### Scenario 2: Completion Detection

```typescript
it('should complete after all rounds', async () => {
  const runtime = createTestRuntime('(21-15-9) Thrusters, Pullups');
  
  // Complete all 3 rounds (6 exercises total)
  for (let i = 0; i < 6; i++) {
    runtime.handle({ name: 'next', timestamp: new Date() });
  }
  
  // Should emit rounds:complete and have no active block
  expect(runtime.events).toContainEqual(
    expect.objectContaining({ name: 'rounds:complete' })
  );
  expect(runtime.stack.current).toBeUndefined();
});
```

### Scenario 3: Timer Expiry (timed-rounds mode)

```typescript
it('should stop looping when timer expires', async () => {
  const runtime = createTestRuntime('(21-15-9) 20:00 AMRAP Thrusters, Pullups');
  
  // Simulate timer expiry mid-round
  runtime.handle({ name: 'timer:complete', timestamp: new Date() });
  
  // Complete current exercise
  runtime.handle({ name: 'next', timestamp: new Date() });
  
  // Should NOT loop to next round (timer expired)
  expect(runtime.stack.current).toBeUndefined();
});
```

### Scenario 4: Empty Children Edge Case

```typescript
it('should handle empty children array gracefully', async () => {
  const behavior = new LoopCoordinatorBehavior('rounds');
  const block = createBlockWithoutChildren();
  
  const actions = behavior.onNext(runtime, block);
  
  expect(actions).toEqual([]);
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('ChildAdvancementBehavior not found')
  );
});
```

---

## Performance Contract

| Operation | Target | Measurement |
|-----------|--------|-------------|
| `onPush()` | < 5ms | performance.now() |
| `onNext()` | < 10ms | performance.now() |
| `onPop()` | < 5ms | performance.now() |
| `dispose()` | < 1ms | performance.now() |
| Memory allocation | 0 bytes | N/A (no allocations) |

---

## Integration Points

### Dependencies

- `ChildAdvancementBehavior`: For child index management
- `RoundsBehavior`: For round tracking
- `LazyCompilationBehavior`: For child compilation
- `JitCompiler`: For compiling next child

### Consumers

- `RoundsBlock`: Uses LoopCoordinatorBehavior for round looping
- `TimerBlock`: May use for timed-rounds mode (AMRAP)

### Events

**Emitted**:
- `rounds:complete` when all rounds finished

**Listened**:
- None (coordination is lifecycle-driven, not event-driven)

---

## Backward Compatibility

**Impact**: None

**Reasoning**: New behavior, optional addition to blocks via composition

**Migration**: Existing blocks without LoopCoordinatorBehavior continue working

---

**Status**: ✅ READY FOR IMPLEMENTATION - Contract complete, ready for TDD
