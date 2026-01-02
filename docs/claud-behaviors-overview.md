# Claude Behaviors Overview: Single-Responsibility Transition

> **Purpose**: This document synthesizes the overlap between current compound behaviors and proposes a clear transition path to single-responsibility behaviors. It serves as a practical roadmap for refactoring the runtime behavior system.

---

## Executive Summary

The current behavior system conflates multiple concerns within single classes. For example, `BoundLoopBehavior` manages both **loop termination logic** (deciding when to pop) and **reporting** (emitting `TrackRoundAction`). This coupling creates:

1. **Testing complexity** — behaviors must be tested with all their side effects
2. **Composition rigidity** — can't mix-and-match capabilities  
3. **Hidden dependencies** — implicit coupling between behaviors

The solution is to decompose behaviors into atomic units following the **Single Responsibility Principle**.

---

## Current vs. Target Behavior Mapping

### Legend

| Symbol | Meaning |
|--------|---------|
| ⚠️ | Current behavior mixes responsibilities |
| ✅ | Already aligned with single-responsibility |
| 🔧 | Needs refactoring |
| 🆕 | New behavior to create |

---

## 1. Looping Behaviors

**Responsibility**: Decide whether a block should continue or complete based on iteration counts.

| Target Behavior | Current Implementation | Status | Responsibilities to Preserve |
|:----------------|:-----------------------|:-------|:-----------------------------|
| **SingleRepeater** | `SinglePassBehavior.ts` | 🔧 Rename | Pop after exactly one pass |
| **BoundRepeater** | `BoundLoopBehavior.ts` | ⚠️ Extract | Pop when `round > N` |
| **UnboundRepeater** | `UnboundLoopBehavior.ts` | ⚠️ Extract | Never pop (run indefinitely) |

### Overlap Analysis: BoundLoopBehavior

```typescript
// Current BoundLoopBehavior.onNext() does TWO things:
onNext(block: IRuntimeBlock): IRuntimeAction[] {
    const round = this.getRound(block);
    
    // 🔴 REPORTING (should be separate behavior)
    actions.push(new TrackRoundAction(block.key.toString(), round, this.totalRounds));
    
    // ✅ LOOPING (core responsibility)
    if (round > this.totalRounds) {
        this._isComplete = true;
        actions.push(new PopBlockAction());
    }
}
```

### Transition Steps

1. **Create `BoundRepeater`** — Pure looping logic only
   ```typescript
   class BoundRepeater implements IRuntimeBehavior {
     onNext(block: IRuntimeBlock): IRuntimeAction[] {
       const round = this.getRoundSource(block).getRound();
       if (round > this.totalRounds) {
         return [new PopBlockAction()];
       }
       return [];
     }
   }
   ```

2. **Create `ReportRoundsBehavior`** — Pure reporting
   ```typescript
   class ReportRoundsBehavior implements IRuntimeBehavior {
     onNext(block: IRuntimeBlock): IRuntimeAction[] {
       const round = this.getRoundSource(block).getRound();
       return [new TrackRoundAction(block.key, round, this.totalRounds)];
     }
   }
   ```

3. **Update strategies** to compose both behaviors

---

## 2. Rounds Behaviors

**Responsibility**: Calculate and maintain the "current round" index.

| Target Behavior | Current Implementation | Status | Description |
|:----------------|:-----------------------|:-------|:------------|
| **RoundPerBlock** | `RoundPerNextBehavior.ts` | ✅ Mostly aligned | Increment on each `onNext` |
| **RoundPerLoop** | `RoundPerLoopBehavior.ts` | ✅ Mostly aligned | Increment when child index wraps |

### Design Principle

> **Only ONE round counter should be authoritative per block.**

The round counter behaviors don't emit side effects — they just maintain state. Other behaviors (reporting, display) should *read* from them.

### Current Dependency Pattern

```
BoundLoopBehavior
    └─► getRound(block)
            ├─► RoundPerNextBehavior.getRound()   // Option A
            └─► RoundPerLoopBehavior.getRound()   // Option B
```

This is a **query dependency** (good), but the reporting logic is still embedded (bad).

---

## 3. Timer Behaviors

**Responsibility**: Manage internal clock state (started, paused, elapsed, duration).

| Target Behavior | Current Implementation | Status | Description |
|:----------------|:-----------------------|:-------|:------------|
| **UnboundTimedBehavior** | `UnboundTimerBehavior.ts` | ✅ Exists | Stopwatch (counts up forever) |
| **BoundTimeBehavior** | `BoundTimerBehavior.ts` | ✅ Exists | Countdown with fixed duration |

### Overlap Analysis: TimerBehavior

The base `TimerBehavior` currently does:
- ✅ Time tracking (start, stop, pause, resume)
- ✅ Event emission (`timer:started`, `timer:complete`) via actions
- 🔴 State management delegation to `TimerStateManager`

The coupling with `TimerStateManager` for display updates creates an implicit dependency between timing logic and UI state.

### Transition Steps

1. **Keep `TimerBehavior`** as pure time tracking
2. **Move display updates** to `DisplayTimerBehavior`
3. **Make `TimerStateManager` optional** — only used when display behavior is attached

---

## 4. Reporting Behaviors

**Responsibility**: Emit side-effect actions for history/analytics systems.

| Target Behavior | Current Location | Status | Action Emitted |
|:----------------|:-----------------|:-------|:---------------|
| **Report Rounds Behavior** | Embedded in `BoundLoopBehavior`, `UnboundLoopBehavior` | 🆕 Extract | `TrackRoundAction` |
| **Report Metrics Behavior** | Scattered | 🆕 Create | `TrackMetricAction` |

### Key Design Rule

> **Reporting behaviors should be pure observers** — they read state from other behaviors and emit tracking actions. They should never control flow (no `PopBlockAction`).

### Extraction Strategy

```typescript
// NEW: ReportRoundsBehavior
class ReportRoundsBehavior implements IRuntimeBehavior {
  constructor(private totalRounds?: number) {}
  
  onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    // Find the authoritative round counter
    const round = this.findRoundCounter(block).getRound();
    return [new TrackRoundAction(block.key.toString(), round, this.totalRounds)];
  }
  
  private findRoundCounter(block: IRuntimeBlock): IRoundCounter {
    return block.getBehavior(RoundPerLoopBehavior) 
        || block.getBehavior(RoundPerNextBehavior)
        || new NullRoundCounter();
  }
}
```

---

## 5. Display Behaviors

**Responsibility**: Update shared memory for UI rendering.

| Target Behavior | Current Location | Status | Memory Updated |
|:----------------|:-----------------|:-------|:---------------|
| **Display Timer Behavior** | Part of `TimerStateManager` | 🆕 Extract | Timer display state |
| **Display Stopwatch Behavior** | Implicit | 🆕 Create | Count-up formatted time |
| **Display Current Time Behavior** | Part of `LoopCoordinatorBehavior` | 🆕 Extract | Wall-clock time for AMRAP |
| **Display Empty Timer Behavior** | None | 🆕 Create | Placeholder/idle state |

### Overlap in LoopCoordinatorBehavior

The `LoopCoordinatorBehavior` currently handles display updates:

```typescript
// LoopCoordinatorBehavior.emitRoundChanged() does:
// 🔴 Display state updates (should be DisplayRoundsBehavior)
// 🔴 Span/lap timer management (should be DisplayTimerBehavior)
// ✅ Round change event emission (core responsibility)
```

### Transition Strategy

1. **Create `DisplayRoundsBehavior`**
   - Listens for `rounds:changed` events
   - Emits `SetRoundsDisplayAction`

2. **Create `DisplayTimerBehavior`**  
   - Manages `TimerStateManager` lifecycle
   - Writes timer state to shared memory

3. **Keep coordinator focused** on:
   - Child group selection
   - Index/position management
   - `CompileAndPushBlockAction` production

---

## 6. Sound Behaviors

**Responsibility**: Trigger audio cues based on state changes.

| Target Behavior | Current Implementation | Status | Trigger Condition |
|:----------------|:-----------------------|:-------|:------------------|
| **PlaySoundAtElapsedTime** | Part of `SoundBehavior` | 🔧 Config-based | `elapsed >= threshold` |
| **PlaySoundAtRemainingTime** | Part of `SoundBehavior` | 🔧 Config-based | `remaining <= threshold` |
| **PlaySoundsOnStart** | Implicit | 🆕 Create | On `onPush` |
| **PlaySoundsOnNext** | Implicit | 🆕 Create | On `onNext` (round start) |
| **PlaySoundsOnStop** | Implicit | 🆕 Create | On `onPop` |

### Current SoundBehavior Analysis

`SoundBehavior` is already well-structured but is a **compound behavior** that handles both elapsed and remaining triggers through configuration:

```typescript
// Current: One behavior with two modes
new SoundBehavior({
  direction: 'down',   // switches logic
  durationMs: 600000,
  cues: [...]
});
```

### Transition Options

**Option A**: Keep compound, rename to `ThresholdSoundBehavior`
- Pros: Less code change, already tested
- Cons: Still mixing concerns

**Option B**: Split into atomic behaviors
- `PlaySoundAtElapsedTime` — only handles count-up
- `PlaySoundAtRemainingTime` — only handles countdown
- Pros: Maximum composability
- Cons: More files, potential duplication

**Recommended**: Option A with a shared internal engine. The lifecycle-based sounds (`OnStart`, `OnNext`, `OnStop`) should be separate behaviors.

---

## Overlap Matrix (Decision Table)

This matrix clarifies ownership boundaries:

| Concern | **Owned By** | **NOT Owned By** |
|---------|-------------|------------------|
| Round number calculation | `RoundPer*` behaviors | Loopers, reporters, display |
| Block completion (pop) | `*Repeater` behaviors | Round counters, reporters |
| Tracker round updates | `ReportRoundsBehavior` | Repeaters |
| Metric reporting | `ReportMetricsBehavior` | Loop/timer behaviors |
| Display state updates | `Display*` behaviors | Coordinators, repeaters |
| Sound cue playback | `PlaySound*` behaviors | Timers, repeaters |
| Child push sequencing | `LoopCoordinatorBehavior` | Tracking, display, sound |

---

## Composition Recipes

### Recipe 1: Simple "Do This Once"

```typescript
block.attachBehaviors([
  new RoundPerNextBehavior(),    // Counts rounds
  new SingleRepeater(),          // Pops after 1 round
]);
```

### Recipe 2: "For N Rounds"

```typescript
block.attachBehaviors([
  new RoundPerLoopBehavior(),           // Counts rounds on wrap
  new BoundRepeater(5),                 // Pops after 5 rounds
  new ReportRoundsBehavior(5),          // Reports progress
  new DisplayRoundsBehavior(),          // Updates UI
]);
```

### Recipe 3: "AMRAP Until Time Expires"

```typescript
block.attachBehaviors([
  new BoundTimeBehavior(600000, 'down'), // 10-minute countdown
  new UnboundRepeater(),                 // Keep looping
  new CompleteWhenTimerExpires(),        // Pop when timer ends
  new RoundPerLoopBehavior(),            // Track rounds
  new ReportRoundsBehavior(),            // Report to history
  new PlaySoundAtRemainingTime([30000, 10000]), // Warnings
]);
```

### Recipe 4: "EMOM Intervals"

```typescript
block.attachBehaviors([
  new BoundTimeBehavior(60000, 'down'),  // 1-minute interval
  new BoundRepeater(10),                 // 10 intervals
  new IntervalResetBehavior(),           // Resets timer on wrap
  new RoundPerLoopBehavior(),
  new DisplayTimerBehavior(),
  new PlaySoundsOnStart(),               // Beep on interval start
]);
```

---

## Transition Roadmap

### Phase 1: Define Boundaries (Week 1)
- [ ] Create interface contracts for each behavior category
- [ ] Add linting rules: "Behaviors must not emit actions from multiple categories"

### Phase 2: Extract Reporting (Week 2)
- [ ] Create `ReportRoundsBehavior`
- [ ] Refactor `BoundLoopBehavior` → `BoundRepeater` (remove `TrackRoundAction`)
- [ ] Refactor `UnboundLoopBehavior` → `UnboundRepeater` (remove reporting)
- [ ] Update compilation strategies to attach both behaviors

### Phase 3: Extract Display (Week 3)
- [ ] Create `DisplayRoundsBehavior`
- [ ] Create `DisplayTimerBehavior` (extract from `TimerStateManager`)
- [ ] Refactor `LoopCoordinatorBehavior` to remove display logic

### Phase 4: Split Sound Behaviors (Week 4)
- [ ] Create lifecycle-based sound behaviors (`OnStart`, `OnNext`, `OnStop`)
- [ ] Keep `SoundBehavior` as `ThresholdSoundBehavior` (compatibility layer)

### Phase 5: Deprecate Compound Behaviors (Week 5+)
- [ ] Mark `BoundLoopBehavior`, `UnboundLoopBehavior` as deprecated
- [ ] Add migration warnings
- [ ] Update all strategies to use single-responsibility compositions

---

## Verification Checklist

After refactoring, each behavior should pass this checklist:

✅ **Single Responsibility**: Does this behavior do exactly ONE thing?  
✅ **No Cross-Category Actions**: Does it only emit one type of action (stack, tracking, display, sound)?  
✅ **Explicit Dependencies**: Are dependencies injected, not discovered at runtime?  
✅ **Testable in Isolation**: Can you test this behavior with a stub block and no other behaviors?  
✅ **Documentation**: Is the single responsibility clearly documented in the class JSDoc?

---

## Open Questions

1. **CompleteWhenTimerExpires**: Should timer expiry cause `PopBlockAction`, or should the block just stop producing children?

2. **Interval Gating**: Should interval waiting logic live in `LoopCoordinatorBehavior` or a dedicated `IntervalGateBehavior`?

3. **Round Counter Discovery**: Should behaviors that need a round count:
   - (A) Query the block for any available counter?
   - (B) Receive an explicit `IRoundCounter` dependency?

**Recommendation**: Option (B) for new code — explicit dependencies are easier to test and reason about.

---

## References

- [Gemini Behaviors Overview](./gemini-behaviors-overview.md) — Foundational architecture
- [GPT Behaviors Overview](./gpt-behaviors-overview.md) — Detailed overlap analysis
- [LoopCoordinatorBehavior](../src/runtime/behaviors/LoopCoordinatorBehavior.ts) — Primary compound behavior
- [BoundLoopBehavior](../src/runtime/behaviors/BoundLoopBehavior.ts) — Example of mixed responsibilities
