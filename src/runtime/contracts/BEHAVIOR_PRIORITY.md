# Behavior Priority System Guide

## Overview

The Behavior Priority System provides explicit execution ordering for behaviors within RuntimeBlocks. This eliminates implicit dependencies and order-dependent bugs by making execution order deterministic and self-documenting.

## Problem Statement

Prior to the priority system, behavior execution order was implicit:
- Behaviors executed in the order they were added to the array
- Dependencies between behaviors were undocumented
- Order-dependent bugs were difficult to diagnose
- Refactoring required careful manual ordering

Example problematic pattern:
```typescript
// Fragile: ChildRunnerBehavior MUST come after ChildIndexBehavior
behaviors.push(new ChildIndexBehavior(childCount));
behaviors.push(new ChildRunnerBehavior(children));  // Depends on above!
```

## Solution: Priority-Based Ordering

Behaviors declare their execution priority via the `priority` field:
```typescript
export class ChildIndexBehavior implements IRuntimeBehavior {
    readonly priority = 500;  // Core: child management
    // ...
}

export class ChildRunnerBehavior implements IRuntimeBehavior {
    readonly priority = 600;  // Core: child execution (after child management)
    // ...
}
```

RuntimeBlock automatically sorts behaviors by priority at construction time.

## Priority Ranges

| Range | Purpose | Examples |
|-------|---------|----------|
| **0-99** | Infrastructure | ActionLayerBehavior (0) |
| **100-499** | Pre-execution | TimerBehavior (100), SoundBehavior (200) |
| **500-999** | Core logic | ChildIndexBehavior (500), ChildRunnerBehavior (600), CompletionBehavior (700) |
| **1000-1499** | Post-execution | HistoryBehavior (1200), Display behaviors (1300) |
| **1500+** | Cleanup | Disposal, finalization |

**Default Priority:** 1000 (post-execution/neutral)

## Predefined Constants

Use constants from `BehaviorPriority.ts` for consistency:

```typescript
import { 
    PRIORITY_TIMER,
    PRIORITY_CHILD_RUNNER,
    PRIORITY_HISTORY 
} from '@/runtime/contracts/BehaviorPriority';

export class MyBehavior implements IRuntimeBehavior {
    readonly priority = PRIORITY_TIMER;  // 100: Pre-execution
}
```

### Available Constants

**Infrastructure:**
- `PRIORITY_ACTION_LAYER = 0` - Must be first

**Pre-execution:**
- `PRIORITY_TIMER = 100` - Timer setup
- `PRIORITY_TIMER_PAUSE_RESUME = 150` - Pause/resume (after timer)
- `PRIORITY_SOUND = 200` - Sound coordination

**Core:**
- `PRIORITY_CHILD_INDEX = 500` - Child management
- `PRIORITY_ROUND_TRACKING = 550` - Round state
- `PRIORITY_CHILD_RUNNER = 600` - Child execution
- `PRIORITY_COMPLETION = 700` - Completion detection

**Post-execution:**
- `PRIORITY_HISTORY = 1200` - Tracking/telemetry
- `PRIORITY_DISPLAY = 1300` - Display updates

## Usage Examples

### Basic Priority Assignment

```typescript
export class MyCustomBehavior implements IRuntimeBehavior {
    // Use predefined constant
    readonly priority = PRIORITY_CORE_MIN;  // 500
    
    onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        // Behavior logic
    }
}
```

### Custom Priority Value

When no predefined constant fits:

```typescript
export class SpecializedBehavior implements IRuntimeBehavior {
    // Custom priority between child index and child runner
    readonly priority = 550;  // Core: specialized child logic
    
    // Add comment explaining why this specific priority
}
```

### Behavior Bundles with Priorities

Bundles automatically maintain correct priority ordering:

```typescript
// TimerBundle behaviors are returned in priority order:
TimerBundle.create(config)
// Returns:
// 1. TimerBehavior (priority 100)
// 2. TimerPauseResumeBehavior (priority 150)
// 3. SoundBehavior (priority 200)
// 4. CompletionBehavior (priority 700)
```

RuntimeBlock sorts the combined array, so bundle order doesn't matter:

```typescript
// These produce the same execution order:
behaviors.push(...TimerBundle.create(config));
behaviors.push(new HistoryBehavior());
behaviors.push(new ChildIndexBehavior());

// vs.
behaviors.push(new ChildIndexBehavior());
behaviors.push(new HistoryBehavior());
behaviors.push(...TimerBundle.create(config));

// Both result in: ChildIndex(500), Timer(100-700), History(1200)
// Sorted to: Timer(100-700), ChildIndex(500), History(1200)
```

## Execution Order Guarantees

### Within Same Priority

Behaviors with the same priority execute in insertion order (stable sort):

```typescript
behaviors.push(new BehaviorA());  // priority 500
behaviors.push(new BehaviorB());  // priority 500
// BehaviorA executes before BehaviorB
```

### Across Priorities

Lower priority always executes before higher:

```typescript
behaviors.push(new HistoryBehavior());      // priority 1200
behaviors.push(new TimerBehavior());        // priority 100
behaviors.push(new ChildRunnerBehavior());  // priority 600

// Execution order: Timer(100), ChildRunner(600), History(1200)
```

## Best Practices

### 1. Use Predefined Constants

```typescript
// Good
readonly priority = PRIORITY_TIMER;

// Avoid
readonly priority = 100;  // Magic number
```

### 2. Document Custom Priorities

```typescript
export class SpecializedBehavior implements IRuntimeBehavior {
    // Priority 575: Between round tracking (550) and child runner (600)
    // Needs round state but must execute before children
    readonly priority = 575;
}
```

### 3. Keep Related Behaviors Grouped

```typescript
// Related behaviors should have adjacent priorities
const PRIORITY_FEATURE_SETUP = 300;
const PRIORITY_FEATURE_EXECUTION = 301;
const PRIORITY_FEATURE_CLEANUP = 302;
```

### 4. Leave Room for Future Behaviors

Use increments of 10-50 to allow insertion:

```typescript
// Good: Leaves room
const PRIORITY_A = 500;
const PRIORITY_B = 550;
const PRIORITY_C = 600;

// Later can add:
const PRIORITY_NEW = 525;  // Between A and B
```

### 5. Default Priority for Simple Behaviors

Omit priority for behaviors with no dependencies:

```typescript
export class SimpleBehavior implements IRuntimeBehavior {
    // No priority field → defaults to 1000 (post-execution)
    // Fine if behavior has no dependencies
}
```

## Migration Guide

### Existing Behaviors

Add priority to existing behaviors based on their role:

```typescript
// Before
export class MyBehavior implements IRuntimeBehavior {
    onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        // ...
    }
}

// After
export class MyBehavior implements IRuntimeBehavior {
    readonly priority = PRIORITY_CORE_MIN;  // Choose appropriate priority
    
    onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        // ...
    }
}
```

### Strategies

No changes required! Strategies pass behaviors to RuntimeBlock, which sorts them automatically:

```typescript
// Strategy code - unchanged
const behaviors: IRuntimeBehavior[] = [];
behaviors.push(new TimerBehavior());
behaviors.push(new HistoryBehavior());
behaviors.push(new ChildRunnerBehavior());

return new RuntimeBlock(runtime, sourceIds, behaviors, ...);
// RuntimeBlock constructor sorts by priority automatically
```

## Debugging

### View Execution Order

Add logging to RuntimeBlock constructor:

```typescript
constructor(...) {
    this.behaviors = behaviors;
    this.behaviors.sort((a, b) => {
        const priorityA = a.priority ?? PRIORITY_DEFAULT;
        const priorityB = b.priority ?? PRIORITY_DEFAULT;
        return priorityA - priorityB;
    });
    
    // Debug: log sorted order
    console.log('Behavior execution order:',
        this.behaviors.map(b => `${b.constructor.name}(${b.priority ?? PRIORITY_DEFAULT})`)
    );
}
```

### Common Issues

**Issue:** Behavior A depends on Behavior B, but A executes first

**Solution:** Ensure A has higher priority (larger number) than B

```typescript
// B must execute before A
export class BehaviorB implements IRuntimeBehavior {
    readonly priority = 500;
}

export class BehaviorA implements IRuntimeBehavior {
    readonly priority = 600;  // After B
}
```

**Issue:** Behavior doesn't execute when expected

**Solution:** Check that behavior's priority places it in correct lifecycle phase

```typescript
// If behavior needs timer state, must be after timer
export class TimerDependentBehavior implements IRuntimeBehavior {
    readonly priority = 150;  // After PRIORITY_TIMER (100)
}
```

## Testing

### Unit Testing Priority

```typescript
describe('MyBehavior priority', () => {
    it('should have correct priority', () => {
        const behavior = new MyBehavior();
        expect(behavior.priority).toBe(PRIORITY_CHILD_RUNNER);
    });
});
```

### Integration Testing Order

```typescript
describe('RuntimeBlock behavior ordering', () => {
    it('should execute behaviors in priority order', () => {
        const executionOrder: string[] = [];
        
        class BehaviorA implements IRuntimeBehavior {
            readonly priority = 600;
            onPush() {
                executionOrder.push('A');
                return [];
            }
        }
        
        class BehaviorB implements IRuntimeBehavior {
            readonly priority = 100;
            onPush() {
                executionOrder.push('B');
                return [];
            }
        }
        
        const block = new RuntimeBlock(runtime, [], [
            new BehaviorA(),  // Added first
            new BehaviorB()   // Added second
        ]);
        
        block.push(clock);
        
        // B (100) executes before A (600), despite insertion order
        expect(executionOrder).toEqual(['B', 'A']);
    });
});
```

## Performance Considerations

- **Sort Performance:** O(n log n) where n = number of behaviors
- **Typical n:** 5-15 behaviors per block
- **Impact:** Negligible (<1ms) during block construction
- **Trade-off:** Tiny construction cost for deterministic execution

## Related Documentation

- [Behavior Overlap Assessment](../../../docs/BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md#75-medium-priority-explicit-behavior-ordering)
- [Runtime Architecture](../../../docs/jit-strategies-overview.md)
- [Behavior Bundles](../behaviors/bundles/index.ts)
