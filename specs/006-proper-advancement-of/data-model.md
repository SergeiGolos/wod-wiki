# Data Model: Proper Script Advancement

**Feature**: 006-proper-advancement-of  
**Date**: 2025-10-04

## Core Entities

### CodeStatement (Existing)
Represents a single parsed element from the workout script.

**Attributes**:
- `children: CodeStatement[]` - Child statements for nesting
- `metadata: CodeMetadata` - Source position and context
- `fragments: CodeFragment[]` - Parsed syntax fragments
- Parent-child relationships established during parsing

**Relationships**:
- One-to-many with child CodeStatements (tree structure)
- Compiled into RuntimeBlock via JitCompiler

**State Transitions**: Immutable after parsing

---

### RuntimeBlock (Enhanced)
Executable representation of a CodeStatement on the runtime stack.

**Existing Attributes**:
- `key: BlockKey` - Unique identifier
- `sourceId: number[]` - Links to original CodeStatement
- Methods: `push()`, `next()`, `pop()`, `dispose()`

**New Attributes Required**:
- `currentChildIndex: number` - Cursor for sequential child advancement
- `children: CodeStatement[]` - Reference to uncompiled child statements
- `parentContext: RuntimeBlock | undefined` - Reference to parent block
- `isComplete: boolean` - Tracks whether all children have executed

**Validation Rules**:
- `currentChildIndex` must be >= 0 and <= children.length
- `parentContext` must be undefined for root blocks
- `key` and `sourceId` must be set during construction
- `dispose()` must be called after pop

**Lifecycle**:
1. **Construction**: Initialize with CodeStatement, set currentChildIndex=0
2. **Push**: Register events, return initial actions
3. **Next**: Compile child[currentChildIndex], increment cursor, return NextAction
4. **Pop**: Mark complete, return completion actions
5. **Dispose**: Clear parent/child references

---

### RuntimeStack (Enhanced)
Stack data structure managing active RuntimeBlocks.

**Existing Attributes**:
- `_blocks: IRuntimeBlock[]` - Internal array (top at end)
- Properties: `current`, `blocks`, `keys`

**Operations**:
- `push(block): void` - Add block to top (O(1))
- `pop(): IRuntimeBlock | undefined` - Remove and return top (O(1))
- Validation on push: Check for null/undefined, verify key exists
- Error on failure: Throw TypeError, halt execution

**Invariants**:
- Stack depth <= 10 (maximum nesting)
- All blocks have unique keys
- Current block is always at array end (length-1)

---

### NextAction (Existing)
Action returned by block.next() to signal advancing to next child/sibling.

**Attributes**:
- `type: 'next'` - Action discriminator
- `block: IRuntimeBlock` - The newly compiled child/sibling block

**Usage**:
- Returned by parent.next() with lazy-compiled child
- Processed by ScriptRuntime: push block and call block.push()
- Alternative: Empty array `[]` signals no more children

---

### AdvancementState (Conceptual)
State machine for tracking block advancement progress.

**States**:
- `Initializing` - Block constructed but not pushed
- `Active` - Block on stack, may have children remaining
- `AdvancingChildren` - Processing children sequentially
- `Complete` - All children processed, ready to pop
- `Disposed` - Resources released, block inactive

**Transitions**:
- `Initializing → Active`: RuntimeStack.push()
- `Active → AdvancingChildren`: First next() call
- `AdvancingChildren → AdvancingChildren`: Subsequent next() calls
- `AdvancingChildren → Complete`: No more children
- `Complete → Disposed`: Consumer calls dispose()

---

## Relationships

### Parent-Child Block Relationships
```
ParentBlock (1) ──► (0..N) ChildBlocks
│                         │
├─ currentChildIndex      ├─ parentContext
├─ children[]             └─ (references parent)
└─ next() compiles child
```

**Rules**:
- Parent compiles children lazily on next()
- Children execute strictly sequentially
- Child completion triggers parent.next() for next sibling
- Parent tracks cursor to maintain order

### Stack-Block Relationships
```
RuntimeStack (1) ──► (0..10) RuntimeBlocks
│                           │
├─ _blocks[]                ├─ Ordered by push time
├─ current (top)            └─ Max depth = 10
└─ push/pop operations
```

**Rules**:
- Stack maintains insertion order
- Only top block (current) can be popped
- Push operations validate block before adding
- Pop operations return block without cleanup

### JitCompiler-Block Relationships
```
JitCompiler (1) ──► (N) RuntimeBlocks
│                        │
├─ strategies[]          ├─ Created on demand
├─ compile()             └─ One per CodeStatement
└─ Lazy compilation
```

**Rules**:
- Compiler creates blocks only when requested
- Each CodeStatement compiled to one RuntimeBlock
- Compilation uses strategy pattern for extensibility
- Failed compilation returns undefined

---

## Validation Rules

### Parse-Time Validation (Phase 2 - Visitor)
1. **Circular Reference Detection**:
   - Track visited statements during tree walk
   - Error if statement references ancestor

2. **Structural Validation**:
   - Parent blocks must have children OR be leaf nodes
   - Maximum nesting depth: 10 levels
   - All child references must be valid

3. **Timer Validation**:
   - Duration values must be positive
   - Event registrations must have valid handlers

### Runtime Validation (During Execution)
1. **Block Validation (on push)**:
   - Block must not be null/undefined
   - Block must have valid key
   - Block must have sourceId

2. **Stack Validation**:
   - Depth must not exceed 10
   - No duplicate keys on stack

3. **Advancement Validation**:
   - currentChildIndex in bounds
   - Child statements exist before compilation

---

## Performance Characteristics

### Time Complexity
- Stack push: O(1)
- Stack pop: O(1)
- Block compilation: O(1) per block (lazy)
- Child advancement: O(1) cursor increment
- Disposal: O(1) reference clearing

### Space Complexity
- Stack: O(depth) - maximum 10 blocks
- Parent-child refs: O(1) per block
- Uncompiled children: O(n) CodeStatement references
- Compiled blocks: O(active) only blocks on stack

### Performance Targets
- Push operation: < 1ms
- Pop operation: < 1ms
- JIT compilation: < 5ms per block
- Block disposal: < 50ms
- Parse validation: < 100ms for typical scripts

---

## Error Handling

### Validation Errors (Parse Time)
- **Type**: `TypeError`
- **Cause**: Invalid script structure, circular refs
- **Action**: Halt before execution, show error with source position

### Stack Errors (Runtime)
- **Type**: `TypeError` or `Error`
- **Cause**: Stack overflow, invalid block, null push
- **Action**: Log stack state, throw exception, halt immediately

### Disposal Errors
- **Type**: Logged warnings
- **Cause**: dispose() throws exception
- **Action**: Log error but don't throw (best-effort)

---

## Data Flow

### Block Creation Flow
```
CodeStatement (parsed)
    ↓ (on parent.next())
JitCompiler.compile(statement)
    ↓ (strategy match)
RuntimeBlock (constructed)
    ↓ (NextAction)
RuntimeStack.push(block)
    ↓
block.push() → actions
```

### Advancement Flow
```
current.next() called
    ↓ (lazy compile)
JitCompiler.compile(children[cursor++])
    ↓
return NextAction(newBlock)
    ↓ (ScriptRuntime processes)
RuntimeStack.push(newBlock)
    ↓
newBlock.push() → actions
```

### Completion Flow
```
current.next() called (no more children)
    ↓
return [] (empty actions)
    ↓ (ScriptRuntime detects)
RuntimeStack.pop() → block
    ↓ (consumer responsibility)
block.dispose()
    ↓
Clear references, GC eligible
```

---

## Migration Notes

### Changes to Existing Code
1. **RuntimeBlock implementations**: Add currentChildIndex, children tracking
2. **JitCompiler strategies**: Support lazy compilation from parent.next()
3. **ScriptRuntime**: Add disposal logic after pop operations
4. **Parser visitor**: Add structural validation rules

### Backward Compatibility
- Existing IRuntimeBlock interface unchanged (no breaking changes)
- New attributes are internal implementation details
- Consumer-managed disposal pattern already established
- Performance targets maintain existing thresholds

### Testing Requirements
- Unit tests for each validation rule
- Integration tests for nested execution scenarios
- Performance tests for all target metrics
- Edge case tests for error conditions
