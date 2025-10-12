# Runtime Execution Problems Analysis - Fran Workout

**Date:** October 12, 2025  
**Example:** http://localhost:6006/?path=/story/runtime-crossfit--fran  
**Workout:** `(21-15-9) Thrusters 95lb, Pullups`

## Expected Behavior

The Fran workout should execute with the following sequence:

1. **First Next:** Select top node `(21-15-9)` RoundsBlock
   - RoundsBlock pushed onto stack
   - Immediately calls `next()` with child index 0
   - Compiles "Thrusters" and pushes onto stack
   - Memory should show: currentRound=1, reps=21 inherited

2. **Second Next:** Advance to "Pullups"
   - "Thrusters" completes and pops
   - RoundsBlock's `next()` compiles "Pullups" at index 1
   - Memory should show: currentRound=1, reps=21 inherited

3. **Third Next:** Start Round 2
   - "Pullups" completes and pops
   - RoundsBlock advances to round 2 (index loops back to 0)
   - Compiles "Thrusters" again with reps=15

4. **Fourth Next:** Round 2 Pullups
   - "Thrusters" completes and pops
   - Compiles "Pullups" with reps=15

5. **Fifth Next:** Start Round 3
   - "Pullups" completes and pops
   - RoundsBlock advances to round 3 (index loops back to 0)
   - Compiles "Thrusters" with reps=9

6. **Sixth Next:** Round 3 Pullups
   - "Thrusters" completes and pops
   - Compiles "Pullups" with reps=9

7. **Seventh Next:** Complete workout
   - "Pullups" completes and pops
   - RoundsBlock detects all rounds complete
   - Emits `rounds:complete`
   - Workout ends

## Actual Problems

### Problem 1: RoundsBlock Does NOT Loop Children

**Location:** `src/runtime/behaviors/ChildAdvancementBehavior.ts`

**Issue:** `ChildAdvancementBehavior` only advances linearly through children once:

```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Check if we're already complete
    if (this.currentChildIndex >= this.children.length) {
        NextBlockLogger.logChildAdvancement(
            this.currentChildIndex,
            this.children.length,
            true
        );
        return [];  // ❌ STOPS HERE - NO LOOPING
    }

    // Advance to next child
    this.currentChildIndex++;  // ❌ INCREMENTS FOREVER
    
    // ... rest of method
}
```

**Expected Behavior:**
- Should loop back to child index 0 when reaching end of children
- Should coordinate with RoundsBehavior to know when all rounds complete
- Should increment `currentChildIndex` but use modulo to cycle through children

**Impact:**
- After first "Thrusters" and "Pullups", no more children compile
- Rounds 2 and 3 never execute
- Workout appears to complete prematurely

### Problem 2: RoundsBehavior Does NOT Coordinate with ChildAdvancementBehavior

**Location:** `src/runtime/behaviors/RoundsBehavior.ts`

**Issue:** `RoundsBehavior` tracks rounds but doesn't control child looping:

```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Advance to next round
    this.currentRound++;  // ❌ Increments but doesn't tell ChildAdvancementBehavior

    // Update memory
    if (this.roundsStateRef) {
        this.roundsStateRef.set({
            currentRound: this.currentRound,
            totalRounds: this.totalRounds,
            completedRounds: this.currentRound - 1,
        });
    }

    // Check if all rounds complete
    if (this.currentRound > this.totalRounds) {
        // Emit rounds:complete event
        runtime.handle({
            name: 'rounds:complete',
            // ...
        });
    } else {
        // Emit rounds:changed event
        runtime.handle({
            name: 'rounds:changed',
            // ...
        });
    }

    return [];  // ❌ NO ACTIONS TO RESET CHILD INDEX OR TRIGGER NEXT COMPILATION
}
```

**Expected Behavior:**
- When round advances, should signal ChildAdvancementBehavior to reset to index 0
- Should coordinate with LazyCompilationBehavior to compile first child of next round
- Should NOT increment round when mid-round (only when all children complete)

**Impact:**
- Round counter increments but children don't loop
- No mechanism to restart child sequence for new rounds
- Behavior coordination is missing

### Problem 3: LazyCompilationBehavior Timing Issue

**Location:** `src/runtime/behaviors/LazyCompilationBehavior.ts`

**Issue:** `LazyCompilationBehavior.onNext()` compiles BEFORE `ChildAdvancementBehavior.onNext()` increments:

```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Get ChildAdvancementBehavior to find current child
    const childBehavior = this.getChildBehavior(block);
    if (!childBehavior) {
        return [];
    }

    // Get current child before advancement happens
    const currentChild = childBehavior.getCurrentChild();  // ❌ Gets CURRENT, not NEXT
    if (!currentChild) {
        return [];
    }

    const currentIndex = childBehavior.getCurrentChildIndex();

    // ... compile and return PushBlockAction
}
```

**Expected Behavior:**
- Should get the NEXT child to compile, not the current one
- Or should compile AFTER ChildAdvancementBehavior increments
- Behavior execution order matters here

**Impact:**
- May compile wrong child
- Synchronization issues between behaviors
- First push might not happen correctly

### Problem 4: No Initial Push on RoundsBlock Mount

**Location:** `src/runtime/blocks/RoundsBlock.ts` and `src/runtime/behaviors/RoundsBehavior.ts`

**Issue:** When RoundsBlock is pushed onto stack, no child is immediately compiled:

```typescript
// RoundsBehavior.onPush
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Initialize currentRound to 1
    this.currentRound = 1;

    // Initialize memory
    // ... memory setup

    return [];  // ❌ NO ACTIONS TO PUSH FIRST CHILD
}
```

**Expected Behavior:**
- RoundsBlock mount should immediately trigger compilation of first child
- Should return a PushBlockAction or NextAction to kick off execution
- User shouldn't need to click "Next" to start - mount should auto-start

**Impact:**
- First "Next" click doesn't do what user expects
- Extra click needed to begin workout
- Confusing UX

### Problem 5: Metric Inheritance Not Implemented

**Location:** Multiple files - metrics system

**Issue:** Rep count from rep scheme (21-15-9) is not passed to child blocks:

**Current State:**
- RoundsBlock has `getRepsForCurrentRound()` method
- Returns correct values: 21, 15, 9 based on currentRound
- BUT child blocks (Effort blocks) don't read this value

**Missing Implementation:**
- Child compilation context not passed through JIT compiler
- EffortBlock doesn't look for parent RoundsBlock context
- No metric inheritance system in place

**Impact:**
- "Thrusters" and "Pullups" don't know how many reps to perform
- Display shows exercise names but no rep counts
- Core feature of rep schemes not functional

### Problem 6: Completion Detection Logic Flaw

**Location:** `src/runtime/behaviors/CompletionBehavior.ts` in RoundsBlock

**Issue:** RoundsBlock might complete before all rounds finish:

**Current Logic:**
- CompletionBehavior checks condition on every `onNext()`
- RoundsBehavior increments round THEN checks completion
- Race condition where block might complete mid-round

**Expected Behavior:**
- Should only complete when:
  1. currentRound > totalRounds, AND
  2. All children of last round have completed

**Impact:**
- Premature workout completion
- Last round might not fully execute

### Problem 7: PopBlockAction Doesn't Handle Round Boundaries

**Location:** `src/runtime/PopBlockAction.ts`

**Issue:** When child completes and pops, parent's `next()` is called but doesn't distinguish between:
- Next child in current round (advance child index)
- Next round (reset child index, increment round)

```typescript
// PopBlockAction.do()
// 6. Call parent block's next() if there's a parent
const parentBlock = runtime.stack.current;
if (parentBlock) {
    const nextActions = parentBlock.next(runtime);  // ❌ next() called for every pop
    for (const action of nextActions) {
        action.do(runtime);
    }
}
```

**Expected Behavior:**
- RoundsBlock should detect: "Was that the last child?"
- If yes: increment round, reset child index to 0, compile first child
- If no: increment child index, compile next child

**Impact:**
- No round looping logic
- Children don't repeat for multiple rounds

## Code Areas Requiring Changes

### 1. **ChildAdvancementBehavior** (Critical)
**File:** `src/runtime/behaviors/ChildAdvancementBehavior.ts`

**Changes Needed:**
- Add round-aware looping logic
- Accept `totalRounds` parameter or query RoundsBehavior
- Use modulo arithmetic: `childIndex = (childIndex + 1) % children.length`
- Track which round we're on to know when truly complete
- Add method `resetToFirstChild()` for round boundaries

### 2. **RoundsBehavior** (Critical)
**File:** `src/runtime/behaviors/RoundsBehavior.ts`

**Changes Needed:**
- Coordinate with ChildAdvancementBehavior on round boundaries
- Only increment round when last child completes (not every next)
- Return PushBlockAction on `onPush()` to start first child immediately
- Add logic to detect "end of round" vs "mid-round" advancement

### 3. **LazyCompilationBehavior** (Medium)
**File:** `src/runtime/behaviors/LazyCompilationBehavior.ts`

**Changes Needed:**
- Ensure proper timing with ChildAdvancementBehavior
- Consider executing AFTER child index increments
- Or modify to request "next child to compile" explicitly

### 4. **RoundsBlock** (Medium)
**File:** `src/runtime/blocks/RoundsBlock.ts`

**Changes Needed:**
- Override or extend `mount()` to push first child automatically
- Implement round boundary detection in `next()`
- Add logic to differentiate "next child" vs "next round"

### 5. **JIT Compiler & Strategies** (High Priority)
**Files:** 
- `src/runtime/JitCompiler.ts`
- `src/runtime/strategies.ts` (RoundsStrategy, EffortStrategy)

**Changes Needed:**
- Pass parent context during child compilation
- Implement metric inheritance system
- EffortStrategy should query parent RoundsBlock for reps
- Add compilation context to `compile()` method signature

### 6. **BlockContext** (Medium)
**File:** `src/runtime/BlockContext.ts`

**Changes Needed:**
- Add method `getParentContext()` to access parent block's context
- Implement context chain for metric inheritance
- Store parent block reference during compilation

### 7. **RuntimeBlock** (Low)
**File:** `src/runtime/RuntimeBlock.ts`

**Changes Needed:**
- Add `parentBlock` field for context chain
- Expose method to query parent behaviors

## Recommended Fix Strategy

### Phase 1: Fix Child Looping (Critical)
1. Modify `ChildAdvancementBehavior` to loop through children based on rounds
2. Add communication between `RoundsBehavior` and `ChildAdvancementBehavior`
3. Implement round boundary detection

### Phase 2: Fix Initial Push (High)
1. Modify `RoundsBehavior.onPush()` to return PushBlockAction for first child
2. Ensure first child compiles and pushes immediately on mount

### Phase 3: Implement Metric Inheritance (High)
1. Add parent context to compilation flow
2. Modify EffortStrategy to read parent RoundsBlock reps
3. Test rep scheme inheritance (21-15-9)

### Phase 4: Timing & Coordination (Medium)
1. Fix behavior execution order
2. Ensure LazyCompilationBehavior compiles correct child
3. Add tests for behavior coordination

### Phase 5: Completion Logic (Medium)
1. Review CompletionBehavior conditions for RoundsBlock
2. Ensure completion only when all rounds truly done
3. Add tests for premature completion scenarios

## Test Cases Needed

1. **Basic 3-round workout:** `(3) Pushups, Situps`
2. **Variable rep scheme:** `(21-15-9) Thrusters, Pullups` (Fran)
3. **Single round:** `(1) 400m Run, 21 KB Swings`
4. **5-round workout:** `(5) Pullups, Pushups, Situps, Air Squats` (Barbara)
5. **Edge case - no children:** `(3)` (should error or handle gracefully)
6. **Edge case - single child:** `(21-15-9) Thrusters` (rep inheritance only)

## Success Criteria

- [ ] Clicking "Next" 7 times completes Fran workout fully
- [ ] All 3 rounds execute: Round 1 (21 reps), Round 2 (15 reps), Round 3 (9 reps)
- [ ] Each round shows correct rep count from inheritance
- [ ] Memory stack reflects current round and reps
- [ ] No premature completion
- [ ] First child pushes automatically on RoundsBlock mount
- [ ] UI displays round progression clearly

## Related Files

- `src/runtime/behaviors/ChildAdvancementBehavior.ts`
- `src/runtime/behaviors/RoundsBehavior.ts`
- `src/runtime/behaviors/LazyCompilationBehavior.ts`
- `src/runtime/behaviors/CompletionBehavior.ts`
- `src/runtime/blocks/RoundsBlock.ts`
- `src/runtime/strategies.ts` (RoundsStrategy)
- `src/runtime/JitCompiler.ts`
- `src/runtime/PopBlockAction.ts`
- `src/runtime/NextAction.ts`
- `src/runtime/PushBlockAction.ts`

## Architectural Insight

The core issue is that **behaviors are too isolated**. They don't communicate:
- ChildAdvancementBehavior doesn't know about rounds
- RoundsBehavior doesn't control child iteration
- LazyCompilationBehavior doesn't coordinate timing
- No shared state or coordination mechanism

**Possible Solution:**
- Introduce a `RoundsChildCoordinator` that combines round + child logic
- Or, make RoundsBehavior own the child iteration entirely
- Or, use a state machine pattern for round/child progression

The current behavior composition model is flexible but lacks coordination mechanisms for complex scenarios like "loop children N times."

---

## Deep Dive: Understanding Loop Types and Child Grouping

### Research Findings: Children Structure

Based on analysis of `src/CodeStatement.ts` and `src/parser/timer.visitor.ts`:

**Children are stored as grouped arrays:**
```typescript
children: number[][]  // Array of groups, each group is an array of statement IDs
```

**Example from Fran:** `(21-15-9) Thrusters, Pullups`
```typescript
{
  id: 1,
  fragments: [RoundsFragment(3, repScheme: [21, 15, 9])],
  children: [[2], [3]]  // Two groups: [Thrusters], [Pullups]
}
```

**Example with compose (+):** `(3) + 5 Pullups, + 10 Pushups, 15 Squats`
```typescript
{
  id: 1,
  fragments: [RoundsFragment(3)],
  children: [[2, 3], [4]]  // Two groups: [Pullups, Pushups], [Squats]
}
```

### Three Types of Lap Fragments (from `src/fragments/LapFragment.ts`)

```typescript
export type GroupType = 'round' | 'compose' | 'repeat';
```

1. **`compose` (`+`)**: Groups children together, executed as a unit
   - Example: `+ 5 Pullups` and `+ 10 Pushups` form one group
   - Child groups with multiple IDs: `[[2, 3]]`

2. **`round` (`-`)**: Creates separate rounds/laps
   - Example: `- 400m Run` creates a discrete lap boundary
   - Each forms its own group: `[[2], [3]]`

3. **`repeat` (default/no prefix)**: Standard exercise repetition
   - Example: `21 Thrusters` with no prefix
   - Default behavior when no lap fragment present

### Loop Patterns Found in Codebase

From analysis of `stories/runtime/crossfit.stories.tsx` and `stories/runtime/Runtime.stories.tsx`:

#### Pattern 1: Fixed Rounds with Same Reps
**Example:** `(3) Pullups, Pushups, Situps` (Helen, Barbara)

```typescript
totalRounds: 3
repScheme: undefined  // All rounds use same reps
children: [[2], [3], [4]]  // 3 child groups
```

**Looping Logic:**
- `index`: 0, 1, 2, 3, 4, 5, 6, 7, 8 (9 total next() calls)
- `position`: index % children.length = 0, 1, 2, 0, 1, 2, 0, 1, 2
- `rounds`: Math.floor(index / children.length) = 0, 0, 0, 1, 1, 1, 2, 2, 2
- Complete when: rounds >= totalRounds (rounds === 3)

#### Pattern 2: Variable Rep Scheme (Descending)
**Example:** `(21-15-9) Thrusters, Pullups` (Fran, Diane, Elizabeth)

```typescript
totalRounds: 3
repScheme: [21, 15, 9]
children: [[2], [3]]  // 2 child groups
```

**Looping Logic:**
- `index`: 0, 1, 2, 3, 4, 5 (6 total next() calls)
- `position`: index % children.length = 0, 1, 0, 1, 0, 1
- `rounds`: Math.floor(index / children.length) = 0, 0, 1, 1, 2, 2
- `currentReps`: repScheme[rounds] = 21, 21, 15, 15, 9, 9
- Complete when: rounds >= totalRounds (rounds === 3)

#### Pattern 3: Variable Rep Scheme (Ascending)
**Example:** `(9-15-21) Thrusters, Pullups`

Same logic as Pattern 2, but repScheme: [9, 15, 21]

#### Pattern 4: Complex Rep Scheme
**Example:** `(50-40-30-20-10) Double-Unders, Situps` (Annie)

```typescript
totalRounds: 5
repScheme: [50, 40, 30, 20, 10]
children: [[2], [3]]  // 2 child groups
```

**Looping Logic:**
- `index`: 0..9 (10 total next() calls)
- `position`: 0, 1, 0, 1, 0, 1, 0, 1, 0, 1
- `rounds`: 0, 0, 1, 1, 2, 2, 3, 3, 4, 4
- `currentReps`: 50, 50, 40, 40, 30, 30, 20, 20, 10, 10
- Complete when: rounds >= 5

#### Pattern 5: AMRAP (As Many Rounds As Possible)
**Example:** `20:00 AMRAP 5 Pullups, 10 Pushups, 15 Squats` (Cindy, Mary)

```typescript
totalRounds: Infinity  // Or a very high number
children: [[2], [3], [4]]  // 3 child groups
timerDuration: 1200000  // 20 minutes in ms
```

**Looping Logic:**
- `index`: 0, 1, 2, 3, 4, 5... (unlimited)
- `position`: index % children.length = cycles forever
- `rounds`: Math.floor(index / children.length) = increments forever
- Complete when: timer expires (NOT when rounds complete)

#### Pattern 6: EMOM (Every Minute On the Minute)
**Example:** `(30) :60 EMOM + 5 Pullups, + 10 Pushups, + 15 Squats` (Chelsea)

```typescript
totalRounds: 30
children: [[2, 3, 4]]  // ONE group with multiple exercises (compose)
intervalDuration: 60000  // 60 seconds in ms
```

**Looping Logic:**
- `index`: 0, 1, 2... 29 (30 total next() calls)
- `position`: 0, 0, 0... 0 (always group 0 because only 1 group)
- `rounds`: index (since children.length === 1)
- Complete when: rounds >= totalRounds (rounds === 30)
- **Special:** Timer resets every minute, all exercises in group execute within that minute

#### Pattern 7: Ladder/Pyramid Rep Scheme
**Example:** `(10-9-8-7-6-5-4-3-2-1) Deadlift, Bench, Clean` (Linda)

```typescript
totalRounds: 10
repScheme: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
children: [[2], [3], [4]]  // 3 child groups
```

**Looping Logic:**
- `index`: 0..29 (30 total next() calls)
- `position`: 0, 1, 2, 0, 1, 2... (cycles through 3 children)
- `rounds`: 0, 0, 0, 1, 1, 1, 2, 2, 2... (0-9)
- `currentReps`: 10, 10, 10, 9, 9, 9, 8, 8, 8...
- Complete when: rounds >= 10

### Proposed Universal Loop State

Based on the research above, ALL loop behaviors should track these three values:

```typescript
interface LoopState {
  /**
   * Total number of times next() has been called
   * Increments on every next() call, never resets
   * Range: 0 to Infinity
   */
  index: number;
  
  /**
   * Current child group position (0-indexed)
   * Calculated as: index % childGroups.length
   * Determines which child group to compile next
   * Range: 0 to (childGroups.length - 1)
   */
  position: number;
  
  /**
   * Number of completed rounds (0-indexed while executing, 1-indexed for display)
   * Calculated as: Math.floor(index / childGroups.length)
   * Increments when position wraps back to 0
   * Range: 0 to totalRounds
   */
  rounds: number;
}
```

### Loop Behavior Variations

Different loop types use the same core state but different completion logic:

#### 1. FixedRoundsLoopBehavior
**Use Case:** `(3) Pullups, Pushups` - Fixed number of rounds, same reps each time

```typescript
class FixedRoundsLoopBehavior {
  private index: number = 0;
  
  onNext(): IRuntimeAction[] {
    // Calculate derived values
    const position = this.index % this.childGroups.length;
    const rounds = Math.floor(this.index / this.childGroups.length);
    
    // Check completion BEFORE incrementing
    if (rounds >= this.totalRounds) {
      return []; // Complete
    }
    
    // Increment index
    this.index++;
    
    // Compile child at position
    const childGroup = this.childGroups[position];
    return [new PushBlockAction(compile(childGroup))];
  }
  
  isComplete(): boolean {
    const rounds = Math.floor(this.index / this.childGroups.length);
    return rounds >= this.totalRounds;
  }
}
```

#### 2. RepSchemeLoopBehavior
**Use Case:** `(21-15-9) Thrusters, Pullups` - Variable reps per round

```typescript
class RepSchemeLoopBehavior {
  private index: number = 0;
  
  onNext(): IRuntimeAction[] {
    const position = this.index % this.childGroups.length;
    const rounds = Math.floor(this.index / this.childGroups.length);
    
    // Check completion
    if (rounds >= this.repScheme.length) {
      return []; // Complete
    }
    
    // Get reps for current round
    const currentReps = this.repScheme[rounds];
    
    // Increment index
    this.index++;
    
    // Compile child with rep context
    const childGroup = this.childGroups[position];
    const context = { reps: currentReps, round: rounds + 1 };
    return [new PushBlockAction(compile(childGroup, context))];
  }
  
  getRepsForCurrentRound(): number {
    const rounds = Math.floor(this.index / this.childGroups.length);
    return this.repScheme[rounds];
  }
}
```

#### 3. TimeBoundLoopBehavior (AMRAP)
**Use Case:** `20:00 AMRAP Pullups, Pushups` - Loop until timer expires

```typescript
class TimeBoundLoopBehavior {
  private index: number = 0;
  
  onNext(runtime: IScriptRuntime): IRuntimeAction[] {
    const position = this.index % this.childGroups.length;
    const rounds = Math.floor(this.index / this.childGroups.length);
    
    // Check if timer expired (completion logic in TimerBehavior)
    if (this.isTimerExpired(runtime)) {
      return []; // Complete
    }
    
    // Increment index
    this.index++;
    
    // Compile child - rounds increment forever until timer stops
    const childGroup = this.childGroups[position];
    const context = { round: rounds + 1 };
    return [new PushBlockAction(compile(childGroup, context))];
  }
  
  isComplete(runtime: IScriptRuntime): boolean {
    // Complete when timer expires, NOT when rounds complete
    return this.isTimerExpired(runtime);
  }
  
  getCompletedRounds(): number {
    return Math.floor(this.index / this.childGroups.length);
  }
}
```

#### 4. IntervalLoopBehavior (EMOM)
**Use Case:** `(30) :60 EMOM + Pullups, + Pushups` - Timed intervals with grouping

```typescript
class IntervalLoopBehavior {
  private index: number = 0;
  private intervalDurationMs: number = 60000;
  
  onNext(runtime: IScriptRuntime): IRuntimeAction[] {
    const position = this.index % this.childGroups.length;
    const rounds = Math.floor(this.index / this.childGroups.length);
    
    // Check completion
    if (rounds >= this.totalRounds) {
      return []; // Complete
    }
    
    // Increment index
    this.index++;
    
    // Compile child with interval context
    const childGroup = this.childGroups[position];
    const context = {
      interval: rounds + 1,
      intervalDurationMs: this.intervalDurationMs
    };
    return [new PushBlockAction(compile(childGroup, context))];
  }
  
  // Special: Timer resets every interval
  onIntervalComplete(): void {
    // Reset interval timer but don't affect index/position/rounds
    this.resetIntervalTimer();
  }
}
```

### Key Insight: Child Groups vs Individual Children

**Critical Discovery:** Children are stored as **groups**, not flat arrays!

```typescript
// WRONG - current ChildAdvancementBehavior assumption
children: CodeStatement[]  // Flat array

// CORRECT - actual structure
children: number[][]  // Array of groups
```

**Impact on Looping:**
- Position indexes into **child groups**, not individual statements
- When position = 0, we compile group 0 (which might be `[2]` or `[2, 3, 4]`)
- Compose fragments (`+`) group multiple statements together
- Round fragments (`-`) keep statements separate

**Example:**
```
(3)
  + 5 Pullups    <- Group 0: [statement2, statement3]
  + 10 Pushups
  20 Squats      <- Group 1: [statement4]
```

Loop progression:
- index=0, position=0: compile group [2, 3] (Pullups + Pushups together)
- index=1, position=1: compile group [4] (Squats alone)
- index=2, position=0: compile group [2, 3] again (round 2)
- index=3, position=1: compile group [4] again (round 2)
- And so on...

### Unified Solution: LoopCoordinatorBehavior

Replace the isolated behaviors with a single coordinator:

```typescript
class LoopCoordinatorBehavior implements IRuntimeBehavior {
  // Core state
  private index: number = 0;
  
  // Configuration
  private readonly childGroups: number[][];
  private readonly loopType: 'fixed' | 'repScheme' | 'timeBound' | 'interval';
  private readonly totalRounds?: number;
  private readonly repScheme?: number[];
  private readonly timerDurationMs?: number;
  private readonly intervalDurationMs?: number;
  
  constructor(config: LoopConfig) {
    this.childGroups = config.childGroups;
    this.loopType = config.loopType;
    this.totalRounds = config.totalRounds;
    this.repScheme = config.repScheme;
    this.timerDurationMs = config.timerDurationMs;
    this.intervalDurationMs = config.intervalDurationMs;
  }
  
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Calculate derived state
    const position = this.index % this.childGroups.length;
    const rounds = Math.floor(this.index / this.childGroups.length);
    
    // Check completion based on loop type
    if (this.isComplete(runtime, rounds)) {
      return [];
    }
    
    // Get compilation context for current round
    const context = this.getCompilationContext(rounds, position);
    
    // Increment index AFTER getting context but BEFORE compilation
    this.index++;
    
    // Get child group to compile
    const childGroup = this.childGroups[position];
    const childStatements = runtime.script.getIds(childGroup);
    
    // Compile child group
    const compiledBlock = runtime.jit.compile(childStatements, runtime);
    if (!compiledBlock) {
      return [];
    }
    
    // TODO: Pass context to compiled block for metric inheritance
    
    return [new PushBlockAction(compiledBlock)];
  }
  
  private isComplete(runtime: IScriptRuntime, rounds: number): boolean {
    switch (this.loopType) {
      case 'fixed':
        return rounds >= this.totalRounds!;
      
      case 'repScheme':
        return rounds >= this.repScheme!.length;
      
      case 'timeBound':
        return this.isTimerExpired(runtime);
      
      case 'interval':
        return rounds >= this.totalRounds!;
      
      default:
        return true;
    }
  }
  
  private getCompilationContext(rounds: number, position: number): CompilationContext {
    const context: any = {
      round: rounds + 1,  // 1-indexed for display
      position: position,
      totalRounds: this.totalRounds,
    };
    
    // Add rep scheme if available
    if (this.repScheme && rounds < this.repScheme.length) {
      context.reps = this.repScheme[rounds];
    }
    
    // Add interval info if EMOM
    if (this.loopType === 'interval') {
      context.intervalDurationMs = this.intervalDurationMs;
    }
    
    return context;
  }
  
  // Public API for context access
  public getState(): LoopState {
    return {
      index: this.index,
      position: this.index % this.childGroups.length,
      rounds: Math.floor(this.index / this.childGroups.length),
    };
  }
  
  public getRepsForCurrentRound(): number | undefined {
    const rounds = Math.floor(this.index / this.childGroups.length);
    return this.repScheme?.[rounds];
  }
}
```

### Migration Path

1. **Phase 1:** Create `LoopCoordinatorBehavior` with `index`, `position`, `rounds` tracking
2. **Phase 2:** Implement loop type detection from fragments (Rounds, Timer, etc.)
3. **Phase 3:** Replace `RoundsBehavior` + `ChildAdvancementBehavior` with coordinator
4. **Phase 4:** Add compilation context passing to JIT compiler
5. **Phase 5:** Update strategies to use LoopCoordinatorBehavior

### Benefits of Unified Approach

- **Single source of truth** for loop state (index, position, rounds)
- **Works for all loop types** (fixed, repScheme, AMRAP, EMOM, etc.)
- **Proper child group handling** (respects compose/round/repeat)
- **Clean context passing** for metric inheritance
- **Simpler testing** - one behavior to test, not three coordinating
- **Clear completion logic** per loop type
