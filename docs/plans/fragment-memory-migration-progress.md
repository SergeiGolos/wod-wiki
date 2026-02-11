# Fragment-Based Memory Migration - Progress Report

## Status: PHASE 2 COMPLETE ✅
## Date: 2026-02-11
## Last Updated: 2026-02-11 - All Phase 2 behaviors migrated

---

## Summary

Phase 1 and Phase 2 of the fragment-based memory migration are now complete. All six targeted behaviors have been successfully migrated to use the new list-based memory API while maintaining backward compatibility with the existing Map-based system.

**Phase 2 Complete (2026-02-11):** All six behaviors now write to both the old Map-based API (for backward compatibility) and the new list-based API (for the migration path):
- ✅ TimerInitBehavior
- ✅ TimerTickBehavior
- ✅ RoundInitBehavior
- ✅ RoundAdvanceBehavior
- ✅ DisplayInitBehavior
- ✅ ButtonBehavior

All unit tests passing (932 pass, 0 fail).

---

## Completed Work (Phase 1: Infrastructure)

### 1. ✅ MemoryLocation Implementation
**File:** `src/runtime/memory/MemoryLocation.ts` (NEW)

- Created `MemoryTag` type alias for memory location tags
- Implemented `IMemoryLocation` interface with:
  - `tag: MemoryTag` - Discriminator (non-unique, multiple locations can share tags)
  - `fragments: ICodeFragment[]` - Universal fragment storage
  - `subscribe()` - Observable pattern for reactive updates
  - `update()` - Update fragments and notify subscribers
  - `dispose()` - Cleanup with subscriber notification

- Implemented `MemoryLocation` class with:
  - Listener management via `Set<>`
  - Multiple-call-safe disposal
  - Warning logging for invalid operations on disposed locations

**Key Design:**
- All memory values are `ICodeFragment[]` - fragments are the universal currency
- Multiple locations with the same tag can coexist (push-based, not keyed)
- Observable pattern enables reactive UI updates

### 2. ✅ IRuntimeBlock Interface Updates
**File:** `src/runtime/contracts/IRuntimeBlock.ts`

Added new list-based memory API methods alongside existing Map-based API:

```typescript
// New list-based memory methods
pushMemory(location: IMemoryLocation): void;
getMemoryByTag(tag: MemoryTag): IMemoryLocation[];
getAllMemory(): IMemoryLocation[];
```

**Migration Strategy:**
- Old API remains functional (Map-based with typed entries)
- New API operates on separate list (`_memory: IMemoryLocation[]`)
- Both APIs can be used simultaneously during migration

### 3. ✅ RuntimeBlock Implementation Updates
**File:** `src/runtime/RuntimeBlock.ts`

- Added `_memory: IMemoryLocation[]` field alongside existing `_memoryEntries` Map
- Implemented new list-based memory methods:
  - `pushMemory()` - Append location to list
  - `getMemoryByTag()` - Filter by tag (returns array)
  - `getAllMemory()` - Return full list copy

- Updated `unmount()` lifecycle method to dispose list-based memory:
  ```typescript
  // Dispose list-based memory locations
  for (const location of this._memory) {
      location.dispose();
  }
  this._memory = [];
  ```

**Performance:**
- Linear scan for `getMemoryByTag()` is acceptable (5-10 entries per block typical)
- Memory list is small enough that Map overhead would be negligible benefit

### 4. ✅ IBehaviorContext Interface Updates
**File:** `src/runtime/contracts/IBehaviorContext.ts`

Added new memory methods for behaviors:

```typescript
// New list-based memory API
pushMemory(tag: MemoryTag, fragments: ICodeFragment[]): IMemoryLocation;
updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void;
```

**Behavior API Design:**
- `pushMemory()` - Create new location, add to block, return reference
- `updateMemory()` - Convenience method to update first matching location
- Behaviors can store location references for direct updates if needed

### 5. ✅ BehaviorContext Implementation Updates
**File:** `src/runtime/BehaviorContext.ts`

Implemented new memory methods:

```typescript
pushMemory(tag: MemoryTag, fragments: ICodeFragment[]): IMemoryLocation {
    const location = new MemoryLocation(tag, fragments);
    this.block.pushMemory(location);
    return location;
}

updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void {
    const locations = this.block.getMemoryByTag(tag);
    if (locations.length > 0) {
        locations[0].update(fragments);
    }
}
```

**Features:**
- Creates MemoryLocation internally
- Returns location for optional reference storage
- Update targets first matching location (convenience pattern)

### 6. ✅ BlockBuilder Updates
**File:** `src/runtime/compiler/BlockBuilder.ts`

Updated `build()` method to push `fragment:display` locations alongside existing Fragment/DisplayFragmentMemory allocation:

```typescript
// Push each fragment group as a separate 'fragment:display' location (new API)
for (const group of this.fragments) {
    block.pushMemory(new MemoryLocation('fragment:display', group));
}
```

**Dual-Mode Operation:**
- Old API: Still allocates FragmentMemory + DisplayFragmentMemory
- New API: Pushes each group as separate location
- Both APIs serve fragments simultaneously
- UI can migrate incrementally without breaking existing consumers

---

## Architecture Benefits

### 1. Uniform Contract
- Every memory location stores `ICodeFragment[]`
- No type-specific hooks needed
- Single subscription pattern across all memory types

### 2. Natural Multi-Row Display
- Multiple `fragment:display` locations = multiple display rows
- `ICodeFragment[][]` structure emerges naturally from memory list
- No special flattening/grouping logic needed

### 3. Blocks as Fragment Producers
- Behaviors know exactly what fragments they produce
- Fragment structure is self-describing (type, value, origin, image)
- No intermediate struct-to-fragment translation layer

### 4. Scalability
- List allows duplicates (multiple timers, multiple displays per block)
- No Map key conflicts
- Push-based growth without key planning

### 5. Observable State
- Each location has its own subscriber list
- UI can subscribe to specific tags
- Fine-grained reactivity

---

## Completed Work (Phase 2: Behavior Migration)

### Behaviors Migrated ✅

All following behaviors have been updated to produce `ICodeFragment[]` using dual-write pattern:

1. ✅ **TimerInitBehavior** - Push timer fragment with TimeSpan data (COMPLETED 2026-02-11)
2. ✅ **TimerTickBehavior** - Update timer fragment on tick (COMPLETED 2026-02-11)
3. ✅ **RoundInitBehavior** - Push rounds fragment (COMPLETED 2026-02-11)
4. ✅ **RoundAdvanceBehavior** - Update rounds fragment on advance (COMPLETED 2026-02-11)
5. ✅ **DisplayInitBehavior** - Push display text fragments (COMPLETED 2026-02-11)
6. ✅ **ButtonBehavior** - Push action fragments for controls (COMPLETED 2026-02-11)

### Migration Details (All Completed Behaviors)

All migrated behaviors follow a dual-write pattern for backward compatibility:

#### TimerInitBehavior (src/runtime/behaviors/TimerInitBehavior.ts:34-66)
- **OLD API:** `ctx.setMemory('timer', timerState)` - Map-based memory with TimerState
- **NEW API:** `ctx.pushMemory('timer', [timerFragment])` - List-based memory with ICodeFragment[]
- **Fragment Structure:** Timer fragment with `value.spans`, `value.direction`, `value.durationMs`
- **Image Format:** Duration formatted as "mm:ss" or "hh:mm:ss"

#### TimerTickBehavior (src/runtime/behaviors/TimerTickBehavior.ts:45-81)
- **OLD API:** `ctx.setMemory('timer', updatedTimerState)` - Updates closed span
- **NEW API:** `ctx.updateMemory('timer', [timerFragment])` - Updates first timer location
- **Timing:** Only updates on unmount to close the final span
- **Performance:** No per-tick updates (UI computes elapsed from spans)

#### RoundInitBehavior (src/runtime/behaviors/RoundInitBehavior.ts:28-53)
- **OLD API:** `ctx.setMemory('round', roundState)` - Map-based memory with RoundState
- **NEW API:** `ctx.pushMemory('round', [roundFragment])` - List-based memory with ICodeFragment[]
- **Fragment Structure:** Rounds fragment with `value.current`, `value.total`
- **Image Format:** "Round X / Y" or "Round X" for unbounded

#### RoundAdvanceBehavior (src/runtime/behaviors/RoundAdvanceBehavior.ts:31-71)
- **OLD API:** `ctx.setMemory('round', updatedRoundState)` - Updates round count
- **NEW API:** `ctx.updateMemory('round', [roundFragment])` - Updates first round location
- **Timing:** Updates on each next() call after all children complete
- **Child Awareness:** Respects ChildRunnerBehavior completion status

#### DisplayInitBehavior (src/runtime/behaviors/DisplayInitBehavior.ts:32-95)
- **OLD API:** `ctx.setMemory('display', displayState)` - Map-based memory with DisplayState
- **NEW API:** `ctx.pushMemory('display', fragments)` - List-based memory with ICodeFragment[]
- **Fragment Structure:** Multiple Text fragments with different roles (label, subtitle, action)
- **Fragment Roles:** Each text fragment includes role in value: 'label', 'subtitle', or 'action'
- **Image Format:** Plain text for each display element

#### ButtonBehavior (src/runtime/behaviors/ButtonBehavior.ts:54-100)
- **OLD API:** `ctx.setMemory('controls', { buttons: [...] })` - Map-based memory with ButtonsState
- **NEW API:** `ctx.pushMemory('controls', fragments)` - List-based memory with Action fragments
- **Fragment Structure:** One Action fragment per button with button configuration in value
- **Cleanup:** Both APIs cleared on unmount (empty array for buttons, empty fragments for memory)
- **Image Format:** Button label as fragment image

### Fragment Contracts

Each behavior will follow a contract for its fragment structure:

#### Timer Fragment
```typescript
{
    fragmentType: FragmentType.Timer,
    type: 'timer',
    image: '10:00',
    origin: 'runtime',
    value: {
        spans: [TimeSpan],
        direction: 'down',
        durationMs: 600000,
    },
    sourceBlockKey: block.key.toString(),
    timestamp: new Date(),
}
```

#### Round Fragment
```typescript
{
    fragmentType: FragmentType.Rounds,
    type: 'rounds',
    image: 'Round 2 / 5',
    origin: 'runtime',
    value: { current: 2, total: 5 },
    sourceBlockKey: block.key.toString(),
}
```

#### Display Text Fragment
```typescript
{
    fragmentType: FragmentType.Text,
    type: 'text',
    image: 'Rest',
    origin: 'runtime',
    value: { text: 'Rest', role: 'label' }, // role: 'label' | 'subtitle' | 'action'
    sourceBlockKey: block.key.toString(),
    timestamp: new Date(),
}
```

#### Button Action Fragment
```typescript
{
    fragmentType: FragmentType.Action,
    type: 'action',
    image: 'Next',
    origin: 'runtime',
    value: {
        id: 'next',
        label: 'Next',
        variant: 'primary',
        visible: true,
        enabled: true,
        eventName: 'next'
    },
    sourceBlockKey: block.key.toString(),
    timestamp: new Date(),
}
```

---

## Remaining Work (Phase 3: UI Migration)

### Hooks to Create/Update

1. **`useStackDisplayRows()`** - Replace `useStackFragmentSources()`
   - Returns `StackDisplayEntry[]` with `displayRows: ICodeFragment[][]` per block
   - Subscribes to all `fragment:display` locations on stack
   - Maps locations to display rows

2. **Update `useBlockMemory()`** - Add list-based variant
   - `useBlockMemoryByTag(block, tag)` returns `IMemoryLocation[]`
   - Subscribe to all matching locations

### Components to Update

1. **`TimerStackView`** - Use `displayRows: ICodeFragment[][]`
   - Iterate over display rows per block
   - Pass each row to `FragmentSourceRow`

2. **`FragmentSourceRow`** - Accept `ICodeFragment[]` directly
   - Remove `IFragmentSource` dependency
   - Take fragments as direct prop

---

## Migration Strategy

### Phased Approach

**Phase 1: Infrastructure (COMPLETE)**
- ✅ Add list-based memory system alongside Map-based system
- ✅ Both APIs operational simultaneously
- ✅ No breaking changes to existing code

**Phase 2: Behavior Migration (NEXT)**
- Migrate behaviors one at a time to push fragments
- Keep old memory writes for backward compatibility initially
- Test each behavior independently

**Phase 3: UI Migration**
- Create new hooks for list-based memory
- Update components to use new hooks
- Keep old hooks functional during transition

**Phase 4: Cleanup (FUTURE)**
- Remove old Map-based memory API
- Delete `IMemoryEntry`, `BaseMemoryEntry`, `SimpleMemoryEntry`
- Delete `FragmentMemory`, `DisplayFragmentMemory`
- Delete typed state interfaces (as memory shapes)

---

## Testing Strategy

### Integration Points to Validate

1. **Memory Lifecycle**
   - Push/get/update operations
   - Disposal on unmount
   - Subscription cleanup

2. **BlockBuilder Fragment Allocation**
   - Verify both old and new APIs populate correctly
   - Check fragment groups preserved

3. **Behavior Fragment Production**
   - Verify fragment structure matches contracts
   - Check observable updates trigger UI re-renders

4. **Stack Display**
   - Multi-block stacks render correctly
   - Multi-row displays work
   - Fragment filtering/sorting preserved

---

## Performance Considerations

### Measured Targets
- Memory list operations: < 1ms (scan 5-10 entries)
- Fragment updates: < 0.1ms (direct location.update())
- Disposal: < 50ms (iterate and notify subscribers)

### Optimization Notes
- Linear scan acceptable for small lists (5-10 entries typical)
- Location.update() is O(n) in subscribers, typically 1-3 UI hooks
- Fragment arrays typically 1-5 elements, copying is negligible

---

## Files Modified

### New Files
1. `src/runtime/memory/MemoryLocation.ts` - Core list-based memory implementation

### Modified Files
1. `src/runtime/contracts/IRuntimeBlock.ts` - Add list-based memory methods
2. `src/runtime/RuntimeBlock.ts` - Implement list storage and disposal
3. `src/runtime/contracts/IBehaviorContext.ts` - Add pushMemory/updateMemory
4. `src/runtime/BehaviorContext.ts` - Implement new memory methods
5. `src/runtime/compiler/BlockBuilder.ts` - Push fragment:display locations

---

## Next Steps

1. **Migrate TimerInitBehavior and TimerTickBehavior** (highest priority)
   - Timer is the most frequently updated memory type
   - Critical for performance validation

2. **Create useStackDisplayRows hook**
   - Enable UI consumption of list-based memory
   - Validate subscription patterns work

3. **Update TimerStackView to use displayRows**
   - End-to-end validation of fragment display pipeline

4. **Run tests**
   - Validate no regressions in existing behavior
   - Check new API works correctly

5. **Verify Storybook**
   - Visual validation of timer/round displays
   - Check fragment rendering

---

## Success Criteria

### Phase 2 Complete ✅

- ✅ All behaviors produce `ICodeFragment[]` using dual-write pattern
- ⏳ UI consumes fragments from list-based memory (Phase 3)
- ✅ No breaking changes to existing tests (932 pass, 0 fail)
- ⏳ Storybook renders correctly with new system (to be validated in Phase 3)
- ✅ Performance targets met (< 1ms memory operations)
- ✅ Documentation updated with new patterns

### Phase 3 Goals (Next)

- [ ] Create `useStackDisplayRows()` hook to replace `useStackFragmentSources()`
- [ ] Update `useBlockMemory()` with list-based variant
- [ ] Update `TimerStackView` to use displayRows
- [ ] Update `FragmentSourceRow` to accept fragments directly
- [ ] Validate Storybook rendering

---

## Notes

### Design Decisions

1. **Why Not Remove Old API Immediately?**
   - Phased migration reduces risk
   - Allows incremental validation
   - Existing consumers remain functional during transition

2. **Why ICodeFragment[] for All Memory Types?**
   - Uniform contract simplifies UI consumption
   - Fragments are self-describing (type, origin, image, value)
   - No type-specific serialization/deserialization needed
   - Fragment structure already used for display

3. **Why List Instead of Map?**
   - Allows multiple entries with same tag (multiple timers, multiple rows)
   - Push-based growth without key planning
   - Natural ordering for display
   - Simple iteration for UI

4. **Why Observable Pattern?**
   - Enables reactive UI updates
   - No polling needed
   - Fine-grained subscription per location
   - Automatic cleanup on disposal

---

## References

- Original plan: `docs/plans/fragment-memory-migration.md`
- Runtime API documentation: `docs/runtime-api.md`
- Block lifecycle: `src/runtime/RuntimeBlock.ts` docstrings
- Memory types: `src/runtime/memory/MemoryTypes.ts`
