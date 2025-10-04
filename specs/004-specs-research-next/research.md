# Research: Next Button Integration for Workout Script Execution

**Feature**: Next Button Integration
**Date**: 2025-10-04
**Scope**: Runtime event system enhancement for step-by-step execution

## Existing System Analysis

### Current Runtime Architecture
The WOD Wiki runtime system uses an event-driven architecture with the following key components:

1. **ScriptRuntime**: Central event processor (`src/runtime/ScriptRuntime.ts:65-115`)
2. **Memory-Based Handler Storage**: Handlers stored in runtime memory and discovered via search
3. **Event Interface**: Standardized event structure (`src/runtime/IEvent.ts`)
4. **Runtime Stack**: Stack-based execution with constructor-based initialization

### Current Next Button State
- **Location**: `stories/compiler/JitCompilerDemo.tsx:584-589`
- **Handler**: `handleNextBlock` function at `stories/compiler/JitCompilerDemo.tsx:503-508`
- **Issue**: Event handling line commented out, `NextEvent` class missing
- **Current Behavior**: Only increments UI version without actual runtime progression

### Event System Patterns
- **Handler Registration**: Stored in memory with type 'handler'
- **Event Processing**: Sequential execution through `ScriptRuntime.handle()`
- **Action Pattern**: Handlers return actions that modify runtime state
- **Memory Management**: Consumer-managed disposal patterns

## Implementation Requirements

### Core Components Needed
1. **NextEvent**: Event class implementing `IEvent` interface
2. **NextEventHandler**: Handler class implementing `IEventHandler` interface
3. **NextAction**: Action class implementing `IRuntimeAction` interface

### Integration Points
1. **JitCompilerDemo**: Update handler to emit `NextEvent`
2. **Runtime Blocks**: Register next event handlers during construction
3. **UI State**: Update interface to reflect execution state changes
4. **Error Handling**: Implement graceful error recovery and boundary conditions

### Performance Considerations
- **Event Processing**: Target <50ms per event
- **UI Updates**: Target <100ms response time
- **Memory Integrity**: Maintain clean disposal patterns
- **Timestamp Accuracy**: Prioritize over processing speed per FR-009

### Edge Cases to Address
1. **Script Completion**: Disable button, provide visual feedback
2. **Rapid Clicks**: Queue and process sequentially
3. **Error States**: Stop execution, display error, allow retry
4. **Invalid Runtime**: Prevent advancement in bad states
5. **Memory Corruption**: Detect and handle gracefully

## Technical Constraints

### Constitutional Requirements
- Must follow Component-First Architecture
- Must be developed in Storybook first
- Must use existing JIT Compiler Runtime patterns
- Must follow constructor-based initialization and consumer-managed disposal
- Must meet performance targets (<1ms push/pop, <50ms dispose)

### Integration Constraints
- No parser changes required
- No Monaco Editor changes needed
- Must work within existing event system architecture
- Must maintain compatibility with existing runtime blocks

## Success Criteria
1. **Functional**: Next button advances execution by one step
2. **Performance**: Event processing <50ms, UI updates <100ms
3. **Reliability**: No memory leaks, graceful error handling
4. **User Experience**: Clear visual feedback for all states
5. **Testability**: Comprehensive unit and integration test coverage

## Risks and Mitigations

### Technical Risks
1. **Handler Registration Conflicts**: Use unique IDs and proper scoping
2. **Memory Management**: Follow existing disposal patterns strictly
3. **Performance Impact**: Optimize handler discovery and execution
4. **State Synchronization**: Leverage existing `getLastUpdatedBlocks()` pattern

### Implementation Risks
1. **Breaking Changes**: Comprehensive regression testing required
2. **Complexity**: Start with minimal implementation, enhance iteratively
3. **Testing**: Existing test infrastructure provides good coverage foundation

## Research Conclusion
The Next Button integration is technically feasible with low implementation risk. The existing runtime architecture provides a solid foundation for event-driven execution advancement. The primary challenge is implementing missing event system components while following established patterns for memory management, handler registration, and action execution.

**Estimated Implementation**: 11-16 hours across 4 phases, with immediate functionality achievable in Phase 1.