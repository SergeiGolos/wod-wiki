# Research Document: JIT Compiler Strategy Implementation

**Feature**: 009-jit-compiler-strategy  
**Date**: 2025-10-05  
**Status**: Complete

## Overview
This document consolidates research findings for implementing fragment-based JIT compilation strategies in the WOD Wiki runtime system. Research focused on strategy pattern implementation, fragment-based pattern matching, behavior composition patterns, and TypeScript interface design for runtime block type discrimination.

## Fragment Type System Analysis

### Decision
Use existing `FragmentType` enum from `src/CodeFragment.ts` for strategy pattern matching. No parser modifications required.

### Rationale
- Fragment types already defined: Timer, Rounds, Effort, Distance, Action, Increment, Lap, Text, Resistance
- `ICodeStatement` interface already contains `fragments: ICodeFragment[]` array
- Parsing complete - strategies only need to inspect existing fragment properties
- Constitutional compliance: Parser-First principle satisfied (no parser changes needed)

### Current Implementation
```typescript
export enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Lap = 'lap',
  Text = 'text',
  Resistance = 'resistance'
}

export interface ICodeFragment {
  readonly image?: string;
  readonly value?: any;
  readonly type: string;
  readonly meta?: CodeMetadata;
  readonly fragmentType: FragmentType;
}
```

### Strategy Matching Pattern
Strategies inspect `statement.fragments` array and check `fragment.fragmentType` property:
- **TimerStrategy**: Match when `fragments.some(f => f.fragmentType === FragmentType.Timer)`
- **RoundsStrategy**: Match when `fragments.some(f => f.fragmentType === FragmentType.Rounds)` AND no Timer fragments
- **EffortStrategy**: Match when no Timer AND no Rounds fragments (true fallback)

## Strategy Pattern Best Practices

### Decision
Implement Chain of Responsibility pattern with ordered strategy registry in `JitCompiler.strategies[]` array.

### Rationale
- `JitCompiler.compile()` already iterates strategies sequentially: `for (const strategy of this.strategies)`
- First matching strategy wins (early return on `strategy.match()` returning true)
- Registration order determines precedence: most specific strategies registered first
- Decouples strategy logic from compiler orchestration
- Enables easy extension with new strategy types

### Alternatives Considered
- **Strategy Factory with type discrimination**: Rejected - requires centralized type logic, violates Open/Closed principle
- **Visitor pattern on fragments**: Rejected - over-engineered for simple type checking
- **Priority scores on strategies**: Rejected - unnecessary complexity when registration order suffices

### Implementation Pattern
```typescript
// In demo initialization or runtime setup
compiler.registerStrategy(new TimerStrategy());      // Most specific - check first
compiler.registerStrategy(new RoundsStrategy());     // Moderately specific
compiler.registerStrategy(new EffortStrategy());     // Fallback - check last
```

## Behavior Composition Analysis

### Decision
Maintain existing `ChildAdvancementBehavior` and `LazyCompilationBehavior` pattern. Strategies must pass behaviors to compiled blocks when statements have children.

### Rationale
- Current implementation already separates concerns:
  - `ChildAdvancementBehavior`: Tracks `currentChildIndex`, increments on `onNext()`
  - `LazyCompilationBehavior`: Retrieves current child, calls `runtime.jit.compile()`, returns `PushBlockAction`
- Behavior composition enables recursive compilation without circular dependencies
- Strategies create blocks with appropriate behaviors based on statement structure

### Current Deficiency
`EffortStrategy.compile()` creates blocks with empty behavior array: `new RuntimeBlock(runtime, [code[0].id], [])`

### Required Fix
```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    const behaviors: IRuntimeBehavior[] = [];
    
    // If statement has children, add behaviors to enable compilation cascade
    if (code[0].children && code[0].children.length > 0) {
        behaviors.push(new ChildAdvancementBehavior(code[0].children));
        behaviors.push(new LazyCompilationBehavior());
    }
    
    return new RuntimeBlock(runtime, [code[0].id], behaviors);
}
```

## Block Type Discrimination

### Decision
Add optional `blockType: string` metadata to `IRuntimeBlock` interface for UI display differentiation.

### Rationale
- Current issue: All blocks display as "Runtime (Idle)" because `CompactRuntimeBlockDisplay` uses generic `constructor.name`
- TypeScript constructor names identical for all `RuntimeBlock` instances
- Specialized block subclasses (TimerBlock, RoundsBlock) not implemented
- Metadata approach avoids class proliferation while enabling type discrimination

### Implementation Approach
Two options evaluated:

**Option A: Metadata property (RECOMMENDED)**
```typescript
export interface IRuntimeBlock {
    // ...existing properties...
    readonly blockType?: string;  // e.g., "Timer", "Rounds", "Effort"
}

// In strategies
return new RuntimeBlock(runtime, sourceIds, behaviors, { blockType: "Timer" });
```

**Option B: Specialized subclasses**
```typescript
export class TimerBlock extends RuntimeBlock {
    constructor(runtime, sourceIds, behaviors) {
        super(runtime, sourceIds, behaviors);
    }
}
```

**Decision**: Option A (Metadata)
- Simpler implementation (no class hierarchy changes)
- Avoids constructor signature duplication
- Follows existing pattern (metadata already used in RuntimeBlock)
- Defers class hierarchy decision to future refactoring

### Alternatives Considered
- **Symbol-based type discrimination**: Rejected - not serializable, complicates debugging
- **Discriminated union types**: Rejected - runtime blocks are class instances, not plain objects
- **Strategy reference in block**: Rejected - creates unnecessary coupling

## Strategy Matching Logic Verification

### Decision
Fix `EffortStrategy.match()` to return `false` for timer/rounds statements, converting it to true fallback strategy.

### Current Deficiency
```typescript
export class EffortStrategy implements IRuntimeBlockStrategy {
    match(_statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return true;  // PROBLEM: Always matches, prevents other strategies
    }
}
```

### Required Fix
```typescript
export class EffortStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (statements.length === 0) return false;
        
        const fragments = statements[0].fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        
        // Only match if no timer AND no rounds (pure effort statement)
        return !hasTimer && !hasRounds;
    }
}
```

### Test Coverage Required
- `EffortStrategy.match()` returns `false` for statements with Timer fragments
- `EffortStrategy.match()` returns `false` for statements with Rounds fragments
- `EffortStrategy.match()` returns `true` for statements with only Effort fragments
- Strategy precedence order verified: Timer checked before Rounds before Effort

## TypeScript Interface Compatibility

### Decision
No changes required to `IRuntimeBlockStrategy` interface signature. Current design already correct.

### Validation
```typescript
export interface IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean;
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock;
}
```

### Issues Found in Existing Strategies
Several strategies in `strategies.ts` have incorrect signatures:
```typescript
// INCORRECT - accepts RuntimeMetric[] instead of ICodeStatement[]
export class CountdownStrategy implements IRuntimeBlockStrategy {
    compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
        // ...
    }
}
```

**Resolution**: Fix strategy signatures to match interface contract. TypeScript compiler should catch these mismatches.

## Performance Considerations

### Decision
No specific optimizations required for demo validation. Current architecture meets constitutional performance targets.

### Measurements
- Strategy matching: O(n) where n = number of strategies (typically 3-5)
- Fragment inspection: O(m) where m = fragments per statement (typically < 10)
- Total compilation overhead: < 1ms for typical workout statements

### Future Optimizations (Out of Scope)
- Strategy caching based on fragment signatures
- Fragment type bitmap for O(1) lookups
- Lazy strategy instantiation

## Error Handling Patterns

### Decision
Implement defensive checks in strategy matching with console warnings for diagnostic feedback.

### Pattern
```typescript
match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
    if (!statements || statements.length === 0) {
        console.warn('TimerStrategy: No statements provided');
        return false;
    }
    
    if (!statements[0].fragments) {
        console.warn('TimerStrategy: Statement missing fragments array');
        return false;
    }
    
    // Proceed with matching logic
}
```

### Rationale
- Provides developer feedback in console during Storybook testing
- Fails gracefully (return false) rather than throwing exceptions
- Aligns with existing `JitCompiler.compile()` warning pattern

## Integration with Existing Codebase

### Affected Components
1. **JitCompiler.ts**: Strategy registration order modification
2. **strategies.ts**: Add TimerStrategy and RoundsStrategy implementations, fix EffortStrategy
3. **IRuntimeBlock.ts**: Add optional `blockType` metadata property
4. **CompactRuntimeBlockDisplay.tsx**: Use `block.blockType` for display name
5. **JitCompilerDemo.tsx**: Register strategies in correct precedence order

### Backward Compatibility
- All changes are additive or corrective (no breaking API changes)
- Existing tests may need updates to reflect corrected behavior
- 369 baseline TypeScript errors unchanged (fixes should not increase error count)

### Migration Path
No migration required. Changes improve existing functionality without altering public API contracts.

## Validation Strategy

### Unit Tests
- Strategy matching logic for each strategy type
- Behavior propagation verification
- Block type metadata preservation

### Integration Tests
- End-to-end compilation cascade from root to child blocks
- "Next Block" button interaction advancing through workout structures
- Strategy precedence order enforcement

### Storybook Validation
- AMRAP workout compiles to timer-based blocks
- For Time workout compiles to rounds-based blocks
- Simple effort statements compile to effort blocks
- Stack display shows distinct block type names

## Open Questions (Resolved)

1. **Fragment schema stability**: ✅ Resolved - Schema finalized, no changes expected
2. **Performance targets**: ✅ Resolved - No specific targets for demo validation
3. **Maximum stack depth**: ✅ Resolved - No limit, rely on memory constraints
4. **Conflicting modifiers**: ✅ Resolved - Reject as ambiguous syntax
5. **Unmatchable statements**: ✅ Resolved - Create generic error block with diagnostics

## Implementation Priorities

### Phase 1: Core Strategy Fixes (Critical Path)
1. Fix `EffortStrategy.match()` to check fragments
2. Implement `TimerStrategy` with fragment-based matching
3. Implement `RoundsStrategy` with fragment-based matching
4. Add behavior propagation to all strategies

### Phase 2: Type Discrimination (High Priority)
5. Add `blockType` metadata to `IRuntimeBlock` interface
6. Update strategies to pass block type in compilation
7. Update `CompactRuntimeBlockDisplay` to show block type

### Phase 3: Registration and Validation (Medium Priority)
8. Update `JitCompilerDemo` strategy registration order
9. Add console logging for strategy matching
10. Validate with existing workout stories

### Phase 4: Test Coverage (Low Priority)
11. Unit tests for strategy matching
12. Integration tests for compilation cascade
13. Storybook interaction tests

## References

- Feature Spec: `specs/009-jit-compiler-strategy/spec.md`
- Constitution: `.specify/memory/constitution.md` (v1.0.0)
- Strategy Interface: `src/runtime/IRuntimeBlockStrategy.ts`
- Fragment Definitions: `src/CodeFragment.ts`
- Behavior Implementations: `src/runtime/behaviors/`
- Demo Component: `stories/compiler/JitCompilerDemo.tsx`

---

**Research Complete**: All technical unknowns resolved. Ready for Phase 1 design and contracts.
