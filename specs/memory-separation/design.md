# Memory Separation for Runtime Debugging - Design Document

## 1. Context and Goals

### Business Context
The WOD Wiki runtime system currently uses a single stack architecture that manages both program execution and runtime state (metrics, spans, handlers). This coupling creates challenges for debugging and analysis, as it's difficult to inspect the application's state independently of its execution flow.

### Success Criteria
- ✅ Enable independent debugging of runtime memory state
- ✅ Separate execution control (stack) from state management (memory)
- ✅ Automatic memory cleanup when stack items are removed
- ✅ Child processes can be aware of their execution state
- ✅ Maintain backward compatibility with existing runtime blocks

### In-scope
- New memory management system for runtime state
- Memory reference system for passing state between components  
- Debug interfaces for independent memory inspection
- Automatic lifecycle management tied to stack operations
- Base classes for gradual migration

### Out-of-scope
- Completely rewriting existing runtime blocks (gradual migration approach)
- Performance optimization (future enhancement)
- Persistent memory storage

## 2. Requirements

### Functional Requirements
- **FR1**: Memory can be allocated independently of the execution stack
- **FR2**: Memory references can be passed between runtime components
- **FR3**: Debug interface allows inspection of memory without affecting execution
- **FR4**: Automatic cleanup of memory when associated stack items are removed
- **FR5**: Parent-child memory relationships for hierarchical state
- **FR6**: Existing runtime blocks continue to work without modification

### Non-functional Requirements
- **NFR1**: Memory operations should be fast enough not to impact runtime performance
- **NFR2**: Memory debugging should be safe (read-only) and not affect execution
- **NFR3**: Memory lifecycle should be deterministic and predictable
- **NFR4**: System should be extensible for future memory management features

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ScriptRuntimeWithMemory                     │
├─────────────────────────────────────────────────────────────────┤
│  Execution Control              │  State Management              │
│  ┌─────────────────┐           │  ┌─────────────────┐           │
│  │  RuntimeStack   │           │  │  RuntimeMemory  │           │
│  │  - push()       │           │  │  - allocate()   │           │
│  │  - pop()        │◄──────────┤  │  - release()    │           │
│  │  - current      │  cleanup  │  │  - getByOwner() │           │
│  └─────────────────┘           │  └─────────────────┘           │
│                                │                                │
│  ┌─────────────────┐           │  ┌─────────────────┐           │
│  │ IRuntimeBlock   │           │  │ MemoryReference │           │
│  │ - tick()        │◄──────────┤  │ - get/set()     │           │
│  │ - isDone()      │  allocate │  │ - isValid()     │           │
│  │ - reset()       │           │  │ - createChild() │           │
│  └─────────────────┘           │  └─────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌─────────────────────────┐
                    │    DebugMemoryView      │
                    │  - getMemorySnapshot()  │
                    │  - getByType()          │
                    │  - getMemoryHierarchy() │
                    └─────────────────────────┘
```

### Component Responsibilities

- **RuntimeStack**: Controls execution flow, determines what runs next
- **RuntimeMemory**: Manages state allocations, references, and lifecycle
- **MemoryReference**: Provides controlled access to allocated memory locations
- **DebugMemoryView**: Enables safe, read-only inspection of memory state
- **ScriptRuntimeWithMemory**: Coordinates stack and memory, handles cleanup

## 4. Data and API Design

### Core Interfaces

```typescript
interface IRuntimeMemory {
    allocate<T>(type: string, initialValue?: T, ownerId?: string): IMemoryReference<T>;
    release(reference: IMemoryReference): void;
    getByOwner(ownerId: string): IMemoryReference[];
    getAllReferences(): IMemoryReference[];
    createSnapshot(): Record<string, any>;
}

interface IMemoryReference<T> {
    readonly id: string;
    readonly type: string;
    get(): T | undefined;
    set(value: T): void;
    isValid(): boolean;
    createChild<C>(type: string, initialValue?: C): IMemoryReference<C>;
}

interface IDebugMemoryView {
    getMemorySnapshot(): DebugMemorySnapshot;
    getByType(type: string): DebugMemoryEntry[];
    getByOwner(ownerId: string): DebugMemoryEntry[];
    getMemoryHierarchy(): DebugMemoryHierarchy;
}
```

### Memory Lifecycle

1. **Allocation**: `memory.allocate()` creates new memory reference
2. **Usage**: Components use reference to get/set values
3. **Child Creation**: `ref.createChild()` creates dependent memory
4. **Cleanup**: `memory.release()` invalidates reference and all children
5. **Auto-cleanup**: Stack pop operations trigger memory cleanup

## 5. Detailed Design

### Memory Separation Pattern

**Before (Coupled)**:
```typescript
class RuntimeBlock {
    private state: ExerciseState;  // State stored in block
    private metadata: Metadata;    // Metadata stored in block
    
    tick() {
        this.state.reps++;  // Direct state mutation
    }
}
```

**After (Separated)**:
```typescript
class RuntimeBlock extends RuntimeBlockWithMemoryBase {
    tick() {
        const stateRef = this.getMemory<ExerciseState>('state');
        const state = stateRef.get();
        state.reps++;
        stateRef.set(state);  // State managed separately
    }
}
```

### Debug Independence

Debug operations use separate view that doesn't affect execution:
```typescript
// Get debug snapshot without affecting runtime
const snapshot = runtime.debugMemory.getMemorySnapshot();

// Inspect memory by type
const exerciseStates = runtime.debugMemory.getByType('exercise-state');

// View memory hierarchy
const hierarchy = runtime.debugMemory.getMemoryHierarchy();
```

### Automatic Cleanup Flow

1. Block allocated memory: `block.allocateMemory('state', initialState)`
2. Memory tracked by owner: `memory[ownerId] = [memRef1, memRef2, ...]`
3. Stack pop: `stack.pop()` → `block.cleanupMemory()`
4. Release memory: `memory.release(memRef)` for each reference
5. Cascade cleanup: Parent cleanup invalidates all children

## 6. Testing Strategy

### Test Coverage
- ✅ Memory allocation and deallocation
- ✅ Parent-child memory relationships
- ✅ Automatic cleanup on stack operations
- ✅ Debug view independence
- ✅ Memory hierarchy construction
- ✅ Reference lifecycle management

### Test Types
- **Unit Tests**: Individual memory components
- **Integration Tests**: Memory + stack interactions
- **Demo Tests**: End-to-end memory separation scenarios

## 7. Risks and Tradeoffs

### Risks Identified
- **Memory Leaks**: Mitigated by automatic cleanup tied to stack lifecycle
- **Performance Impact**: Minimal - references are lightweight wrappers
- **Complexity**: Offset by improved debugging capabilities and cleaner separation

### Tradeoffs Made
- **Backward Compatibility**: Chose gradual migration over complete rewrite
- **Memory Overhead**: Small reference objects vs. direct property access
- **Learning Curve**: New APIs vs. improved debugging experience

### Alternatives Considered
1. **Event-based State**: Rejected due to complexity and async issues
2. **Global State Store**: Rejected due to coupling and side effects
3. **Complete Rewrite**: Rejected due to migration risk and scope

## 8. Rollout and Observability

### Migration Strategy
1. **Phase 1**: ✅ Core memory system implementation
2. **Phase 2**: Base classes for gradual block migration
3. **Phase 3**: Update critical runtime blocks to use memory system
4. **Phase 4**: Deprecate direct state management patterns

### Observability
- Console logging for memory operations (allocate/release)
- Debug snapshots for memory state inspection
- Memory hierarchy visualization
- Cleanup verification through test assertions

## 9. Work Plan

### Completed Milestones
- ✅ **M1**: Core memory interfaces and implementation
- ✅ **M2**: Memory reference system with parent-child relationships
- ✅ **M3**: Debug view interface for independent inspection
- ✅ **M4**: Automatic cleanup integration with stack operations
- ✅ **M5**: Base classes for gradual migration
- ✅ **M6**: Comprehensive test suite
- ✅ **M7**: Working demonstration of memory separation

### Future Work
- **M8**: Update existing runtime blocks to use memory system
- **M9**: Performance optimization and monitoring
- **M10**: Advanced debugging tools and visualizations

## 10. Open Questions

### Resolved
- ~~How to handle backward compatibility?~~ → Gradual migration with base classes
- ~~What about memory cleanup?~~ → Automatic lifecycle tied to stack operations
- ~~How to enable debugging?~~ → Separate debug view interface

### Remaining
- Performance impact assessment under load (requires benchmarking)
- Memory persistence for debugging sessions (future enhancement)
- Integration with external debugging tools (future enhancement)

---

## Implementation Summary

The memory separation design successfully addresses all requirements from the original problem statement:

✅ **Memory Allocation & Cleanup**: `RuntimeMemory.allocate()` and automatic cleanup  
✅ **Memory Referencing**: `IMemoryReference` system for passing references  
✅ **Debug Tooling**: `IDebugMemoryView` for independent state inspection  
✅ **Runtime Environment Debugging**: Separate memory makes debugging easier  
✅ **Child Execution State**: Memory references provide state awareness  
✅ **Independent State View**: Debug snapshots work without affecting execution  

The solution maintains backward compatibility while providing a clear path forward for improved debugging and runtime analysis capabilities.