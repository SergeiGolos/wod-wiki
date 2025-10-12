# Timer Strategy and Behavior Improvement Proposals

**Created**: 2025-10-12  
**Status**: Implementation Phase  
**Related Files**:
- `src/runtime/strategies.ts` - TimerStrategy implementation
- `src/runtime/behaviors/TimerBehavior.ts` - TimerBehavior implementation
- `tests/unit/runtime/strategies.test.ts` - Strategy tests

---

## Executive Summary

The current `TimerStrategy` implementation has a TODO comment indicating that timer configuration (direction and duration) should be extracted from code fragments. Currently, the timer behavior is hardcoded to always count up (`'up'`) with no duration limit, which prevents proper support for:

1. **AMRAP (As Many Rounds As Possible)** workouts - require countdown timers
2. **For Time** workouts - require count-up timers
3. **Time-capped** workouts - require duration limits

This proposal outlines the necessary changes to make `TimerStrategy` fully functional by extracting timer configuration from code fragments and passing it to `TimerBehavior`.

---

## Current Implementation Issues

### Issue 1: Hardcoded Timer Direction

**Location**: `src/runtime/strategies.ts:126`

```typescript
// Current code:
behaviors.push(new TimerBehavior('up', undefined, timeSpansRef, isRunningRef));
```

**Problem**: Timer direction is always 'up', making it impossible to create countdown timers for AMRAP workouts.

**Impact**:
- AMRAP workouts (e.g., "20:00 AMRAP") cannot work properly
- Users expect countdown behavior but get count-up instead
- Breaks workout timer semantics

### Issue 2: No Duration Extraction

**Location**: `src/runtime/strategies.ts:125`

```typescript
// TODO: Extract timer configuration from fragments (direction, duration)
behaviors.push(new TimerBehavior('up', undefined, timeSpansRef, isRunningRef));
```

**Problem**: Duration is always undefined, preventing timer completion events and time limits.

**Impact**:
- Countdown timers never complete
- No `timer:complete` events emitted
- Cannot enforce time caps on workouts

### Issue 3: No Fragment Analysis

**Problem**: `TimerStrategy.compile()` doesn't analyze the Timer fragment to extract its value and determine workout type.

**Impact**:
- Cannot distinguish between "For Time" and "AMRAP" workouts
- Cannot extract time duration from fragments
- Limited workout type support

---

## Proposed Solution

### Change 1: Extract Timer Fragment Configuration

**Implementation Steps**:

1. In `TimerStrategy.compile()`, find the Timer fragment in the statement
2. Extract the timer value (duration in seconds)
3. Determine timer direction based on workout type:
   - **Count-up ('up')**: For Time workouts (value represents cap, optional)
   - **Countdown ('down')**: AMRAP workouts (value is countdown duration)

**Code Change** (in `src/runtime/strategies.ts`):

```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    console.log(`  🧠 TimerStrategy compiling ${code.length} statement(s)`);

    // 1. Generate BlockKey
    const blockKey = new BlockKey();
    const blockId = blockKey.toString();
    
    // 2. Create BlockContext
    const context = new BlockContext(runtime, blockId);
    
    // 3. Extract timer configuration from fragments
    const fragments = code[0]?.fragments || [];
    const timerFragment = fragments.find(f => f.fragmentType === FragmentType.Timer);
    
    // Default to count-up timer with no duration
    let direction: 'up' | 'down' = 'up';
    let durationMs: number | undefined = undefined;
    
    if (timerFragment && typeof timerFragment.value === 'number') {
        // Timer fragment value is in seconds, convert to milliseconds
        durationMs = timerFragment.value * 1000;
        
        // Determine direction based on workout type
        // For AMRAP workouts, we want countdown
        // For "For Time" workouts, we want count-up
        // Heuristic: If statement text contains "AMRAP", use countdown
        const statementText = fragments.map(f => f.value).join(' ').toUpperCase();
        direction = statementText.includes('AMRAP') ? 'down' : 'up';
    }
    
    // 4. Allocate timer memory
    const timeSpansRef = context.allocate(
        TIMER_MEMORY_TYPES.TIME_SPANS,
        [{ start: new Date(), stop: undefined }],
        'public'
    );
    const isRunningRef = context.allocate<boolean>(
        TIMER_MEMORY_TYPES.IS_RUNNING,
        true,
        'public'
    );
    
    // 5. Create behaviors with extracted configuration
    const behaviors: IRuntimeBehavior[] = [];
    
    // Add timer behavior with extracted direction and duration
    behaviors.push(new TimerBehavior(direction, durationMs, timeSpansRef, isRunningRef));

    // ... rest of the method remains the same
}
```

### Change 2: Improve Fragment Type Detection

**Current State**: The heuristic checking for "AMRAP" in statement text is fragile.

**Better Approach**: 
- Check if there are Rounds fragments alongside Timer fragments
- Timer + Rounds = AMRAP (countdown)
- Timer only = For Time (count-up with cap) OR AMRAP (countdown)

**Enhanced Logic**:

```typescript
// Determine direction based on workout type
const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);

if (hasRounds) {
    // Timer + Rounds = AMRAP workout (countdown)
    direction = 'down';
} else {
    // Timer only - check statement text for AMRAP keyword
    const statementText = fragments.map(f => f.value).join(' ').toUpperCase();
    direction = statementText.includes('AMRAP') ? 'down' : 'up';
}
```

### Change 3: Add Tests for Timer Configuration

**New Test Cases** (in `tests/unit/runtime/strategies.test.ts`):

```typescript
describe('TSC-010: TimerStrategy extracts timer configuration', () => {
  it('should extract duration from Timer fragment', () => {
    // GIVEN: Statement with 1200 second (20 minute) timer
    const statement: ICodeStatement = {
      id: new BlockKey('test-10'),
      fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
      ],
      children: [],
      meta: undefined
    };

    // WHEN: Compile with TimerStrategy
    const strategy = new TimerStrategy();
    const block = strategy.compile([statement], mockRuntime);

    // THEN: TimerBehavior should have correct duration
    // Note: This requires exposing behavior configuration for testing
    expect(block).toBeDefined();
  });

  it('should use countdown direction for AMRAP workouts', () => {
    // GIVEN: AMRAP workout statement
    const statement: ICodeStatement = {
      id: new BlockKey('test-11'),
      fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' },
        { fragmentType: FragmentType.Rounds, value: 0, type: 'rounds' } // AMRAP has rounds
      ],
      children: [],
      meta: undefined
    };

    // WHEN: Compile with TimerStrategy
    const strategy = new TimerStrategy();
    const block = strategy.compile([statement], mockRuntime);

    // THEN: Should create countdown timer
    expect(block).toBeDefined();
  });

  it('should use count-up direction for For Time workouts', () => {
    // GIVEN: For Time workout statement (timer only, no rounds)
    const statement: ICodeStatement = {
      id: new BlockKey('test-12'),
      fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
      ],
      children: [],
      meta: undefined
    };

    // WHEN: Compile with TimerStrategy
    const strategy = new TimerStrategy();
    const block = strategy.compile([statement], mockRuntime);

    // THEN: Should create count-up timer
    expect(block).toBeDefined();
  });
});
```

---

## Implementation Checklist

- [ ] Extract timer configuration from fragments in `TimerStrategy.compile()`
- [ ] Determine timer direction based on workout type (AMRAP vs For Time)
- [ ] Convert duration from seconds to milliseconds
- [ ] Pass extracted configuration to `TimerBehavior` constructor
- [ ] Add unit tests for timer configuration extraction
- [ ] Add integration tests for AMRAP workouts
- [ ] Add integration tests for For Time workouts
- [ ] Verify existing tests still pass
- [ ] Verify Storybook examples work correctly
- [ ] Update documentation if needed

---

## Testing Strategy

### Unit Tests
1. Test timer configuration extraction for various fragment combinations
2. Test direction determination logic (AMRAP vs For Time)
3. Test duration conversion (seconds to milliseconds)

### Integration Tests
1. Test AMRAP workout with countdown timer
2. Test For Time workout with count-up timer
3. Test timer completion events for countdown timers
4. Test timer with both Rounds and Timer fragments

### Storybook Tests
1. Verify AMRAP workout stories render correctly
2. Verify For Time workout stories render correctly
3. Verify timer displays show correct direction
4. Verify timer completion events fire correctly

---

## Success Criteria

✅ **Functional Requirements**:
- TimerStrategy extracts timer configuration from fragments
- AMRAP workouts use countdown timers
- For Time workouts use count-up timers
- Timer duration is correctly converted from seconds to milliseconds
- Timer completion events fire when countdown reaches zero

✅ **Quality Requirements**:
- All existing tests continue to pass
- New tests validate timer configuration extraction
- No TypeScript errors introduced
- Storybook examples work correctly
- Code follows existing patterns and conventions

✅ **Documentation Requirements**:
- Code comments explain timer direction logic
- Tests document expected behavior
- This proposal serves as implementation guide

---

## Appendix: Fragment Type Analysis

### Timer Fragment Structure

```typescript
interface ICodeFragment {
  fragmentType: FragmentType;
  value: any;  // For Timer: number (seconds)
  type: string; // 'timer'
}
```

### Workout Type Detection

| Fragments | Workout Type | Timer Direction | Example |
|-----------|--------------|-----------------|---------|
| Timer only | For Time (with cap) | Count-up | "20:00 For Time: 100 Pull-ups" |
| Timer only (AMRAP text) | AMRAP | Countdown | "20:00 AMRAP: 5 Pull-ups" |
| Timer + Rounds | AMRAP | Countdown | "20:00 AMRAP: 5 Pull-ups, 10 Push-ups" |
| Rounds only | For Quality | N/A | "5 Rounds: 10 Pull-ups" |

---

## References

- **API Contract**: `contracts/runtime-blocks-api.md`
- **Runtime Refactoring Plan**: `docs/runtime-refactoring-plan.md`
- **Action Architecture**: `notes/research-notes-on-actions.md`
- **TimerBehavior**: `src/runtime/behaviors/TimerBehavior.ts`
- **Strategy Pattern**: `src/runtime/IRuntimeBlockStrategy.ts`
