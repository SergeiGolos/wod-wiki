# Plan: JIT Strategy Refactoring

> **Status: ✅ IMPLEMENTED**
> 
> All six JIT strategies have been refactored to use the Dialect-based hint system.
> This plan document has been updated to reflect the completed implementation.
> See [Migration Path](#migration-path) for implementation details.

## Overview

This plan provides detailed before/after code examples for refactoring all six JIT strategies to use the Dialect-based hint system instead of hardcoded regex matching.

## Context

### Strategy Precedence Order

The `JitCompiler` attempts to match a `CodeStatement` against strategies in this strict order:

1. **TimeBoundRoundsStrategy** (AMRAP) - Timer + Rounds/AMRAP text
2. **IntervalStrategy** (EMOM) - Timer + EMOM text  
3. **TimerStrategy** - Timer fragment only
4. **RoundsStrategy** - Rounds fragment (no timer)
5. **GroupStrategy** - Has children
6. **EffortStrategy** - Fallback

### Key Change

Each strategy's `match()` method will be refactored to check for behavioral hints (e.g., `behavior.time_bound`) instead of scanning fragment text for keywords.

---

## Strategy 1: TimeBoundRoundsStrategy (AMRAP)

Handles "As Many Rounds As Possible" within a fixed time.

### Before

```typescript
// src/runtime/strategies/TimeBoundRoundsStrategy.ts - CURRENT

import { IRuntimeBlockStrategy } from './IRuntimeBlockStrategy';
import { ICodeStatement, FragmentType } from '../../parser/CodeStatement';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';

export class TimeBoundRoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const fragments = statements[0].fragments;
        
        // Structural check: Must have a timer
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        
        // Structural check: May have explicit rounds
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        
        // PROBLEM: Hardcoded regex inside strategy
        const hasAmrapAction = fragments.some(f =>
            (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
            (f.value as string)?.toUpperCase().includes('AMRAP')
        );
        
        return hasTimer && (hasRounds || hasAmrapAction);
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### After

```typescript
// src/runtime/strategies/TimeBoundRoundsStrategy.ts - PROPOSED

import { IRuntimeBlockStrategy } from './IRuntimeBlockStrategy';
import { ICodeStatement, FragmentType } from '../../parser/CodeStatement';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';

export class TimeBoundRoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const statement = statements[0];
        
        // Structural check: Must have a timer
        const hasTimer = statement.fragments.some(f => f.fragmentType === FragmentType.Timer);
        
        // NEW: Check for generic behavioral hint
        // Supports "AMRAP", "For Time", "Max Effort", etc.
        const isTimeBound = statement.hints?.has('behavior.time_bound');
        
        return hasTimer && isTimeBound === true;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### Key Changes

- Removed regex scanning for "AMRAP" text
- Added check for `behavior.time_bound` hint
- Structural timer check remains (still need a timer fragment)
- Supports multiple time-bound workout types through single hint

---

## Strategy 2: IntervalStrategy (EMOM)

Handles "Every Minute on the Minute" style intervals.

### Before

```typescript
// src/runtime/strategies/IntervalStrategy.ts - CURRENT

export class IntervalStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const fragments = statements[0].fragments;
        
        // Structural check: Must have a timer
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        
        // PROBLEM: Hardcoded regex inside strategy
        const hasEmomAction = fragments.some(f =>
            (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
            (f.value as string)?.toUpperCase().includes('EMOM')
        );
        
        return hasTimer && hasEmomAction;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### After

```typescript
// src/runtime/strategies/IntervalStrategy.ts - PROPOSED

export class IntervalStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const statement = statements[0];
        
        // Structural check: Must have a timer
        const hasTimer = statement.fragments.some(f => f.fragmentType === FragmentType.Timer);
        
        // NEW: Check for generic behavioral hint
        // Supports "EMOM", "E2MOM", "Every 3:00", etc.
        const isInterval = statement.hints?.has('behavior.repeating_interval');
        
        return hasTimer && isInterval === true;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### Key Changes

- Removed regex scanning for "EMOM" text
- Added check for `behavior.repeating_interval` hint
- Supports variations like E2MOM, E3MOM through single hint

---

## Strategy 3: TimerStrategy

Handles simple countdowns or timers (e.g., "Rest 2:00").

### Before

```typescript
// src/runtime/strategies/TimerStrategy.ts - CURRENT

export class TimerStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const fragments = statements[0].fragments;
        
        // Simple check: Any timer fragment
        return fragments.some(f => f.fragmentType === FragmentType.Timer);
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### After

```typescript
// src/runtime/strategies/TimerStrategy.ts - PROPOSED

export class TimerStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const statement = statements[0];
        
        // Structural check: Has timer fragment
        const hasTimer = statement.fragments.some(f => f.fragmentType === FragmentType.Timer);
        
        // NEW: Check for explicit timer hint (optional)
        // Dialects can flag "Rest" or "Work" timers explicitly
        const isExplicitTimer = statement.hints?.has('behavior.timer');
        
        // NOTE: Due to precedence, this only matches if
        // TimeBoundRoundsStrategy and IntervalStrategy didn't match
        return hasTimer || isExplicitTimer === true;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### Key Changes

- Added optional `behavior.timer` hint check
- Structural fallback remains for backward compatibility
- Relies on precedence order (comes after time_bound and interval strategies)

---

## Strategy 4: RoundsStrategy

Handles fixed round counts (e.g., "3 Rounds").

### Before

```typescript
// src/runtime/strategies/RoundsStrategy.ts - CURRENT

export class RoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const fragments = statements[0].fragments;
        
        // Must have rounds fragment
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        
        // Must NOT have timer (timer+rounds = TimeBoundRoundsStrategy)
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        
        return hasRounds && !hasTimer;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### After

```typescript
// src/runtime/strategies/RoundsStrategy.ts - PROPOSED

export class RoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const statement = statements[0];
        
        // NEW: Check for fixed rounds hint
        const isFixedRounds = statement.hints?.has('behavior.fixed_rounds');
        
        // Structural fallback: Has rounds fragment
        const hasRounds = statement.fragments.some(f => f.fragmentType === FragmentType.Rounds);
        
        // Exclusion: Timer presence means higher-precedence strategy should handle
        const hasTimer = statement.fragments.some(f => f.fragmentType === FragmentType.Timer);
        
        return (isFixedRounds || hasRounds) && !hasTimer;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### Key Changes

- Added `behavior.fixed_rounds` hint check
- Structural fallback preserved for backward compatibility
- Timer exclusion logic unchanged (preserves precedence)

---

## Strategy 5: GroupStrategy

Handles nested indentation groups without explicit metrics.

### Before

```typescript
// src/runtime/strategies/GroupStrategy.ts - CURRENT

export class GroupStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const statement = statements[0];
        
        // Strictly checks for children
        return statement.children && statement.children.length > 0;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### After

```typescript
// src/runtime/strategies/GroupStrategy.ts - PROPOSED

export class GroupStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const statement = statements[0];
        
        // NEW: Check for explicit group hint
        // Parser may emit this for any indented block
        const isGroup = statement.hints?.has('behavior.group');
        
        // Structural fallback: Has children
        const hasChildren = statement.children && statement.children.length > 0;
        
        return isGroup === true || hasChildren;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### Key Changes

- Added `behavior.group` hint check
- Structural children check preserved as fallback
- Allows explicit grouping even without children

---

## Strategy 6: EffortStrategy (Fallback)

Handles everything else (e.g., "5 Pullups").

### Before

```typescript
// src/runtime/strategies/EffortStrategy.ts - CURRENT

export class EffortStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const fragments = statements[0].fragments;
        
        // Fallback: No timer, no rounds
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        
        return !hasTimer && !hasRounds;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### After

```typescript
// src/runtime/strategies/EffortStrategy.ts - PROPOSED

export class EffortStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        const statement = statements[0];
        
        // NEW: Explicit effort hint takes priority
        // Allows forcing effort behavior even on complex lines
        if (statement.hints?.has('behavior.effort')) {
            return true;
        }
        
        // Structural fallback: No timer, no rounds
        const hasTimer = statement.fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasRounds = statement.fragments.some(f => f.fragmentType === FragmentType.Rounds);
        
        return !hasTimer && !hasRounds;
    }
    
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ... implementation unchanged
    }
}
```

### Key Changes

- Added `behavior.effort` hint check with early return
- Structural fallback preserved for backward compatibility
- Allows explicit effort assignment via dialect

---

## Summary of Hint Usage

| Strategy | Required Hint | Structural Fallback | Notes |
|----------|--------------|---------------------|-------|
| TimeBoundRoundsStrategy | `behavior.time_bound` | Timer fragment | No fallback without hint |
| IntervalStrategy | `behavior.repeating_interval` | Timer fragment | No fallback without hint |
| TimerStrategy | `behavior.timer` (optional) | Timer fragment | Falls back to structural check |
| RoundsStrategy | `behavior.fixed_rounds` (optional) | Rounds fragment | Falls back to structural check |
| GroupStrategy | `behavior.group` (optional) | Has children | Falls back to structural check |
| EffortStrategy | `behavior.effort` (optional) | No timer/rounds | Falls back to structural check |

## Migration Path

### Phase 1: Add Hints Field ✅ COMPLETE
1. ✅ Add `hints?: Set<string>` to `ICodeStatement`
2. ✅ Ensure backward compatibility (hints may be undefined)

### Phase 2: Implement CrossFit Dialect ✅ COMPLETE
1. ✅ Create `CrossFitDialect` that emits hints for AMRAP, EMOM, etc.
2. ✅ Register dialect with `DialectRegistry`
3. ✅ Integrate `DialectRegistry` with `JitCompiler`

### Phase 3: Gradual Strategy Migration ✅ COMPLETE
1. ✅ Update each strategy to check hints first, fall back to structural
2. ✅ Test each strategy in isolation (unit tests added)
3. ✅ Run integration tests to verify precedence

### Phase 4: Remove Hardcoded Regex (FUTURE)
1. Once dialect coverage is confirmed, remove structural fallbacks from strategies that require hints
2. Update tests to mock hints instead of fragment text

**Note**: Phase 4 is optional and can be done when confidence in dialect coverage is high.
The current implementation maintains backward compatibility by preserving structural fallbacks.

## Testing Strategy

### Unit Tests (Per Strategy)

```typescript
describe('TimeBoundRoundsStrategy', () => {
    it('matches when hint is present and timer exists', () => {
        const statement = createStatement({
            fragments: [createTimerFragment('20:00')],
            hints: new Set(['behavior.time_bound'])
        });
        
        const strategy = new TimeBoundRoundsStrategy();
        expect(strategy.match([statement])).toBe(true);
    });
    
    it('does not match without hint', () => {
        const statement = createStatement({
            fragments: [createTimerFragment('20:00')],
            hints: new Set() // No time_bound hint
        });
        
        const strategy = new TimeBoundRoundsStrategy();
        expect(strategy.match([statement])).toBe(false);
    });
    
    it('does not match without timer fragment', () => {
        const statement = createStatement({
            fragments: [createEffortFragment('5 Pullups')],
            hints: new Set(['behavior.time_bound'])
        });
        
        const strategy = new TimeBoundRoundsStrategy();
        expect(strategy.match([statement])).toBe(false);
    });
});
```

### Integration Tests (Precedence)

```typescript
describe('JitCompiler precedence', () => {
    it('selects TimeBoundRoundsStrategy over TimerStrategy when time_bound hint present', () => {
        const statement = createStatement({
            fragments: [createTimerFragment('20:00')],
            hints: new Set(['behavior.time_bound'])
        });
        
        const selectedStrategy = jit.selectStrategy([statement]);
        expect(selectedStrategy).toBeInstanceOf(TimeBoundRoundsStrategy);
    });
    
    it('selects TimerStrategy when only timer fragment present (no hints)', () => {
        const statement = createStatement({
            fragments: [createTimerFragment('20:00')],
            hints: new Set()
        });
        
        const selectedStrategy = jit.selectStrategy([statement]);
        expect(selectedStrategy).toBeInstanceOf(TimerStrategy);
    });
});
```

## Files Modified ✅

All strategy files have been updated to use hint-based matching with structural fallback:

- ✅ `src/runtime/strategies/TimeBoundRoundsStrategy.ts` - Uses `behavior.time_bound` hint
- ✅ `src/runtime/strategies/IntervalStrategy.ts` - Uses `behavior.repeating_interval` hint
- ✅ `src/runtime/strategies/TimerStrategy.ts` - Uses `behavior.timer` hint (optional)
- ✅ `src/runtime/strategies/RoundsStrategy.ts` - Uses `behavior.fixed_rounds` hint (optional)
- ✅ `src/runtime/strategies/GroupStrategy.ts` - Uses `behavior.group` hint (optional)
- ✅ `src/runtime/strategies/EffortStrategy.ts` - Uses `behavior.effort` hint (optional)

### Test Files Created

Unit tests for all strategies with hint-based matching:

- ✅ `src/runtime/strategies/__tests__/TimeBoundRoundsStrategy.test.ts`
- ✅ `src/runtime/strategies/__tests__/IntervalStrategy.test.ts`
- ✅ `src/runtime/strategies/__tests__/TimerStrategy.test.ts`
- ✅ `src/runtime/strategies/__tests__/RoundsStrategy.test.ts`
- ✅ `src/runtime/strategies/__tests__/GroupStrategy.test.ts`
- ✅ `src/runtime/strategies/__tests__/EffortStrategy.test.ts`

## Related Documents

- `docs/plans/jit-02-dialect-registry.md` - Dialect Registry design
- `docs/plans/jit-01-execution-span-consolidation.md` - ExecutionSpan consolidation
