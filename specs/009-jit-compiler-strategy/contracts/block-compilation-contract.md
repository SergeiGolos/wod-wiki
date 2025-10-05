# Block Compilation Contract

**Contract ID**: BCC-001  
**Feature**: 009-jit-compiler-strategy  
**Type**: Unit Test Contract  
**Status**: Not Implemented

## Contract Description
This contract defines the expected behavior for block compilation logic across all strategy implementations. Each strategy must create runtime blocks with appropriate metadata, behaviors, and source references based on the compiled statement structure.

## Functional Requirements Covered
- FR-004: System MUST compile matching statements into specialized block types
- FR-011: Runtime blocks MUST be identifiable by type
- FR-019: Compiled blocks with children MUST receive child advancement behavior
- FR-020: Compiled blocks with children MUST receive lazy compilation behavior

## Test Scenarios

### TBC-001: TimerStrategy compiles block with "Timer" type metadata
```typescript
// GIVEN: A timer statement with children
const statement: ICodeStatement = {
    id: new BlockKey('timer-1'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
    ],
    children: [
        { id: new BlockKey('child-1'), fragments: [], children: [], meta: undefined }
    ],
    meta: undefined
};

// WHEN: TimerStrategy.compile() is called
const strategy = new TimerStrategy();
const block = strategy.compile([statement], mockRuntime);

// THEN: Block has Timer type metadata
expect(block.blockType).toBe("Timer");
expect(block.sourceIds).toEqual([statement.id]);
```

### TBC-002: RoundsStrategy compiles block with "Rounds" type metadata
```typescript
// GIVEN: A rounds statement
const statement: ICodeStatement = {
    id: new BlockKey('rounds-1'),
    fragments: [
        { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
    ],
    children: [],
    meta: undefined
};

// WHEN: RoundsStrategy.compile() is called
const strategy = new RoundsStrategy();
const block = strategy.compile([statement], mockRuntime);

// THEN: Block has Rounds type metadata
expect(block.blockType).toBe("Rounds");
expect(block.sourceIds).toEqual([statement.id]);
```

### TBC-003: EffortStrategy compiles block with "Effort" type metadata
```typescript
// GIVEN: An effort statement
const statement: ICodeStatement = {
    id: new BlockKey('effort-1'),
    fragments: [
        { fragmentType: FragmentType.Effort, value: 'Squats', type: 'effort' }
    ],
    children: [],
    meta: undefined
};

// WHEN: EffortStrategy.compile() is called
const strategy = new EffortStrategy();
const block = strategy.compile([statement], mockRuntime);

// THEN: Block has Effort type metadata
expect(block.blockType).toBe("Effort");
expect(block.sourceIds).toEqual([statement.id]);
```

### TBC-004: Strategy adds behaviors when statement has children
```typescript
// GIVEN: A statement with children
const childStatement: ICodeStatement = {
    id: new BlockKey('child-1'),
    fragments: [
        { fragmentType: FragmentType.Effort, value: 'Pull-ups', type: 'effort' }
    ],
    children: [],
    meta: undefined
};

const parentStatement: ICodeStatement = {
    id: new BlockKey('parent-1'),
    fragments: [
        { fragmentType: FragmentType.Timer, value: 600, type: 'timer' }
    ],
    children: [childStatement],
    meta: undefined
};

// WHEN: Strategy compiles parent with children
const strategy = new TimerStrategy();
const block = strategy.compile([parentStatement], mockRuntime);

// THEN: Block has behaviors
expect(block.behaviors.length).toBeGreaterThan(0);
expect(block.behaviors.some(b => b instanceof ChildAdvancementBehavior)).toBe(true);
expect(block.behaviors.some(b => b instanceof LazyCompilationBehavior)).toBe(true);
```

### TBC-005: Strategy omits behaviors when statement has no children
```typescript
// GIVEN: A statement without children
const statement: ICodeStatement = {
    id: new BlockKey('leaf-1'),
    fragments: [
        { fragmentType: FragmentType.Effort, value: 'Burpees', type: 'effort' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Strategy compiles leaf statement
const strategy = new EffortStrategy();
const block = strategy.compile([statement], mockRuntime);

// THEN: Block has no behaviors (leaf node)
expect(block.behaviors.length).toBe(0);
```

### TBC-006: ChildAdvancementBehavior initialized with correct children
```typescript
// GIVEN: A parent statement with multiple children
const children: ICodeStatement[] = [
    { id: new BlockKey('c1'), fragments: [], children: [], meta: undefined },
    { id: new BlockKey('c2'), fragments: [], children: [], meta: undefined },
    { id: new BlockKey('c3'), fragments: [], children: [], meta: undefined }
];

const parentStatement: ICodeStatement = {
    id: new BlockKey('parent-1'),
    fragments: [
        { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
    ],
    children: children,
    meta: undefined
};

// WHEN: Strategy compiles with children
const strategy = new RoundsStrategy();
const block = strategy.compile([parentStatement], mockRuntime);

// THEN: ChildAdvancementBehavior has correct child count
const childBehavior = block.behaviors.find(b => b instanceof ChildAdvancementBehavior) as ChildAdvancementBehavior;
expect(childBehavior).toBeDefined();
expect(childBehavior.getCurrentChildIndex()).toBe(0);
```

### TBC-007: Block preserves source statement ID
```typescript
// GIVEN: A statement with specific ID
const statementId = new BlockKey('unique-id-123');
const statement: ICodeStatement = {
    id: statementId,
    fragments: [
        { fragmentType: FragmentType.Timer, value: 300, type: 'timer' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Strategy compiles statement
const strategy = new TimerStrategy();
const block = strategy.compile([statement], mockRuntime);

// THEN: Block references source statement ID
expect(block.sourceIds).toContain(statementId);
expect(block.sourceIds.length).toBe(1);
```

### TBC-008: Block receives runtime reference
```typescript
// GIVEN: A mock runtime instance
const mockRuntime: IScriptRuntime = {
    jit: mockJitCompiler,
    stack: mockStack,
    // ... other runtime properties
};

const statement: ICodeStatement = {
    id: new BlockKey('test-1'),
    fragments: [
        { fragmentType: FragmentType.Effort, value: 'Sit-ups', type: 'effort' }
    ],
    children: [],
    meta: undefined
};

// WHEN: Strategy compiles statement
const strategy = new EffortStrategy();
const block = strategy.compile([statement], mockRuntime);

// THEN: Block holds runtime reference
expect(block.runtime).toBe(mockRuntime);
```

### TBC-009: Multiple statements compiled into single block
```typescript
// GIVEN: Multiple statements (edge case - typically one)
const statements: ICodeStatement[] = [
    { id: new BlockKey('s1'), fragments: [{ fragmentType: FragmentType.Timer, value: 600, type: 'timer' }], children: [], meta: undefined },
    { id: new BlockKey('s2'), fragments: [], children: [], meta: undefined }
];

// WHEN: Strategy compiles multiple statements
const strategy = new TimerStrategy();
const block = strategy.compile(statements, mockRuntime);

// THEN: Block references first statement's ID
expect(block.sourceIds).toContain(statements[0].id);
expect(block.blockType).toBe("Timer");
```

## Success Criteria
- ✅ All 9 test scenarios pass
- ✅ Each strategy sets correct blockType metadata
- ✅ Behaviors added only when children exist
- ✅ Source IDs properly referenced
- ✅ Runtime reference preserved
- ✅ Both ChildAdvancementBehavior and LazyCompilationBehavior present for parent blocks

## Implementation File
`tests/unit/runtime/block-compilation.test.ts`

## Dependencies
- `src/runtime/strategies.ts` (strategy implementations)
- `src/runtime/RuntimeBlock.ts` (block creation)
- `src/runtime/behaviors/ChildAdvancementBehavior.ts`
- `src/runtime/behaviors/LazyCompilationBehavior.ts`
- `src/CodeStatement.ts` (ICodeStatement interface)
- `src/BlockKey.ts` (BlockKey class)

## Notes
- Test file must fail initially (TDD approach)
- Mock runtime must provide JIT compiler reference for LazyCompilationBehavior
- Behavior presence validated via instanceof checks
- BlockType metadata enables UI discrimination
