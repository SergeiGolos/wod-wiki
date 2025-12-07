# Analysis of Missing UI Updates

## 1. Issue: Root Block Label displaying "root" instead of "Total Time"

### Observation
The user stack view displays a chip labeled "root" with a running man icon (effort type), despite the `RuntimeBlock` label being explicitly set to "Total Time" in the `RuntimeFactory`.

### Root Cause
The `RuntimeFactory` initializes the root block's `BlockContext` with an `exerciseId` of `'root'`.

```typescript
// RuntimeFactory.ts
const context = new BlockContext(runtime, blockKey.toString(), 'root'); // <--- 'root' is passed as exerciseId
```

When generating fragments for display in `metricsToFragments.ts`, the logic prioritizes the existence of an `exerciseId` to create an "Effort" fragment.

```typescript
// metricsToFragments.ts
if (metric.exerciseId) {
    fragments.push({
        type: 'effort',
        fragmentType: FragmentType.Effort,
        value: metric.exerciseId, // <--- Value becomes 'root'
        image: metric.exerciseId,
    });
}
```

Since the root block's context has `exerciseId='root'`, any metrics or span data associated with it will carry this `exerciseId`. The display logic sees this and renders an effort chip with the text "root", overriding the block's `label` property (which is used as valid fallback but is preempted here).

### Proposed Fix
Update `RuntimeFactory.ts` to pass `"Total Time"` (or `undefined` if we want it to fall back to the label) as the `exerciseId` when creating the root `BlockContext`.

---

## 2. Issue: "Waiting To Start" Idle Block Missing from Stack

### Observation
The "Waiting To Start" idle block, which is pushed to the runtime stack during initialization, does not appear in the UI stack view.

### Root Cause
The UI stack view in `TimerDisplay.tsx` is driven by `timerStack`, which is derived from `useTimerStack()`.

```typescript
// TimerDisplay.tsx
const timerStack = useTimerStack();
// ...
timerStack.forEach(...) // Generates display items
```

The `timerStack` only contains blocks that have pushed a valid `TimerBehavior` to the memory state.

The `IdleBlock` created in `RootLifecycleBehavior.ts` is configured with `IdleBehavior`, but **NOT** `TimerBehavior`.

```typescript
// RootLifecycleBehavior.ts
const behaviors = [
    new IdleBehavior({ ... }) 
    // No TimerBehavior added here
];
```

Because the Idle Block lacks a `TimerBehavior`, it never registers itself in the `timerStack` in memory. Consequently, `TimerDisplay` never iterates over it, and it remains invisible in the stack list.

### Proposed Fix
The `IdleBlock` conceptually represents a period of time (waiting), so it is valid for it to have a timer (likely counting UP to show how long we've been waiting).

We should add a `TimerBehavior` to the `IdleBlock` configuration in `RootLifecycleBehavior.ts`. This will:
1.  Register the block in the `timerStack`.
2.  Allow `TimerDisplay` to render it.
3.  Enable tracking of the "idle" duration in the main timer ring if focused.

```typescript
// RootLifecycleBehavior.ts
const behaviors = [
    new IdleBehavior({ ... }),
    new TimerBehavior('up', undefined, label, 'secondary') // Add this
];
```
