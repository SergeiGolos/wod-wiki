# Strategy Matching Contract

**Contract ID**: SMC-001  
**Feature**: 009-jit-compiler-strategy  
**Type**: Unit Test Contract  
**Status**: Not Implemented

## Contract Description
This contract defines the expected behavior for strategy matching logic across all strategy implementations. Each strategy must correctly identify statements it can handle and reject statements it cannot handle based on fragment type inspection.

## Functional Requirements Covered
- FR-001: System MUST evaluate registered strategies in precedence order
- FR-002: System MUST match strategies based on fragment types
- FR-003: Strategies MUST NOT match statements they are not designed to handle

## Test Scenarios

### TSC-001: TimerStrategy matches statements with Timer fragments
```typescript
// GIVEN: A code statement with Timer fragment
const statement: ICodeStatement = {
    id: new BlockKey('test-1'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
    ],
    children: [],
    meta: undefined
};

// WHEN: TimerStrategy.match() is called
const strategy = new TimerStrategy();
const result = strategy.match([statement], mockRuntime);

// THEN: Returns true
expect(result).toBe(true);
```

### TSC-002: TimerStrategy rejects statements without Timer fragments
```typescript
// GIVEN: A code statement with only Effort fragment
const statement: ICodeStatement = {
    id: new BlockKey('test-2'),
    fragments: [
        { fragmentType: FragmentType.Effort, value: 'Pull-ups', type: 'effort' }
    ],
    children: [],
    meta: undefined
};

// WHEN: TimerStrategy.match() is called
const strategy = new TimerStrategy();
const result = strategy.match([statement], mockRuntime);

// THEN: Returns false
expect(result).toBe(false);
```

### TSC-003: RoundsStrategy matches statements with Rounds fragments (no Timer)
```typescript
// GIVEN: A code statement with Rounds fragment but no Timer
const statement: ICodeStatement = {
    id: new BlockKey('test-3'),
    fragments: [
        { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
    ],
    children: [],
    meta: undefined
};

// WHEN: RoundsStrategy.match() is called
const strategy = new RoundsStrategy();
const result = strategy.match([statement], mockRuntime);

// THEN: Returns true
expect(result).toBe(true);
```

### TSC-004: RoundsStrategy rejects statements with Timer fragments
```typescript
// GIVEN: A code statement with both Timer and Rounds fragments
const statement: ICodeStatement = {
    id: new BlockKey('test-4'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' },
        { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
    ],
    children: [],
    meta: undefined
};

// WHEN: RoundsStrategy.match() is called
const strategy = new RoundsStrategy();
const result = strategy.match([statement], mockRuntime);

// THEN: Returns false (Timer takes precedence)
expect(result).toBe(false);
```

### TSC-005: EffortStrategy matches statements without Timer or Rounds
```typescript
// GIVEN: A code statement with only Effort fragment
const statement: ICodeStatement = {
    id: new BlockKey('test-5'),
    fragments: [
        { fragmentType: FragmentType.Effort, value: 'Push-ups', type: 'effort' },
        { fragmentType: FragmentType.Rep, value: 20, type: 'rep' }
    ],
    children: [],
    meta: undefined
};

// WHEN: EffortStrategy.match() is called
const strategy = new EffortStrategy();
const result = strategy.match([statement], mockRuntime);

// THEN: Returns true
expect(result).toBe(true);
```

### TSC-006: EffortStrategy rejects statements with Timer fragments
```typescript
// GIVEN: A code statement with Timer fragment
const statement: ICodeStatement = {
    id: new BlockKey('test-6'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 600, type: 'timer' }
    ],
    children: [],
    meta: undefined
};

// WHEN: EffortStrategy.match() is called
const strategy = new EffortStrategy();
const result = strategy.match([statement], mockRuntime);

// THEN: Returns false
expect(result).toBe(false);
```

### TSC-007: EffortStrategy rejects statements with Rounds fragments
```typescript
// GIVEN: A code statement with Rounds fragment
const statement: ICodeStatement = {
    id: new BlockKey('test-7'),
    fragments: [
        { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
    ],
    children: [],
    meta: undefined
};

// WHEN: EffortStrategy.match() is called
const strategy = new EffortStrategy();
const result = strategy.match([statement], mockRuntime);

// THEN: Returns false
expect(result).toBe(false);
```

### TSC-008: Strategy handles empty statements array
```typescript
// GIVEN: Empty statements array
const statements: ICodeStatement[] = [];

// WHEN: Any strategy.match() is called
const timerStrategy = new TimerStrategy();
const roundsStrategy = new RoundsStrategy();
const effortStrategy = new EffortStrategy();

// THEN: All return false
expect(timerStrategy.match(statements, mockRuntime)).toBe(false);
expect(roundsStrategy.match(statements, mockRuntime)).toBe(false);
expect(effortStrategy.match(statements, mockRuntime)).toBe(false);
```

### TSC-009: Strategy handles missing fragments array
```typescript
// GIVEN: Statement with undefined fragments
const statement: ICodeStatement = {
    id: new BlockKey('test-9'),
    fragments: undefined as any,  // Invalid but defensive check needed
    children: [],
    meta: undefined
};

// WHEN: Any strategy.match() is called
const strategy = new TimerStrategy();
const result = strategy.match([statement], mockRuntime);

// THEN: Returns false (defensive programming)
expect(result).toBe(false);
```

## Success Criteria
- ✅ All 9 test scenarios pass
- ✅ Each strategy correctly identifies matching statements
- ✅ Each strategy correctly rejects non-matching statements
- ✅ Defensive checks handle edge cases (empty arrays, missing data)
- ✅ No exceptions thrown during matching

## Implementation File
`tests/unit/runtime/strategies.test.ts`

## Dependencies
- `src/runtime/strategies.ts` (strategy implementations)
- `src/CodeFragment.ts` (FragmentType enum)
- `src/CodeStatement.ts` (ICodeStatement interface)
- `src/BlockKey.ts` (BlockKey class)

## Notes
- Test file must fail initially (TDD red-green-refactor)
- Mock runtime can be minimal (strategies don't use runtime in match)
- Fragment type checking is the core validation logic
