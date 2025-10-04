# Next Button Integration Analysis: WOD Wiki Runtime Stories

## Executive Summary

The Next button functionality in Storybook runtime stories is currently non-functional due to a missing event system implementation. This document provides a comprehensive analysis of the current state, identifies integration gaps, and outlines a detailed implementation plan to enable runtime-driven script progression from the Storybook interface.

**Core Issue**: The `handleNextBlock` function in `JitCompilerDemo.tsx:503-508` lacks proper event handling infrastructure, specifically a missing `NextEvent` class and associated handlers.

**Impact**: Users cannot advance workout script execution through the UI, limiting the interactive demonstration capabilities of the runtime system.

## Current Implementation Analysis

### Storybook Runtime Stories Architecture

#### Component Structure
- **Primary Component**: `JitCompilerDemo.tsx` located in `stories/compiler/`
- **Runtime Stories**: Multiple story definitions in `stories/runtime/Runtime.stories.tsx`
- **UI Integration**: Storybook stories pass different workout scripts to the demo component

#### Next Button Implementation

**Location**: `JitCompilerDemo.tsx:584-589`

```typescript
<button
  className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
  onClick={handleNextBlock}
>
  ▶️ Next Block
</button>
```

**Current Handler**: `JitCompilerDemo.tsx:503-508`

```typescript
const handleNextBlock = () => {
  // Execute one step on the existing runtime instance
  // runtime.handle(new NextEvent());  // ← COMMENTED OUT
  // Force a re-render without reconstructing the runtime (preserves memory/state)
  setStepVersion(v => v + 1);
};
```

**Critical Gap**: The event handling line is commented out, and `NextEvent` does not exist.

### Runtime Event System Architecture

#### Core Components

1. **ScriptRuntime.handle()** (`src/runtime/ScriptRuntime.ts:65-115`)
   - Central event processor
   - Searches memory for all handlers matching event criteria
   - Executes handler responses in sequence

2. **Memory-Based Handler Storage** (`src/runtime/ScriptRuntime.ts:74-77`)
   ```typescript
   const handlerRefs = this.memory.search({ type: 'handler', id: null, ownerId: null, visibility: null });
   const allHandlers = handlerRefs
       .map(ref => this.memory.get(ref as any))
       .filter(Boolean) as IEventHandler[];
   ```

3. **Event Interface** (`src/runtime/IEvent.ts:5-12`)
   ```typescript
   export interface IEvent {
     name: string;
     timestamp: Date;
     data?: any;
   }
   ```

#### Handler Processing Flow

1. **Event Reception**: `ScriptRuntime.handle(event)` receives an event
2. **Handler Discovery**: Memory search finds all handlers of type `'handler'`
3. **Sequential Processing**: Each handler processes the event and returns actions
4. **Action Execution**: All returned actions are executed in order
5. **State Update**: Runtime state is modified and UI can be refreshed

### Runtime Block Lifecycle Management

#### Constructor-Based Initialization Pattern

- **Blocks initialize during construction**, not when pushed to stack
- **Consumer-managed disposal**: When popping blocks, consumer must call `dispose()`
- **Resource cleanup**: Blocks implement robust disposal patterns with multiple-call safety

#### Block Lifecycle Methods

1. **push()**: Called when block is pushed onto runtime stack
2. **next()**: Called when child block completes, determines next execution
3. **pop()**: Called when block is popped, handles completion logic
4. **dispose()**: Cleans up allocated memory and resources

## Integration Gaps Analysis

### Gap 1: Missing NextEvent Implementation

**Current State**: No `NextEvent` class exists in the codebase.

**Expected Implementation**:
```typescript
// src/runtime/NextEvent.ts (MISSING)
export class NextEvent implements IEvent {
  name = 'next';
  timestamp = new Date();
  data?: any;

  constructor(data?: any) {
    this.data = data;
  }
}
```

**Impact**: Runtime cannot process next-block events because the event type doesn't exist.

### Gap 2: Absence of Next Event Handlers

**Current State**: No handlers are registered to process `NextEvent` instances.

**Handler Registration Pattern** (existing in codebase):
```typescript
// Handlers are stored in memory with type 'handler'
this.memory.allocate('handler', this.key.toString(), {
  name: 'next-handler',
  handler: this.handleNext.bind(this)
});
```

**Missing Handler Implementation**:
- No `NextEventHandler` class
- No handler registration in runtime blocks
- No integration with existing handler discovery system

### Gap 3: Missing Runtime Actions

**Current State**: No actions defined to advance execution state.

**Expected Action Pattern**:
```typescript
// src/runtime/NextAction.ts (MISSING)
export class NextAction implements IRuntimeAction {
  type = 'next';

  do(runtime: IScriptRuntime): void {
    // Logic to advance execution to next block
    const currentBlock = runtime.stack.current;
    if (currentBlock) {
      const nextActions = currentBlock.next();
      nextActions.forEach(action => action.do(runtime));
    }
  }
}
```

### Gap 4: UI-State Synchronization Issues

**Current State**: UI only updates version number without actual runtime progression.

**Missing Components**:
- No mechanism to propagate runtime state changes to UI
- No error handling from runtime to UI components
- No loading states during execution
- No validation of execution boundaries

## Implementation Plan

### Phase 1: Core Event Infrastructure

**Estimated Time**: 2-3 hours
**Priority**: Critical
**Dependencies**: None

#### Tasks

1. **Create NextEvent Class**
   - **File**: `src/runtime/NextEvent.ts`
   - **Implementation**: Basic event class implementing `IEvent`
   - **Lines of Code**: ~10-15
   - **Testing**: Basic unit test for event creation

2. **Update JitCompilerDemo Handler**
   - **File**: `stories/compiler/JitCompilerDemo.tsx`
   - **Change**: Uncomment line 505, add import for `NextEvent`
   - **Lines of Code**: ~3-5
   - **Risk**: Low (simple import and uncomment)

#### Code Example

```typescript
// src/runtime/NextEvent.ts
import { IEvent } from './IEvent';

export class NextEvent implements IEvent {
  readonly name = 'next';
  readonly timestamp = new Date();
  readonly data?: any;

  constructor(data?: any) {
    this.data = data;
  }
}
```

```typescript
// stories/compiler/JitCompilerDemo.tsx (line 505)
import { NextEvent } from '../../src/runtime/NextEvent';

const handleNextBlock = () => {
  // Execute one step on the existing runtime instance
  runtime.handle(new NextEvent());
  // Force a re-render without reconstructing the runtime (preserves memory/state)
  setStepVersion(v => v + 1);
};
```

### Phase 2: Event Handler Implementation

**Estimated Time**: 4-6 hours
**Priority**: Critical
**Dependencies**: Phase 1 completion

#### Tasks

1. **Create NextEventHandler Class**
   - **File**: `src/runtime/NextEventHandler.ts`
   - **Implementation**: Handler that processes next events and returns actions
   - **Lines of Code**: ~30-40
   - **Integration**: Must follow existing `IEventHandler` pattern

2. **Implement Handler Registration Pattern**
   - **Files**: Various runtime block implementations
   - **Change**: Add handler registration during block construction
   - **Lines of Code**: ~20 per block type
   - **Strategy**: Register handlers in block constructors following existing patterns

#### Code Example

```typescript
// src/runtime/NextEventHandler.ts
import { IEventHandler, EventHandlerResponse } from './IEventHandler';
import { IScriptRuntime } from './IScriptRuntime';
import { NextAction } from './NextAction';

export class NextEventHandler implements IEventHandler {
  readonly id: string;
  readonly name: string;

  constructor(id: string) {
    this.id = id;
    this.name = 'next-handler';
  }

  handler(event: any, runtime: IScriptRuntime): EventHandlerResponse {
    if (event.name !== 'next') {
      return { handled: false, abort: false, actions: [] };
    }

    const currentBlock = runtime.stack.current;
    if (!currentBlock) {
      return { handled: true, abort: false, actions: [] };
    }

    // Get next actions from current block
    const nextActions = currentBlock.next();

    return {
      handled: true,
      abort: false,
      actions: nextActions
    };
  }
}
```

### Phase 3: Runtime Action Implementation

**Estimated Time**: 3-4 hours
**Priority**: High
**Dependencies**: Phase 2 completion

#### Tasks

1. **Create NextAction Class**
   - **File**: `src/runtime/NextAction.ts`
   - **Implementation**: Action that advances execution state
   - **Lines of Code**: ~25-30
   - **Integration**: Must implement `IRuntimeAction` interface

2. **Enhance State Management**
   - **File**: `src/runtime/ScriptRuntime.ts`
   - **Change**: Add methods to track execution state changes
   - **Lines of Code**: ~15-20
   - **Strategy**: Leverage existing `getLastUpdatedBlocks()` pattern

#### Code Example

```typescript
// src/runtime/NextAction.ts
import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';

export class NextAction implements IRuntimeAction {
  readonly type = 'next';

  constructor(private targetBlock?: any) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;

    if (!currentBlock) {
      console.log('NextAction: No current block to advance from');
      return;
    }

    console.log(`NextAction: Advancing from block ${currentBlock.key.toString()}`);

    // Execute the block's next logic
    const nextActions = currentBlock.next();

    // Execute all returned actions
    for (const action of nextActions) {
      action.do(runtime);
    }

    console.log(`NextAction: Completed, new stack depth: ${runtime.stack.blocks.length}`);
  }
}
```

### Phase 4: Testing and Validation

**Estimated Time**: 2-3 hours
**Priority**: Medium
**Dependencies**: Phase 3 completion

#### Tasks

1. **Unit Tests**
   - **Files**: Test files for each new component
   - **Coverage**: `NextEvent`, `NextEventHandler`, `NextAction`
   - **Strategy**: Follow existing test patterns in `src/runtime/`

2. **Integration Tests**
   - **File**: `src/runtime/NextEvent.integration.test.ts`
   - **Scenario**: End-to-end next functionality testing
   - **Validation**: Verify proper state transitions and cleanup

3. **Storybook Validation**
   - **Action**: Run `npm run storybook` and test Next button
   - **Stories**: Test various workout scripts in runtime stories
   - **Validation**: Ensure Next button advances execution properly

#### Test Examples

```typescript
// src/runtime/NextEvent.test.ts
import { describe, it, expect } from 'vitest';
import { NextEvent } from './NextEvent';

describe('NextEvent', () => {
  it('should create event with correct properties', () => {
    const event = new NextEvent({ testData: 'value' });

    expect(event.name).toBe('next');
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.data).toEqual({ testData: 'value' });
  });
});
```

```typescript
// src/runtime/NextEventHandler.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextEventHandler } from './NextEventHandler';
import { NextEvent } from './NextEvent';
import { MockScriptRuntime } from '../test/MockScriptRuntime';

describe('NextEventHandler', () => {
  let handler: NextEventHandler;
  let mockRuntime: MockScriptRuntime;

  beforeEach(() => {
    handler = new NextEventHandler('test-handler');
    mockRuntime = new MockScriptRuntime();
  });

  it('should handle next events', () => {
    const event = new NextEvent();
    const response = handler.handler(event, mockRuntime);

    expect(response.handled).toBe(true);
    expect(response.abort).toBe(false);
    expect(response.actions).toBeDefined();
  });

  it('should ignore non-next events', () => {
    const event = { name: 'other', timestamp: new Date() };
    const response = handler.handler(event, mockRuntime);

    expect(response.handled).toBe(false);
  });
});
```

## Risk Assessment and Mitigation

### Technical Risks

1. **Memory Management Complexity**
   - **Risk**: New handlers may cause memory leaks if not properly disposed
   - **Mitigation**: Follow existing disposal patterns in `RuntimeBlock.dispose()`
   - **Validation**: Memory profiling during testing

2. **Handler Registration Conflicts**
   - **Risk**: Multiple handlers may compete for next events
   - **Mitigation**: Use unique handler IDs and proper scoping
   - **Validation**: Integration tests with multiple handlers

3. **State Synchronization Issues**
   - **Risk**: UI may not reflect accurate runtime state
   - **Mitigation**: Leverage existing `getLastUpdatedBlocks()` pattern
   - **Validation**: Manual testing in Storybook

### Implementation Risks

1. **Breaking Changes**
   - **Risk**: New implementation may affect existing functionality
   - **Mitigation**: Thorough regression testing
   - **Validation**: Run existing unit test suite

2. **Performance Impact**
   - **Risk**: Additional handlers may impact runtime performance
   - **Mitigation**: Optimize handler discovery and execution
   - **Validation**: Performance testing with large scripts

## Success Criteria

### Functional Requirements

1. **Next Button Functionality**
   - ✅ Next button advances script execution by one step
   - ✅ Runtime state updates correctly after each next action
   - ✅ UI reflects current execution state accurately

2. **Event System Integration**
   - ✅ `NextEvent` properly integrates with existing event infrastructure
   - ✅ Handlers are discovered and executed correctly
   - ✅ Actions modify runtime state as expected

3. **Error Handling**
   - ✅ Graceful handling of boundary conditions (end of script)
   - ✅ Proper error propagation from runtime to UI
   - ✅ No memory leaks or resource issues

### Performance Requirements

1. **Response Time**
   - ✅ Next button response time < 100ms
   - ✅ Event processing time < 50ms per handler
   - ✅ UI update time < 200ms

2. **Memory Usage**
   - ✅ No memory leaks during repeated next operations
   - ✅ Handler cleanup works properly
   - ✅ Memory usage remains stable during extended sessions

### Quality Requirements

1. **Test Coverage**
   - ✅ Unit tests for all new components (>90% coverage)
   - ✅ Integration tests for end-to-end functionality
   - ✅ Manual testing validation in Storybook

2. **Code Quality**
   - ✅ Follows existing code patterns and conventions
   - ✅ Proper TypeScript typing throughout
   - ✅ Comprehensive documentation and comments

## Conclusion

The Next button integration represents a solvable technical challenge that primarily requires implementing missing event system components rather than architectural changes. The existing runtime infrastructure provides a solid foundation for event-driven execution, making this integration straightforward and low-risk.

**Key Success Factors**:
1. **Leverage Existing Architecture**: The event system and memory management are already well-designed
2. **Follow Established Patterns**: Handler registration and action execution patterns exist throughout the codebase
3. **Incremental Implementation**: Each phase builds upon the previous one, allowing for validation at each step
4. **Comprehensive Testing**: Existing test infrastructure provides good coverage for validation

**Expected Timeline**: 11-16 hours total across 4 phases, with Phase 1 (Core Event Infrastructure) providing immediate Next button functionality and subsequent phases enhancing robustness and completeness.

This implementation will significantly improve the interactive demonstration capabilities of the WOD Wiki runtime system, allowing users to explore script execution step-by-step through the Storybook interface.