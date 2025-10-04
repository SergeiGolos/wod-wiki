# Research: Consolidate AdvancedRuntimeBlock Using Stacked Behaviors

**Date**: October 4, 2025  
**Feature**: 007-consolidate-advancedruntimeblock-using

## Research Questions & Findings

### 1. Existing Behavior Infrastructure Analysis

**Question**: What is the current state of the `IRuntimeBehavior` interface and how is it integrated into `RuntimeBlock`?

**Decision**: Use existing `IRuntimeBehavior` interface without modifications

**Rationale**:
- `RuntimeBlock` already contains `protected readonly behaviors: IRuntimeBehavior[]` array
- Lifecycle methods (push/next/pop) already delegate to behaviors in deterministic order
- Each behavior receives full runtime and block context
- Optional hooks allow selective implementation (onPush, onNext, onPop, onDispose)
- No existing concrete behavior implementations found (clean slate for new behaviors)

**Alternatives Considered**:
- **Create new behavior interface**: Rejected - existing interface already provides all required hooks
- **Modify IRuntimeBehavior**: Rejected - current interface is sufficient and changes would affect existing infrastructure

**Implementation Notes**:
```typescript
// Existing RuntimeBlock behavior delegation pattern (no changes needed)
next(): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
        const behaviorActions = behavior?.onNext?.(this._runtime, this) || [];
        actions.push(...behaviorActions);
    }
    return actions;
}
```

---

### 2. State Management Strategy for Behaviors

**Question**: How should behaviors maintain state across multiple lifecycle calls and coordinate with each other?

**Decision**: Behaviors use RuntimeBlock allocated memory references with get/set methods for shared state, plus internal instance variables for behavior-specific state

**Rationale**:
- RuntimeBlock already provides memory allocation and access patterns
- Shared state (timers, metrics) can be coordinated through memory references
- Behavior-specific state (current child index) maintained in instance variables
- No modifications required to existing memory management infrastructure
- Clarified in spec Session 2025-10-04

**Alternatives Considered**:
- **Behavior-to-behavior direct communication**: Rejected - creates tight coupling between behaviors
- **Event bus pattern**: Rejected - adds complexity and performance overhead
- **Block metadata dictionary**: Rejected - memory reference pattern already established

**Implementation Notes**:
- `ChildAdvancementBehavior` uses instance variable for `currentChildIndex`
- Shared completion state can use RuntimeBlock memory if needed by multiple behaviors
- Parent context stored in behavior instance variable

---

### 3. JIT Compilation Failure Handling

**Question**: What should happen when lazy compilation fails for a child statement?

**Decision**: Push ErrorRuntimeBlock onto stack that stops execution with error end behavior

**Rationale**:
- Consistent with error handling patterns throughout the runtime system
- Provides clear error feedback to users through clock/UI components
- Stops execution immediately rather than silently skipping errors
- Clarified in spec Session 2025-10-04 (replaces previous "skip and continue" behavior)

**Alternatives Considered**:
- **Skip failed child and continue**: Rejected - hides errors and may lead to incorrect workout execution
- **Throw exception**: Rejected - not consistent with action-based runtime architecture
- **Return error action**: Rejected - ErrorRuntimeBlock provides richer error context

**Implementation Notes**:
```typescript
// LazyCompilationBehavior pseudocode
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    try {
        const childBlock = runtime.jit.compile([currentStatement], runtime);
        return [new NextAction(childBlock)];
    } catch (error) {
        const errorBlock = new ErrorRuntimeBlock(error, runtime);
        return [new NextAction(errorBlock)];
    }
}
```

---

### 4. Performance Impact of Behavior Delegation

**Question**: What is the performance overhead of iterating through multiple behaviors on each lifecycle call?

**Decision**: Minimal overhead acceptable - behavior array iteration adds <0.1ms per call

**Rationale**:
- Behavior array iteration is O(n) where n is small (typically 4 behaviors)
- JavaScript array iteration is highly optimized in modern engines
- Existing RuntimeBlock already uses this pattern
- Performance budget allows for <5ms next() execution, plenty of headroom
- Can optimize with early returns if behavior returns non-empty actions

**Alternatives Considered**:
- **Single composite behavior**: Rejected - loses composability and testability benefits
- **Behavior caching/memoization**: Rejected - premature optimization, adds complexity
- **Lazy behavior evaluation**: Rejected - all behaviors need opportunity to generate actions

**Performance Validation**:
- Benchmark required: next() with 0 behaviors vs 4 behaviors
- Target: < 0.5ms overhead for behavior delegation
- Measure with real workout scenarios in Storybook

---

### 5. Backward Compatibility Strategy

**Question**: How should the migration from AdvancedRuntimeBlock to behavior-based composition be handled?

**Decision**: Direct replacement with deprecation warnings but no compatibility layer

**Rationale**:
- No external code extends AdvancedRuntimeBlock (internal implementation detail)
- Clean migration path reduces long-term maintenance burden
- Deprecation warnings guide developers to new pattern
- All usage is internal to the library
- Clarified in spec Session 2025-10-04

**Alternatives Considered**:
- **Adapter pattern maintaining AdvancedRuntimeBlock**: Rejected - adds complexity and maintenance overhead
- **Parallel implementation period**: Rejected - increases codebase complexity during transition
- **Breaking change with no transition**: Rejected - too abrupt, deprecation warnings provide smoother path

**Migration Steps**:
1. Implement all behaviors with full feature parity
2. Add deprecation warnings to AdvancedRuntimeBlock
3. Update all internal usage to behavior-based composition
4. Remove AdvancedRuntimeBlock and IAdvancedRuntimeBlock
5. Update documentation and examples

---

### 6. Behavior Composition Patterns

**Question**: What patterns should be used for composing behaviors in RuntimeBlock construction?

**Decision**: Constructor-based explicit composition with behavior factory helpers

**Rationale**:
- Explicit composition makes behavior stack visible and understandable
- Constructor pattern already established in RuntimeBlock hierarchy
- Factory helpers can provide common behavior combinations
- Type safety through TypeScript ensures correct behavior configuration

**Alternatives Considered**:
- **Builder pattern**: Rejected - adds API surface area without clear benefit
- **Decorator pattern**: Rejected - less explicit than constructor composition
- **Configuration-based composition**: Rejected - loses type safety and IDE support

**Implementation Pattern**:
```typescript
// Explicit composition
const block = new RuntimeBlock(runtime, sourceId, [
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior(),
    new CompletionTrackingBehavior(),
    new ParentContextBehavior(parentBlock)
]);

// Optional factory helper
const block = RuntimeBlock.withAdvancedBehaviors(
    runtime, 
    sourceId, 
    children, 
    parentBlock
);
```

---

### 7. Testing Strategy for Behavior Composition

**Question**: How should behavior composition be tested to ensure correctness and maintain performance requirements?

**Decision**: Three-tier testing approach: unit tests per behavior, integration tests for composition, contract tests for feature parity

**Rationale**:
- Unit tests validate individual behavior logic in isolation
- Integration tests validate behavior coordination and action composition
- Contract tests ensure AdvancedRuntimeBlock feature parity
- Performance tests validate execution time requirements
- Storybook provides visual validation and interactive testing

**Alternatives Considered**:
- **End-to-end tests only**: Rejected - doesn't provide behavior-level isolation
- **Unit tests only**: Rejected - doesn't validate behavior composition
- **Manual testing in Storybook**: Rejected - insufficient for regression prevention

**Test Coverage Requirements**:
- Unit tests: 100% coverage of each behavior's logic paths
- Integration tests: All common behavior combinations (2-4 behaviors)
- Contract tests: All AdvancedRuntimeBlock scenarios from existing contract tests
- Performance tests: Benchmark all lifecycle methods with full behavior stack

---

### 8. Behavior Execution Order Dependencies

**Question**: Do any behaviors have dependencies on execution order within the behavior stack?

**Decision**: ChildAdvancementBehavior must execute before LazyCompilationBehavior in onNext() calls

**Rationale**:
- ChildAdvancementBehavior determines which child to compile
- LazyCompilationBehavior needs the current child index to compile correct statement
- Array iteration order ensures this naturally when behaviors added in correct order
- CompletionTrackingBehavior should execute last to observe other behaviors' actions
- ParentContextBehavior order-independent (only used in onPush)

**Alternatives Considered**:
- **Explicit priority system**: Rejected - adds complexity for single known dependency
- **Behavior coordination through shared state**: Rejected - makes order dependency implicit
- **Single composite behavior**: Rejected - loses composability benefits

**Implementation Guidelines**:
- Document required behavior order in constructor/factory
- TypeScript type system can enforce through factory function signature
- Integration tests validate correct ordering
- Consider adding order validation in debug/development builds

---

## Architecture Decisions Summary

### Core Design Principles
1. **Composition over Inheritance**: Behaviors replace AdvancedRuntimeBlock inheritance
2. **Single Responsibility**: Each behavior focused on one capability
3. **Explicit Configuration**: Constructor-based composition makes behavior stack visible
4. **Zero Breaking Changes**: Maintain performance and feature parity during migration

### Key Technical Choices
- **State Management**: RuntimeBlock memory references + instance variables
- **Error Handling**: ErrorRuntimeBlock for compilation failures
- **Performance**: Accept <0.5ms behavior delegation overhead
- **Migration**: Direct replacement with deprecation warnings
- **Testing**: Three-tier approach (unit/integration/contract)

### Implementation Priorities
1. **Phase 1**: Implement core behaviors with unit tests
2. **Phase 2**: Integration tests and performance validation
3. **Phase 3**: Migration of AdvancedRuntimeBlock usage
4. **Phase 4**: Deprecation warnings and cleanup
5. **Phase 5**: Documentation and Storybook updates

---

## Risk Mitigation

### High Risk Areas
- **Performance degradation**: Mitigated by early benchmarking and performance tests
- **Behavior coordination bugs**: Mitigated by comprehensive integration tests
- **State management complexity**: Mitigated by clear patterns using memory references

### Medium Risk Areas
- **Migration errors**: Mitigated by contract tests ensuring feature parity
- **Behavior ordering issues**: Mitigated by documentation and integration tests
- **Type safety gaps**: Mitigated by strict TypeScript configuration

### Low Risk Areas
- **User-facing changes**: None - internal architecture refactoring only
- **API changes**: Minimal - existing IRuntimeBehavior interface unchanged
- **Parser/editor impact**: None - runtime-only changes

---

## Dependencies & Prerequisites

### Existing Systems (No Changes Required)
- ✅ IRuntimeBehavior interface and integration in RuntimeBlock
- ✅ JIT compiler system for lazy compilation
- ✅ RuntimeAction types (NextAction, PopAction, ErrorRuntimeBlock)
- ✅ Memory management infrastructure in RuntimeBlock
- ✅ Contract test infrastructure

### New Components Required
- 🔨 Four behavior implementations (ChildAdvancement, LazyCompilation, ParentContext, CompletionTracking)
- 🔨 Behavior unit test suite
- 🔨 Integration test suite for behavior composition
- 🔨 Performance benchmark suite
- 🔨 Storybook stories demonstrating behavior patterns
- 🔨 Migration documentation and examples

---

## Success Criteria Validation

All research findings align with feature specification requirements:
- ✅ FR-001 to FR-004: Behavior composition architecture validated
- ✅ FR-005 to FR-008: ChildAdvancementBehavior design validated
- ✅ FR-009 to FR-013: LazyCompilationBehavior with error handling validated
- ✅ FR-014 to FR-016: ParentContextBehavior design validated
- ✅ FR-017 to FR-019: CompletionTrackingBehavior design validated
- ✅ FR-020 to FR-023: Performance requirements feasible with behavior delegation
- ✅ FR-024 to FR-027: Migration strategy defined
- ✅ FR-028 to FR-031: Testing strategy comprehensive

**Research Phase Complete** ✅ Ready for Phase 1: Design & Contracts
