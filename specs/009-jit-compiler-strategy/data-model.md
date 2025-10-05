# Data Model: JIT Compiler Strategy Implementation

**Feature**: 009-jit-compiler-strategy  
**Date**: 2025-10-05  
**Phase**: 1 (Design & Contracts)

## Overview
This document defines the data structures, interfaces, and relationships for the JIT compiler strategy system. The model focuses on three core entities: Strategy (pattern matching), RuntimeBlock (execution unit), and Fragment (parsed workout element).

## Entity Definitions

### 1. IRuntimeBlockStrategy (Interface)

**Purpose**: Contract for strategy implementations that match and compile workout statement patterns into runtime blocks.

**Properties**:
- None (pure behavior interface)

**Methods**:
```typescript
match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean
```
- **Purpose**: Determines if this strategy can handle the given statements
- **Parameters**:
  - `statements`: Array of parsed code statements with fragments
  - `runtime`: Runtime context for compilation
- **Returns**: `true` if strategy matches, `false` otherwise
- **Constraints**: Must return quickly (< 1ms), no side effects

```typescript
compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock
```
- **Purpose**: Compiles matching statements into executable runtime block
- **Parameters**:
  - `statements`: Array of code statements to compile (pre-validated by match())
  - `runtime`: Runtime context with JIT compiler reference
- **Returns**: Compiled runtime block with appropriate behaviors
- **Constraints**: Must return valid block, must not throw exceptions

**Validation Rules**:
- ✅ Both methods MUST accept `ICodeStatement[]` (not `RuntimeMetric[]`)
- ✅ Match logic MUST be deterministic (same inputs → same output)
- ✅ Compile MUST only be called after successful match

**Relationships**:
- Registered in `JitCompiler.strategies[]` array
- Creates `IRuntimeBlock` instances via compile()
- Inspects `ICodeFragment.fragmentType` for pattern matching

---

### 2. ICodeFragment (Interface)

**Purpose**: Represents a parsed token from workout script with type and value information.

**Properties**:
```typescript
readonly image?: string          // Original source text
readonly value?: any             // Parsed value (duration, count, name)
readonly type: string            // Legacy type string (deprecated)
readonly meta?: CodeMetadata     // Source position metadata
readonly fragmentType: FragmentType  // Typed fragment identifier
```

**FragmentType Enum Values**:
- `Timer` - Duration-based workout modifiers (e.g., "20:00 AMRAP")
- `Rounds` - Round count modifiers (e.g., "5 rounds")
- `Effort` - Exercise definitions (e.g., "10 pull-ups")
- `Rep` - Repetition counts
- `Distance` - Distance measurements
- `Action` - Action verbs
- `Increment` - Progressive loading
- `Lap` - Lap counting
- `Text` - Text annotations
- `Resistance` - Weight/resistance values

**Validation Rules**:
- ✅ `fragmentType` MUST be one of the defined enum values
- ✅ `value` MUST be present when fragment represents quantifiable data
- ✅ `meta` SHOULD be present for source mapping
- ❌ MUST NOT modify fragment properties (readonly)

**Relationships**:
- Contained in `ICodeStatement.fragments[]` array
- Inspected by strategy `match()` methods
- Created by parser (out of scope for this feature)

---

### 3. ICodeStatement (Interface)

**Purpose**: Represents a parsed workout statement with child statements and fragments.

**Properties**:
```typescript
readonly id: BlockKey            // Unique identifier
readonly fragments: ICodeFragment[]  // Parsed tokens
readonly children: ICodeStatement[]  // Nested statements
readonly meta?: CodeMetadata     // Source metadata
```

**Validation Rules**:
- ✅ `fragments` MUST NOT be null or undefined (can be empty array)
- ✅ `children` MUST NOT be null or undefined (can be empty array)
- ✅ `id` MUST be unique within workout script
- ✅ Fragment array order MUST preserve parse sequence

**State Transitions**: None (immutable parse output)

**Relationships**:
- Passed to strategy `match()` and `compile()` methods
- Parent statements reference children via `children[]` array
- Compiled into `IRuntimeBlock` by strategies

---

### 4. IRuntimeBlock (Interface)

**Purpose**: Executable unit representing a portion of workout with behaviors and type metadata.

**Properties**:
```typescript
readonly runtime: IScriptRuntime     // Runtime context reference
readonly sourceIds: BlockKey[]       // Source statement identifiers
readonly behaviors: IRuntimeBehavior[]  // Execution behaviors
readonly blockType?: string          // Type discriminator (NEW)
```

**New Property**:
```typescript
readonly blockType?: string
```
- **Purpose**: Identifies block type for UI display and logging
- **Valid Values**: "Timer", "Rounds", "Effort", "Generic", "Error"
- **Default**: `undefined` (for backward compatibility)
- **Usage**: Display in `CompactRuntimeBlockDisplay` component

**Validation Rules**:
- ✅ `runtime` MUST NOT be null
- ✅ `sourceIds` MUST contain at least one BlockKey
- ✅ `behaviors` MUST be array (can be empty for leaf blocks)
- ✅ `blockType` SHOULD be set by strategies for type discrimination
- ❌ MUST NOT hold references to parent blocks (creates cycles)

**State Transitions**:
- **Idle** → **Executing**: When `next()` called
- **Executing** → **Idle**: When behaviors return empty actions
- **Executing** → **Complete**: When no more children to advance

**Relationships**:
- Created by strategy `compile()` methods
- Contains `IRuntimeBehavior[]` for execution logic
- Pushed to `IScriptRuntime.stack` during execution
- References source `ICodeStatement` via `sourceIds`

---

### 5. IRuntimeBehavior (Interface)

**Purpose**: Composable execution capability attached to runtime blocks.

**Properties**:
- None (pure behavior interface)

**Methods**:
```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]
```
- **Purpose**: Called when block advances to next execution step
- **Parameters**:
  - `runtime`: Runtime context for action creation
  - `block`: The block executing this behavior
- **Returns**: Array of actions to execute (can be empty)
- **Constraints**: Must not modify runtime state directly

**Validation Rules**:
- ✅ MUST return array (never null/undefined)
- ✅ MUST NOT throw exceptions (return empty array on error)
- ✅ Action execution order determined by array sequence

**Relationships**:
- Attached to `IRuntimeBlock.behaviors[]` array
- Creates `IRuntimeAction[]` on execution
- Executed in sequence by `RuntimeBlock.next()`

---

### 6. ChildAdvancementBehavior (Implementation)

**Purpose**: Tracks sequential position within child statement array.

**Properties**:
```typescript
private currentChildIndex: number = 0
private readonly children: ReadonlyArray<CodeStatement>
```

**Methods**:
```typescript
constructor(children: CodeStatement[])
onNext(runtime, block): IRuntimeAction[]  // Increments index
getCurrentChildIndex(): number
getCurrentChild(): CodeStatement | undefined
```

**Validation Rules**:
- ✅ `children` array MUST be frozen (Object.freeze) in constructor
- ✅ `currentChildIndex` MUST NOT exceed `children.length`
- ✅ MUST return empty array when index >= children.length (no more children)

**State Transitions**:
- **Index 0** (initial) → **Index N** (advancing) → **Complete** (index >= length)

**Relationships**:
- Collaborates with `LazyCompilationBehavior` to provide current child
- Receives children from parent `ICodeStatement.children[]`
- Index persists across multiple `next()` calls

---

### 7. LazyCompilationBehavior (Implementation)

**Purpose**: Retrieves current child and invokes JIT compiler to produce new runtime block.

**Properties**:
- None (stateless behavior)

**Methods**:
```typescript
onNext(runtime, block): IRuntimeAction[]
```
- **Logic**:
  1. Find `ChildAdvancementBehavior` in block behaviors
  2. Call `getCurrentChild()` to get current statement
  3. Call `runtime.jit.compile([child], runtime)`
  4. Return `PushBlockAction` with compiled block

**Validation Rules**:
- ✅ MUST check if `ChildAdvancementBehavior` exists in block
- ✅ MUST handle `getCurrentChild()` returning `undefined`
- ✅ MUST handle `compile()` returning `undefined`
- ✅ Return empty array on any failure (defensive programming)

**Relationships**:
- Depends on `ChildAdvancementBehavior` for child access
- Calls `runtime.jit.compile()` for recursive compilation
- Creates `PushBlockAction` with compiled child block

---

### 8. JitCompiler (Class)

**Purpose**: Strategy registry and compilation orchestration.

**Properties**:
```typescript
private strategies: IRuntimeBlockStrategy[] = []
```

**Methods**:
```typescript
registerStrategy(strategy: IRuntimeBlockStrategy): void
compile(nodes: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined
```

**Compilation Algorithm**:
```
For each strategy in strategies array (in registration order):
    If strategy.match(nodes, runtime) returns true:
        Return strategy.compile(nodes, runtime)
Return undefined (no matching strategy)
```

**Validation Rules**:
- ✅ Strategies MUST be evaluated in registration order
- ✅ First matching strategy wins (early return)
- ✅ MUST return `undefined` if no strategy matches
- ✅ MUST log warnings for diagnostic feedback

**Relationships**:
- Contains `IRuntimeBlockStrategy[]` registry
- Called by `LazyCompilationBehavior` for child compilation
- Called by `IScriptRuntime` for root block compilation

---

## Strategy Implementations

### TimerStrategy (NEW)

**Purpose**: Compiles time-bound workout statements (AMRAP, timed intervals).

**Match Logic**:
```typescript
match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
    if (!statements || statements.length === 0) return false;
    const fragments = statements[0].fragments;
    return fragments.some(f => f.fragmentType === FragmentType.Timer);
}
```

**Compile Logic**:
```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    const behaviors: IRuntimeBehavior[] = [];
    
    // Add behaviors if statement has children
    if (code[0].children && code[0].children.length > 0) {
        behaviors.push(new ChildAdvancementBehavior(code[0].children));
        behaviors.push(new LazyCompilationBehavior());
    }
    
    return new RuntimeBlock(
        runtime,
        [code[0].id],
        behaviors,
        { blockType: "Timer" }  // Type metadata
    );
}
```

**Validation Rules**:
- ✅ MUST match only statements with Timer fragments
- ✅ MUST create block with "Timer" type metadata
- ✅ MUST add behaviors when children exist

---

### RoundsStrategy (NEW)

**Purpose**: Compiles bounded-round workout statements (For Time, multi-round).

**Match Logic**:
```typescript
match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
    if (!statements || statements.length === 0) return false;
    const fragments = statements[0].fragments;
    const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
    const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
    
    // Match rounds BUT NOT timer (timer takes precedence)
    return hasRounds && !hasTimer;
}
```

**Compile Logic**:
```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    const behaviors: IRuntimeBehavior[] = [];
    
    if (code[0].children && code[0].children.length > 0) {
        behaviors.push(new ChildAdvancementBehavior(code[0].children));
        behaviors.push(new LazyCompilationBehavior());
    }
    
    return new RuntimeBlock(
        runtime,
        [code[0].id],
        behaviors,
        { blockType: "Rounds" }
    );
}
```

**Validation Rules**:
- ✅ MUST reject statements with Timer fragments (defer to TimerStrategy)
- ✅ MUST match only statements with Rounds fragments (no Timer)
- ✅ MUST create block with "Rounds" type metadata

---

### EffortStrategy (MODIFIED)

**Purpose**: Fallback strategy for simple effort statements (no timer/rounds modifiers).

**Match Logic** (CORRECTED):
```typescript
match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
    if (!statements || statements.length === 0) return false;
    const fragments = statements[0].fragments;
    const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
    const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
    
    // Only match if NO timer AND NO rounds (pure effort)
    return !hasTimer && !hasRounds;
}
```

**Compile Logic** (CORRECTED):
```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    const behaviors: IRuntimeBehavior[] = [];
    
    if (code[0].children && code[0].children.length > 0) {
        behaviors.push(new ChildAdvancementBehavior(code[0].children));
        behaviors.push(new LazyCompilationBehavior());
    }
    
    return new RuntimeBlock(
        runtime,
        [code[0].id],
        behaviors,
        { blockType: "Effort" }
    );
}
```

**Validation Rules**:
- ✅ MUST return `false` for statements with Timer fragments
- ✅ MUST return `false` for statements with Rounds fragments
- ✅ MUST return `true` only for pure effort statements
- ✅ MUST create block with "Effort" type metadata

---

## Entity Relationships Diagram

```
                    JitCompiler
                        |
                        | contains
                        ↓
              [IRuntimeBlockStrategy]
                  ↗     |     ↖
       TimerStrategy RoundsStrategy EffortStrategy
                  |
                  | match() inspects
                  ↓
            ICodeStatement
                  |
                  | contains
                  ↓
            [ICodeFragment]
                  ↓
            fragmentType: FragmentType

            IRuntimeBlockStrategy
                  |
                  | compile() creates
                  ↓
            IRuntimeBlock
                  |
                  | contains
                  ↓
            [IRuntimeBehavior]
                  ↗        ↖
    ChildAdvancementBehavior  LazyCompilationBehavior
                  |                    |
                  | provides           | calls
                  ↓                    ↓
            getCurrentChild()    runtime.jit.compile()
```

## Validation Matrix

| Entity | Validation Type | Rule | Enforcement |
|--------|----------------|------|-------------|
| IRuntimeBlockStrategy | Interface | match() signature correct | TypeScript compiler |
| IRuntimeBlockStrategy | Interface | compile() signature correct | TypeScript compiler |
| ICodeFragment | Enum | fragmentType in FragmentType values | Parser validation |
| ICodeStatement | Array | fragments never null | Parser guarantee |
| IRuntimeBlock | Constructor | sourceIds.length > 0 | Runtime assertion |
| IRuntimeBlock | Property | blockType optional string | TypeScript optional |
| ChildAdvancementBehavior | Boundary | index < children.length | Logic check in onNext() |
| LazyCompilationBehavior | Null check | getCurrentChild() may be undefined | Defensive check |
| JitCompiler | Order | Strategies evaluated in registration order | Array iteration |
| TimerStrategy | Match logic | Only match Timer fragments | Fragment type check |
| RoundsStrategy | Match logic | Rounds AND NOT Timer | Fragment type check |
| EffortStrategy | Match logic | NOT Timer AND NOT Rounds | Fragment type check |

## Performance Characteristics

| Operation | Complexity | Target | Notes |
|-----------|-----------|--------|-------|
| Strategy.match() | O(f) where f = fragments | < 1ms | Typically f < 10 |
| JitCompiler.compile() | O(s × f) where s = strategies | < 1ms | Typically s < 5 |
| ChildAdvancementBehavior.onNext() | O(1) | < 1ms | Simple index increment |
| LazyCompilationBehavior.onNext() | O(s × f) | < 1ms | Calls JitCompiler.compile() |
| Fragment type check | O(f) | < 0.1ms | Linear scan of fragments array |

## Migration Notes

### Breaking Changes
- None (all changes are additive or corrective)

### Backward Compatibility
- Existing `IRuntimeBlock` implementations work (blockType optional)
- Existing strategies work if signatures match interface
- Existing tests may fail due to corrected behavior (expected)

### Data Migration
- No persistent data (runtime-only execution)
- No schema migrations required

---

**Data Model Complete**: All entities, relationships, and validation rules defined. Ready for contract generation in Phase 1.
