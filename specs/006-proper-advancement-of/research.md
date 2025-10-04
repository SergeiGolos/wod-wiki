# Research: Proper Script Advancement for JIT Runtime Block Creation

**Feature**: 006-proper-advancement-of  
**Date**: 2025-10-04  
**Status**: Complete

## Research Questions

### 1. How should JIT compiler handle lazy block creation?

**Decision**: Lazy creation on parent.next() with cursor-based advancement

**Rationale**: 
- Aligns with JIT (Just-In-Time) compilation principle - blocks created only when needed
- Parent blocks maintain cursor/index into their children array
- When parent.next() is called, compile and return NextAction with the new block
- Avoids upfront compilation of entire script tree
- Better memory usage for large workout scripts with many branches

**Alternatives Considered**:
- **Eager compilation**: Compile all blocks upfront during parse
  - Rejected: Violates JIT principle, wastes memory for unused branches
- **Hybrid approach**: Compile immediate children only
  - Rejected: Added complexity without clear benefits

**Implementation Notes**:
- Parent blocks need `currentChildIndex` field to track advancement
- JitCompiler.compile() called from within parent.next() method
- NextAction carries the newly compiled child block for RuntimeStack.push()

---

### 2. How to distinguish "next sibling" vs "next child" advancement?

**Decision**: Parent context tracking with advancement state machine

**Rationale**:
- Each RuntimeBlock tracks whether it has remaining children vs is complete
- Parent.next() returns NextAction for first/next child
- Child.pop() returns NextAction for next sibling OR signals parent to resume
- RuntimeStack doesn't need to know the difference - just processes actions
- Clean separation: blocks know their structure, stack just executes

**Alternatives Considered**:
- **Stack-based tracking**: RuntimeStack maintains parent-child relationships
  - Rejected: Violates single responsibility, couples stack to block structure
- **Explicit action types**: SiblingAction vs ChildAction
  - Rejected: Unnecessary complexity, NextAction is sufficient

**Implementation Notes**:
- Parent blocks return `NextAction(childBlock)` when children remain
- Parent blocks return `[]` (empty actions) when all children complete
- Child blocks can return `NextAction(siblingBlock)` if they know about siblings
- ScriptRuntime processes NextAction by pushing new block and calling push()

---

### 3. What validation rules prevent advancement errors?

**Decision**: Parse-time structural validation with three-phase checks

**Rationale**:
- **Phase 1 (Parsing)**: Chevrotain parser catches syntax errors
- **Phase 2 (Visitor)**: Visitor validates semantic rules during tree walk
- **Phase 3 (Pre-execution)**: Final validation before first JIT compilation
- Fail fast - catch errors before any runtime execution
- Clear error messages with source positions

**Validation Rules**:
1. No circular parent-child references
2. All parent blocks have at least one child (or are leaf nodes)
3. Child blocks reference valid parent context
4. Maximum nesting depth not exceeded (10 levels)
5. Timer event registrations have valid durations

**Alternatives Considered**:
- **Runtime validation**: Check during execution
  - Rejected: Too late, may cause partial execution before error
- **On-demand validation**: Only when user requests
  - Rejected: Doesn't prevent errors, just detects them

**Implementation Notes**:
- Add validation methods to timer.visitor.ts
- Throw descriptive errors with source positions
- Log validation results for debugging

---

### 4. How to handle stack operation failures safely?

**Decision**: Immediate halt with exception + logging

**Rationale**:
- Stack corruption is fatal - cannot safely continue execution
- Throw exception to halt execution immediately (per FR-007)
- Log full stack trace and state before throwing
- Consumer can catch at top level and display error to user
- Better than silent corruption or undefined behavior

**Error Scenarios**:
- **Stack overflow**: Too many nested blocks (exceeds depth limit)
- **Invalid block**: Block missing required properties (key, sourceId)
- **Null/undefined**: Attempting to push null/undefined block
- **Disposal failure**: Block.dispose() throws exception

**Alternatives Considered**:
- **Silent fallback**: Continue with default behavior
  - Rejected: Masks errors, causes undefined behavior
- **Retry logic**: Attempt operation again
  - Rejected: Stack errors are not transient, retry won't help
- **Graceful degradation**: Skip failed operation
  - Rejected: Leads to incorrect execution state

**Implementation Notes**:
- RuntimeStack methods throw TypeError for validation errors
- ScriptRuntime catches exceptions and logs before propagating
- Error messages include stack state (current block, depth, keys)

---

### 5. How to implement memory cleanup on pop?

**Decision**: Consumer-managed disposal with explicit dispose() calls

**Rationale**:
- Aligns with existing IRuntimeBlock consumer-managed disposal pattern
- RuntimeStack.pop() returns block without cleanup
- Consumer must call block.dispose() to release resources
- Disposal clears object references to allow garbage collection
- No event handler cleanup needed (handled by separate event system)

**Cleanup Responsibilities**:
- **RuntimeStack**: None - just removes from internal array
- **Block.dispose()**: Clear references to parent, children, runtime
- **Consumer (ScriptRuntime)**: Call dispose() on popped blocks
- **Garbage Collector**: Reclaim memory once references cleared

**Alternatives Considered**:
- **Automatic cleanup**: RuntimeStack calls dispose() on pop
  - Rejected: Violates consumer-managed disposal pattern
- **Reference counting**: Track references automatically
  - Rejected: Added complexity, TypeScript GC handles this
- **Finalizers**: Use WeakRef/FinalizationRegistry
  - Rejected: Non-deterministic, not reliable for critical cleanup

**Implementation Notes**:
- Block.dispose() must be idempotent (safe to call multiple times)
- Set references to null/undefined: `this.parent = undefined`
- Clear arrays: `this.children.length = 0`
- ScriptRuntime maintains try-finally to ensure disposal

---

### 6. How do timer events trigger advancement?

**Decision**: Event-driven architecture with NextEventHandler

**Rationale**:
- Timers register duration-based events during block.push()
- Event handlers stored in RuntimeMemory (in-memory)
- When timer expires, NextEventHandler triggers next() or pop()
- Decouples timing from advancement logic
- Already implemented in existing event system

**Flow**:
1. Block.push() creates timer and registers NextEvent with duration
2. NextEvent stored in RuntimeMemory with handler reference
3. Timer expires → NextEventHandler.handle(event) called
4. Handler calls block.next() or block.pop() depending on completion
5. Resulting actions processed by ScriptRuntime

**Alternatives Considered**:
- **Polling**: Check timer status in loop
  - Rejected: Inefficient, wastes CPU
- **Callbacks**: Direct callback registration
  - Rejected: Less flexible than event system
- **Promise-based**: Use async/await for timers
  - Rejected: Harder to manage multiple concurrent timers

**Implementation Notes**:
- NextEventHandler already exists in codebase
- Timer configuration in block constructor
- Event handlers automatically cleaned up when memory disposed

---

## Technology Decisions

### Testing Strategy
- **Unit Tests**: Test individual block advancement logic (next/pop/push)
- **Integration Tests**: Test full script execution with nesting
- **Performance Tests**: Verify <1ms push/pop, <5ms JIT compilation
- **Edge Case Tests**: Stack overflow, invalid blocks, circular refs
- **Storybook Stories**: Visual demonstration of advancement scenarios

### Performance Optimization
- Use array indexing for O(1) stack access
- Pre-allocate arrays where possible to reduce allocations
- Avoid deep cloning - use references and explicit ownership
- Profile critical paths (push/pop/compile) to verify targets
- Consider object pooling if allocation becomes bottleneck

### Error Handling Patterns
- Validation errors: Throw TypeError with descriptive messages
- Stack errors: Throw Error and halt immediately
- Disposal errors: Log but don't throw (best-effort cleanup)
- Logging: Console.log for debugging, console.error for failures

---

## Dependencies & Integration

### Existing Interfaces (DO NOT CHANGE)
- `IRuntimeBlock`: Defines push/next/pop/dispose contract
- `IRuntimeAction`: Base for NextAction and other actions
- `RuntimeStack`: Stack implementation with push/pop operations
- `JitCompiler`: Compiles CodeStatement to IRuntimeBlock
- `IScriptRuntime`: Main runtime coordinating execution

### New Components Required
- Enhanced parent block implementation with child cursor tracking
- Parse-time validation in visitor (timer.visitor.ts)
- Advancement scenario Storybook stories
- Integration tests for nested execution

### Modified Components
- `JitCompiler`: May need strategy updates for lazy compilation
- `ScriptRuntime`: Must handle NextAction and call dispose()
- Parent block strategies: Add next() logic for sequential children

---

## Open Questions (None Remaining)
All clarifications resolved in spec.md Session 2025-10-04.

---

## References
- [Feature Specification](./spec.md)
- [WOD Wiki Constitution](../../.specify/memory/constitution.md)
- [Runtime Workflow State](../../docs/Runtime%20Workflow%20State.md)
- Existing Runtime Interfaces:
  - src/runtime/IRuntimeBlock.ts
  - src/runtime/RuntimeStack.ts
  - src/runtime/JitCompiler.ts
  - src/runtime/NextEventHandler.ts
