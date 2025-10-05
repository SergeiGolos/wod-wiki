# Strategy Precedence Contract

**Contract ID**: SPC-001  
**Feature**: 009-jit-compiler-strategy  
**Type**: Integration Test Contract  
**Status**: Not Implemented

## Contract Description
This contract defines the expected behavior for strategy precedence and registration order in the JitCompiler. The compiler must evaluate strategies in registration order, with the first matching strategy winning compilation responsibility.

## Functional Requirements Covered
- FR-001: System MUST evaluate registered strategies in precedence order
- FR-005: System MUST use fallback strategy when no specific strategy matches

## Test Scenarios

### TSP-001: TimerStrategy evaluated before RoundsStrategy
```typescript
// GIVEN: JitCompiler with TimerStrategy and RoundsStrategy registered
const compiler = new JitCompiler();
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RoundsStrategy());

// GIVEN: Statement with Timer fragment
const statement: ICodeStatement = {
    id: new BlockKey('test-1'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Compiler compiles statement
const block = compiler.compile([statement], mockRuntime);

// THEN: Block has Timer type (not Rounds)
expect(block).toBeDefined();
expect(block!.blockType).toBe("Timer");
```

### TSP-002: RoundsStrategy evaluated before EffortStrategy
```typescript
// GIVEN: JitCompiler with all strategies registered in correct order
const compiler = new JitCompiler();
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RoundsStrategy());
compiler.registerStrategy(new EffortStrategy());

// GIVEN: Statement with Rounds fragment (no Timer)
const statement: ICodeStatement = {
    id: new BlockKey('test-2'),
    fragments: [
        { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Compiler compiles statement
const block = compiler.compile([statement], mockRuntime);

// THEN: Block has Rounds type (not Effort)
expect(block).toBeDefined();
expect(block!.blockType).toBe("Rounds");
```

### TSP-003: EffortStrategy acts as fallback
```typescript
// GIVEN: JitCompiler with all strategies registered
const compiler = new JitCompiler();
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RoundsStrategy());
compiler.registerStrategy(new EffortStrategy());

// GIVEN: Statement with only Effort fragment (no Timer, no Rounds)
const statement: ICodeStatement = {
    id: new BlockKey('test-3'),
    fragments: [
        { fragmentType: FragmentType.Effort, value: 'Deadlifts', type: 'effort' },
        { fragmentType: FragmentType.Rep, value: 10, type: 'rep' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Compiler compiles statement
const block = compiler.compile([statement], mockRuntime);

// THEN: Block has Effort type (fallback)
expect(block).toBeDefined();
expect(block!.blockType).toBe("Effort");
```

### TSP-004: Timer + Rounds statement matches TimerStrategy (precedence)
```typescript
// GIVEN: JitCompiler with strategies registered
const compiler = new JitCompiler();
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RoundsStrategy());
compiler.registerStrategy(new EffortStrategy());

// GIVEN: Statement with BOTH Timer and Rounds fragments
const statement: ICodeStatement = {
    id: new BlockKey('test-4'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' },
        { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Compiler compiles statement
const block = compiler.compile([statement], mockRuntime);

// THEN: TimerStrategy wins (evaluated first)
expect(block).toBeDefined();
expect(block!.blockType).toBe("Timer");
```

### TSP-005: Registration order determines precedence
```typescript
// GIVEN: JitCompiler with strategies registered in WRONG order
const compiler = new JitCompiler();
compiler.registerStrategy(new EffortStrategy());  // Fallback first (wrong!)
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RoundsStrategy());

// GIVEN: Timer statement
const statement: ICodeStatement = {
    id: new BlockKey('test-5'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 600, type: 'timer' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Compiler compiles statement
const block = compiler.compile([statement], mockRuntime);

// THEN: EffortStrategy incorrectly matches first (demonstrates order matters)
// NOTE: This test demonstrates INCORRECT behavior - EffortStrategy should NOT match
// This validates that order matters and documents the bug when order is wrong
expect(block).toBeDefined();
// In correct implementation, EffortStrategy match() should return false for Timer
```

### TSP-006: No matching strategy returns undefined
```typescript
// GIVEN: JitCompiler with NO strategies registered
const compiler = new JitCompiler();
// (no registerStrategy calls)

// GIVEN: Any statement
const statement: ICodeStatement = {
    id: new BlockKey('test-6'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 300, type: 'timer' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Compiler compiles statement
const block = compiler.compile([statement], mockRuntime);

// THEN: Returns undefined (no matching strategy)
expect(block).toBeUndefined();
```

### TSP-007: Empty statements array returns undefined
```typescript
// GIVEN: JitCompiler with strategies registered
const compiler = new JitCompiler();
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RoundsStrategy());
compiler.registerStrategy(new EffortStrategy());

// GIVEN: Empty statements array
const statements: ICodeStatement[] = [];

// WHEN: Compiler compiles empty array
const block = compiler.compile(statements, mockRuntime);

// THEN: Returns undefined (logged warning)
expect(block).toBeUndefined();
```

### TSP-008: First match wins (no double compilation)
```typescript
// GIVEN: Spy on strategy compile methods
const timerStrategy = new TimerStrategy();
const timerCompileSpy = vi.spyOn(timerStrategy, 'compile');

const roundsStrategy = new RoundsStrategy();
const roundsCompileSpy = vi.spyOn(roundsStrategy, 'compile');

const compiler = new JitCompiler();
compiler.registerStrategy(timerStrategy);
compiler.registerStrategy(roundsStrategy);

// GIVEN: Timer statement
const statement: ICodeStatement = {
    id: new BlockKey('test-8'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 900, type: 'timer' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Compiler compiles statement
compiler.compile([statement], mockRuntime);

// THEN: Only TimerStrategy.compile() called (not RoundsStrategy)
expect(timerCompileSpy).toHaveBeenCalledOnce();
expect(roundsCompileSpy).not.toHaveBeenCalled();
```

### TSP-009: Multiple compile calls maintain consistent precedence
```typescript
// GIVEN: JitCompiler with strategies
const compiler = new JitCompiler();
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RoundsStrategy());
compiler.registerStrategy(new EffortStrategy());

// GIVEN: Multiple different statements
const timerStmt: ICodeStatement = {
    id: new BlockKey('t1'),
    fragments: [{ fragmentType: FragmentType.Timer, value: 600, type: 'timer' }],
    children: [], meta: undefined
};

const roundsStmt: ICodeStatement = {
    id: new BlockKey('r1'),
    fragments: [{ fragmentType: FragmentType.Rounds, value: 4, type: 'rounds' }],
    children: [], meta: undefined
};

const effortStmt: ICodeStatement = {
    id: new BlockKey('e1'),
    fragments: [{ fragmentType: FragmentType.Effort, value: 'Lunges', type: 'effort' }],
    children: [], meta: undefined
};

// WHEN: Compiler compiles multiple statements
const block1 = compiler.compile([timerStmt], mockRuntime);
const block2 = compiler.compile([roundsStmt], mockRuntime);
const block3 = compiler.compile([effortStmt], mockRuntime);

// THEN: Each statement matches correct strategy
expect(block1!.blockType).toBe("Timer");
expect(block2!.blockType).toBe("Rounds");
expect(block3!.blockType).toBe("Effort");
```

## Success Criteria
- ✅ All 9 test scenarios pass
- ✅ TimerStrategy evaluated before RoundsStrategy
- ✅ RoundsStrategy evaluated before EffortStrategy
- ✅ First matching strategy wins compilation
- ✅ No double compilation (optimization)
- ✅ Undefined returned when no strategy matches
- ✅ Consistent precedence across multiple compilations

## Implementation File
`tests/integration/jit-compiler-precedence.test.ts`

## Dependencies
- `src/runtime/JitCompiler.ts` (compiler with strategy registry)
- `src/runtime/strategies.ts` (all strategy implementations)
- `src/CodeStatement.ts` (ICodeStatement interface)
- `src/CodeFragment.ts` (FragmentType enum)
- `src/BlockKey.ts` (BlockKey class)
- Vitest (vi.spyOn for spy validation)

## Notes
- Test file must fail initially (TDD approach)
- TSP-005 demonstrates incorrect behavior when order is wrong
- Spy tests (TSP-008) validate optimization (early return)
- Integration test validates full compilation pipeline
