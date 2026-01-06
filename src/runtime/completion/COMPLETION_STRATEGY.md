# Completion Strategy Pattern Guide

## Overview

The Completion Strategy Pattern consolidates block completion logic that was previously scattered across multiple behaviors. This provides a unified, testable approach to completion detection with consistent semantics.

## Problem Statement

Prior to consolidation, completion logic was implemented in 5 different behaviors:
- `CompletionBehavior` - Generic condition-based completion
- `BoundLoopBehavior` - Round count based completion
- `SinglePassBehavior` - Child exhaustion based completion
- `PopOnNextBehavior` - Immediate completion on next()
- `PopOnEventBehavior` - Event-triggered completion

This led to:
- **Redundant logic** across multiple behaviors
- **Inconsistent completion semantics**
- **Difficult testing** - completion logic embedded in behaviors
- **Hard to add new completion types**

## Solution: Strategy Pattern

The `ICompletionStrategy` interface provides a consistent contract for all completion detection:

```typescript
interface ICompletionStrategy {
    shouldComplete(block: IRuntimeBlock, now: Date): boolean;
    getCompletionActions(block: IRuntimeBlock, now: Date): IRuntimeAction[];
    getWatchedEvents(): string[];
    getCompletionReason?(): string;
}
```

## Architecture

```
StrategyBasedCompletionBehavior
    ↓ delegates to
ICompletionStrategy (interface)
    ↑ implemented by
┌─────────────────┬────────────────────┐
│ TimerCompletion │ ConditionCompletion│
│    Strategy     │     Strategy       │
└─────────────────┴────────────────────┘
```

## Provided Strategies

### TimerCompletionStrategy

Completes block when timer expires.

**Use for:** Time-bound workouts (AMRAP, For Time, Countdown)

```typescript
const timer = new BoundTimerBehavior(60000, 'down');
const completion = new StrategyBasedCompletionBehavior(
    new TimerCompletionStrategy(timer)
);
```

**Events watched:** `['timer:tick', 'timer:complete']`

### ConditionCompletionStrategy

Completes block when custom condition is met.

**Use for:** Custom completion logic, state-based completion

```typescript
const completion = new StrategyBasedCompletionBehavior(
    new ConditionCompletionStrategy(
        (block, now) => block.state.isComplete === true,
        ['custom:event'],
        'custom_condition_met'
    )
);
```

**Events watched:** Configurable (passed in constructor)

## Usage Examples

### Basic Timer Completion (via TimerBundle)

TimerBundle automatically uses TimerCompletionStrategy:

```typescript
// Completion strategy is automatically included
behaviors.push(...TimerBundle.create({
    direction: 'down',
    durationMs: 60000
}));
```

### Custom Condition Completion

```typescript
import { StrategyBasedCompletionBehavior } from '@/runtime/completion';
import { ConditionCompletionStrategy } from '@/runtime/completion';

// Complete when all children are done
const completion = new StrategyBasedCompletionBehavior(
    new ConditionCompletionStrategy(
        (block, now) => {
            const childIndex = block.getBehavior(ChildIndexBehavior);
            return childIndex?.isExhausted() ?? false;
        },
        ['block:next'],
        'children_exhausted'
    )
);
```

### Loop Round Completion

```typescript
// Complete after N rounds
const completion = new StrategyBasedCompletionBehavior(
    new ConditionCompletionStrategy(
        (block, now) => {
            const loopBehavior = block.getBehavior(BoundLoopBehavior);
            return loopBehavior?.isComplete() ?? false;
        },
        ['block:next'],
        'rounds_complete'
    )
);
```

### Event-Triggered Completion

```typescript
// Complete on specific event
const completion = new StrategyBasedCompletionBehavior(
    new ConditionCompletionStrategy(
        (block, now) => true,  // Always complete when event fires
        ['workout:skip'],
        'user_skipped'
    )
);
```

## Creating Custom Strategies

Implement `ICompletionStrategy` for custom completion logic:

```typescript
export class RepsCompletionStrategy implements ICompletionStrategy {
    constructor(private readonly targetReps: number) {}
    
    shouldComplete(block: IRuntimeBlock, now: Date): boolean {
        const completedReps = block.memory.get(MemoryTypeEnum.METRIC_REPS) ?? 0;
        return completedReps >= this.targetReps;
    }
    
    getCompletionActions(block: IRuntimeBlock, now: Date): IRuntimeAction[] {
        return [
            new EmitEventAction('block:complete', {
                blockId: block.key.toString(),
                reason: 'reps_complete',
                totalReps: this.targetReps
            }, now)
        ];
    }
    
    getWatchedEvents(): string[] {
        return ['rep:completed'];
    }
    
    getCompletionReason(): string {
        return 'reps_complete';
    }
}
```

## Migration Guide

### Old Pattern (CompletionBehavior)

```typescript
// Old: Direct condition-based completion
behaviors.push(new CompletionBehavior(
    (_block, now) => timer.isComplete(now),
    ['timer:tick', 'timer:complete']
));
```

### New Pattern (Strategy-Based)

```typescript
// New: Strategy-based completion
behaviors.push(new StrategyBasedCompletionBehavior(
    new TimerCompletionStrategy(timer)
));
```

### Benefits of Migration

- ✅ Testable in isolation (strategy can be unit tested)
- ✅ Consistent completion semantics
- ✅ Reusable across blocks
- ✅ Clear separation of concerns
- ✅ Explicit event watching

## Best Practices

1. **Use provided strategies when possible** - TimerCompletionStrategy, ConditionCompletionStrategy
2. **Create custom strategies for domain-specific logic** - RepsCompletion, DistanceCompletion, etc.
3. **Test strategies independently** - Unit test shouldComplete() logic
4. **Document completion reasons** - Implement getCompletionReason() for telemetry
5. **Keep strategies focused** - One completion type per strategy
6. **Avoid side effects in shouldComplete()** - Should be a pure function

## Testing

### Unit Testing Strategies

```typescript
describe('TimerCompletionStrategy', () => {
    it('should complete when timer expires', () => {
        const timer = new BoundTimerBehavior(1000, 'down');
        const strategy = new TimerCompletionStrategy(timer);
        
        // Timer not expired
        const now1 = new Date('2024-01-01T12:00:00Z');
        expect(strategy.shouldComplete(block, now1)).toBe(false);
        
        // Timer expired
        const now2 = new Date('2024-01-01T12:00:02Z');
        expect(strategy.shouldComplete(block, now2)).toBe(true);
    });
});
```

### Integration Testing with Behavior

```typescript
describe('StrategyBasedCompletionBehavior', () => {
    it('should pop block when strategy completes', () => {
        const timer = new BoundTimerBehavior(1000, 'down');
        const strategy = new TimerCompletionStrategy(timer);
        const behavior = new StrategyBasedCompletionBehavior(strategy);
        
        const harness = new BehaviorTestHarness()
            .withBehaviors([timer, behavior]);
        
        harness.mount();
        harness.advanceClock(2000);
        
        const actions = harness.simulateEvent('timer:complete');
        expect(actions.some(a => a instanceof PopBlockAction)).toBe(true);
    });
});
```

## Troubleshooting

### Block not completing

- Check that strategy is in behaviors array
- Verify shouldComplete() returns true when expected
- Ensure watched events are being dispatched
- Check event name spelling

### Multiple pops

- Ensure only one completion strategy per block
- Check that completion strategies don't overlap

### Completion too early/late

- Verify completion condition logic
- Check timestamp handling in shouldComplete()
- Test strategy in isolation

## Related Documentation

- [Behavior Overlap Assessment](../../../docs/BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md)
- [Behavior Bundles](../behaviors/bundles/index.ts)
- [Runtime Architecture](../../../docs/jit-strategies-overview.md)
