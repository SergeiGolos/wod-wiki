# Fix Plan: AMRAP Child Rotation (Implicit Looping)

## Problem
When a block has a Timer (e.g., `20:00`) and children (e.g., exercises), but no explicit "AMRAP" or "Rounds" keyword, the current JIT compilation strategy defaults to a **Single Pass** execution of the children. This means the block finishes after completing the last child, even if the timer is still running.

**Reproduction:** `tests/blocks/amrap_child_rotation_test.ts` fails because the stack empties after the last squat, instead of restarting with pullups.

## Root Cause
1. `GenericTimerStrategy` (Component, Priority 50) adds `BoundTimerBehavior` (or Unbound) but **does not** add any Loop behavior.
2. `ChildrenStrategy` (Enhancement, Priority 50) runs. It checks for existing loop behaviors (`BoundLoopBehavior`, `UnboundLoopBehavior`, `RoundPerLoopBehavior`).
3. finding none, it defaults to adding `RoundPerLoopBehavior` and `SinglePassBehavior`.
4. `SinglePassBehavior` causes the block to pop itself after the `ChildIndexBehavior` reaches the end of the children list.

## Proposed Solution
We need to infer that if a **Timer** is present, the default behavior for children should be **Infinite Loop** (AMRAP style) until the timer expires, rather than a Single Pass.

### Option 1: Update `ChildrenStrategy`
Modify `src/runtime/compiler/strategies/enhancements/ChildrenStrategy.ts` to check if a **Timer Behavior** exists on the block builder.

- If `BoundTimerBehavior` or `UnboundTimerBehavior` is present:
    - Add `UnboundLoopBehavior` (infinite loop).
- Else:
    - Add `SinglePassBehavior` (default for non-timed lists).

**Logic Change:**
```typescript
const hasTimer = builder.hasBehavior(BoundTimerBehavior) || builder.hasBehavior(UnboundTimerBehavior);

if (!hasLoop) {
    builder.addBehavior(new RoundPerLoopBehavior());
    if (hasTimer) {
        // Implicit AMRAP: Loop forever until timer (which is a separate behavior) kills the block
        builder.addBehavior(new UnboundLoopBehavior());
    } else {
        // Standard list: Run once and finish
        builder.addBehavior(new SinglePassBehavior());
    }
}
```

### Option 2: Update `GenericTimerStrategy`
Modify `GenericTimerStrategy` to explicitly add `UnboundLoopBehavior`.
- Pros: Keeps timer logic encapsulated.
- Cons: Timer doesn't always imply looping children (e.g. "For Time" 21-15-9 is a set structure, but that's handled by Logic strategies usually). If we just have "20:00", it usually implies AMRAP.

### Recommendation
**Option 1** is safer because `ChildrenStrategy` is responsible for how children are iterated. It currently makes the decision to use `SinglePassBehavior`. It should be smart enough to know that if we are timed, we probably want to keep going.

## Verification
1. Apply the fix in `ChildrenStrategy.ts`.
2. Run `tests/blocks/amrap_child_rotation_test.ts`.
3. Verify that the stack depth remains 2 and the first child is active again after the last child completes.

## Pre-requisites
- Ensure `UnboundLoopBehavior` is correctly imported in `ChildrenStrategy`.
- Ensure `BoundTimerBehavior` and `UnboundTimerBehavior` are imported for the check.
