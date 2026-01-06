# Behavior Dependencies

## Overview

Behavior dependencies allow behaviors to declare their requirements and conflicts explicitly. This eliminates silent failures and makes behavior composition patterns more robust.

## Problem Statement

Before dependency declarations, behaviors had implicit dependencies that could fail silently:

```typescript
// ChildRunnerBehavior requires ChildIndexBehavior, but nothing enforces this
behaviors.push(new ChildRunnerBehavior(children));
// Missing ChildIndexBehavior causes silent failure or undefined behavior
```

**Issues:**
- Silent failures when required behaviors are missing
- No validation of behavior compatibility
- Difficult to diagnose configuration errors
- Unclear behavior relationships

## Solution: Dependency Declarations

Behaviors can now declare:
1. **Required Behaviors** - Must be present in the same block
2. **Conflicting Behaviors** - Cannot be present together

### Required Behaviors

```typescript
export class ChildRunnerBehavior implements IRuntimeBehavior {
    readonly requiredBehaviors = [ChildIndexBehavior];
    
    // ...
}
```

If ChildIndexBehavior is missing, construction fails with clear error:
```
Error: Behavior ChildRunnerBehavior requires ChildIndexBehavior 
but it is not present in block "MyBlock"
```

### Conflicting Behaviors

```typescript
export class UnboundTimerBehavior implements IRuntimeBehavior {
    readonly conflictingBehaviors = [BoundTimerBehavior];
    
    // ...
}
```

If both are present, construction fails with clear error:
```
Error: Behavior UnboundTimerBehavior conflicts with BoundTimerBehavior 
in block "MyBlock"
```

## Usage Patterns

### Pattern 1: Simple Required Dependency

```typescript
export class TimerPauseResumeBehavior implements IRuntimeBehavior {
    readonly requiredBehaviors = [TimerBehavior];
    
    onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
        // Safe: TimerBehavior guaranteed to be present
        const timer = block.getBehavior(TimerBehavior)!;
        // ...
    }
}
```

### Pattern 2: Multiple Required Dependencies

```typescript
export class ComplexBehavior implements IRuntimeBehavior {
    readonly requiredBehaviors = [
        TimerBehavior,
        ChildIndexBehavior,
        HistoryBehavior
    ];
    
    // ...
}
```

### Pattern 3: Mutual Exclusion

```typescript
export class TimerMode implements IRuntimeBehavior {
    readonly conflictingBehaviors = [OtherTimerMode];
    
    // Ensures only one timer mode active
}
```

### Pattern 4: OR Dependencies (Advanced)

For "requires A OR B" scenarios, use one of these approaches:

**Option 1: Behavior Bundles (Recommended)**
```typescript
// Use LoopBundle which ensures correct composition
behaviors.push(...LoopBundle.create({
    totalRounds: 5,
    loopMode: 'perLoop'  // Ensures RoundPerLoopBehavior
}));
```

**Option 2: Constructor Validation**
```typescript
export class BoundLoopBehavior implements IRuntimeBehavior {
    // No requiredBehaviors (can't express OR logic)
    
    onPush(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        // Validate at runtime
        const hasNext = block.getBehavior(RoundPerNextBehavior);
        const hasLoop = block.getBehavior(RoundPerLoopBehavior);
        
        if (!hasNext && !hasLoop) {
            throw new Error(
                'BoundLoopBehavior requires either RoundPerNextBehavior ' +
                'or RoundPerLoopBehavior'
            );
        }
        
        // ...
    }
}
```

**Option 3: Complex Dependency System (Future)**
```typescript
// Not currently supported - future enhancement
readonly requiredBehaviors = {
    operator: 'OR',
    behaviors: [RoundPerNextBehavior, RoundPerLoopBehavior]
};
```

## Validation Timing

**Construction-Time Validation:**
- Dependencies are validated when RuntimeBlock is constructed
- Fails immediately with clear error message
- Prevents invalid configurations from reaching runtime

**Benefits:**
- ✅ Fail fast - catch errors at block creation
- ✅ Clear error messages with block label
- ✅ No silent failures
- ✅ No runtime overhead (validation happens once)

## Current Dependencies

### Behaviors with Required Dependencies

| Behavior | Requires | Reason |
|----------|----------|--------|
| `ChildRunnerBehavior` | `ChildIndexBehavior` | Needs current child index |
| `TimerPauseResumeBehavior` | `TimerBehavior` | Pauses/resumes timer instance |

### Behaviors with Conflicts

Currently no explicit conflicts declared. Use this pattern when behaviors:
- Implement mutually exclusive modes
- Manipulate same state in incompatible ways
- Would cause undefined behavior together

## Migration Guide

### Adding Dependencies to Existing Behavior

1. **Identify Dependencies:**
   - What behaviors does this one call `getBehavior()` on?
   - What behaviors must exist for this to function?
   - What behaviors would cause conflicts?

2. **Declare Dependencies:**
   ```typescript
   export class MyBehavior implements IRuntimeBehavior {
       readonly requiredBehaviors = [RequiredBehavior];
       readonly conflictingBehaviors = [ConflictingBehavior];
   }
   ```

3. **Test:**
   - Verify error messages are clear
   - Test missing required behavior
   - Test conflicting behavior combination

### Updating Strategy Code

No changes needed! Strategies continue to create behaviors as before:

```typescript
// Before and After - same code
const behaviors: IRuntimeBehavior[] = [];
behaviors.push(new ChildIndexBehavior(children.length));
behaviors.push(new ChildRunnerBehavior(children));

// RuntimeBlock automatically validates dependencies
return new RuntimeBlock(runtime, sourceIds, behaviors, ...);
```

## Testing

### Unit Testing Dependencies

```typescript
describe('ChildRunnerBehavior dependencies', () => {
    it('should require ChildIndexBehavior', () => {
        const behaviors = [
            new ChildRunnerBehavior([[0, 1, 2]])
            // Missing ChildIndexBehavior
        ];
        
        expect(() => {
            new RuntimeBlock(runtime, sourceIds, behaviors, context);
        }).toThrow('requires ChildIndexBehavior');
    });
    
    it('should succeed with required dependency', () => {
        const behaviors = [
            new ChildIndexBehavior(3),
            new ChildRunnerBehavior([[0, 1, 2]])
        ];
        
        expect(() => {
            new RuntimeBlock(runtime, sourceIds, behaviors, context);
        }).not.toThrow();
    });
});
```

### Integration Testing

```typescript
describe('TimerBundle with dependencies', () => {
    it('should validate all dependencies', () => {
        // Bundle ensures correct composition
        const behaviors = TimerBundle.create({
            direction: 'down',
            durationMs: 60000,
            enablePauseResume: true  // Includes TimerPauseResumeBehavior
        });
        
        // TimerPauseResumeBehavior requires TimerBehavior
        // Bundle guarantees this, so validation passes
        expect(() => {
            new RuntimeBlock(runtime, sourceIds, behaviors, context);
        }).not.toThrow();
    });
});
```

## Best Practices

### DO:
- ✅ Declare all required dependencies
- ✅ Use behavior bundles for complex compositions
- ✅ Provide clear error messages in custom validation
- ✅ Test dependency validation in unit tests
- ✅ Document why dependencies exist

### DON'T:
- ❌ Use for optional dependencies (check with `getBehavior()` instead)
- ❌ Over-specify dependencies (only what's truly required)
- ❌ Rely on dependency order (use priority field instead)
- ❌ Create circular dependencies (impossible to satisfy)

### When to Use Each Approach

**Required Dependencies:**
- Behavior calls methods on another behavior
- Behavior queries state from another behavior
- Behavior cannot function without another

**Conflicting Behaviors:**
- Behaviors manipulate same state differently
- Behaviors implement mutually exclusive modes
- Both present would cause undefined behavior

**Behavior Bundles:**
- Common composition patterns
- Multiple behaviors with complex dependencies
- Want to ensure correct configuration

## Troubleshooting

### Error: "Behavior X requires Y but it is not present"

**Cause:** Required behavior is missing.

**Solutions:**
1. Add the required behavior to the block
2. Use behavior bundle that includes both
3. Check if you're using the wrong behavior

### Error: "Behavior X conflicts with Y"

**Cause:** Conflicting behaviors are both present.

**Solutions:**
1. Remove one of the conflicting behaviors
2. Check if you've added behaviors multiple times
3. Review strategy composition logic

### Silent Failure (No Error)

**Cause:** Optional dependency, not a required one.

**Solution:**
- Check if behavior exists: `const b = block.getBehavior(Type);`
- Handle undefined: `if (b) { ... }`
- Consider if it should be required

## Performance Considerations

**Validation Cost:**
- Runs once at construction time
- O(n × m) where n = behaviors, m = max dependencies
- Typical: <1ms for 10-20 behaviors
- No runtime overhead after construction

**Memory:**
- Dependency arrays stored per behavior class (shared)
- Minimal memory impact (~50 bytes per behavior class)

## Future Enhancements

**Potential Additions:**
1. **OR Dependencies** - Complex dependency expressions
2. **Dependency Injection** - Auto-resolve dependencies
3. **Weak Dependencies** - Warn but don't fail
4. **Runtime Validation** - Re-validate after behavior changes
5. **Dependency Visualization** - Generate dependency graphs

## Related Documentation

- [BEHAVIOR_PRIORITY.md](./BEHAVIOR_PRIORITY.md) - Execution ordering system
- [BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md](../../../docs/BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md) - Architecture assessment
- [TIMER_COORDINATION.md](../behaviors/bundles/TIMER_COORDINATION.md) - Timer behavior coordination
- [COMPLETION_STRATEGY.md](../completion/COMPLETION_STRATEGY.md) - Completion patterns

## Summary

Behavior dependencies make implicit requirements explicit:
- **Construction-time validation** catches errors early
- **Clear error messages** simplify debugging
- **Self-documenting code** - dependencies are visible
- **No runtime overhead** - validation happens once
- **Backward compatible** - existing code works unchanged

Use dependencies to:
1. Document behavior relationships
2. Catch configuration errors early
3. Prevent silent failures
4. Make behavior composition robust
