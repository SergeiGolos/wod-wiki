
## 1. Product overview

### 1.1 Document title and version

- PRD: ExecutionContext Testing Platform
- Version: 1.0

### 1.2 Product summary

The ExecutionContext Testing Platform is a standalone testing infrastructure that enables developers to validate the runtime execution behavior of the WOD Wiki system. It centers on a **MockJitCompiler** that records all compilation requests and allows test authors to define exactly which blocks are returned for specific statements. This enables precise testing of the `ExecutionContext` turn-based execution model, action queueing, clock freezing, and recursion limits.

Unlike existing harnesses that focus on isolated behavior testing or strategy validation, this platform tests the full execution flow: events trigger handlers, handlers produce actions, actions are processed in turns, and blocks with real behaviors respond to lifecycle calls.

The platform provides a controllable test clock, allowing time to be set and advanced programmatically, enabling validation of timing-sensitive execution chains.

## 2. Goals

### 2.1 Business goals

- Reduce runtime bugs by enabling comprehensive testing of the execution model
- Increase developer confidence when modifying `ExecutionContext`, `ScriptRuntime`, or action processing logic
- Provide a reference implementation for testing complex multi-block execution scenarios

### 2.2 User goals

- Test authors can see exactly what statements are sent to the JIT compiler
- Test authors can define specific blocks (with real behaviors) to be returned for compilation
- Test authors can verify actions generated during execution turns
- Test authors can control and advance time during test execution
- Test authors can validate recursion limits and queue behavior

### 2.3 Non-goals

- Replacing existing `BehaviorTestHarness` or `RuntimeTestBuilder` (this is additive)
- Mocking behaviors (real behaviors are used)
- Full parser integration (statements can be provided directly)
- UI component testing

## 3. User personas

### 3.1 Key user types

- Runtime developers modifying execution flow
- Strategy authors validating block compilation
- QA engineers writing integration tests

### 3.2 Basic persona details

- **Runtime Developer**: Needs to verify that changes to `ExecutionContext` or `ScriptRuntime` don't break action processing, clock freezing, or recursion limits.
- **Strategy Author**: Needs to see what statements are compiled and verify blocks are created correctly with expected behaviors.
- **Integration Tester**: Needs to test complex multi-block scenarios with controllable timing.

### 3.3 Role-based access

- **Test Author**: Full access to harness configuration, JIT mock setup, and assertion helpers

## 4. Functional requirements

- **MockJitCompiler** (Priority: High)
  - Records all `compile(statements, runtime)` calls with timestamps
  - Allows pre-configuration of block responses via predicate matching
  - Supports factory functions for dynamic block creation
  - Provides access to compile call history for assertions
  - Falls back to parent JIT behavior when no match configured

- **ExecutionContextTestHarness** (Priority: High)
  - Creates a complete runtime environment with mock JIT
  - Provides controllable test clock (set time, advance by ms)
  - Records all action executions with timestamps and iteration counts
  - Records all event dispatches with resulting actions
  - Exposes runtime, stack, event bus, and JIT for direct access

- **Block creation helpers** (Priority: Medium)
  - Factory methods for creating `MockBlock` instances with real behaviors
  - Registration helpers to link blocks to JIT responses
  - Support for configuring block fragments, memory, and completion state

- **Execution API** (Priority: High)
  - Execute actions through `runtime.do()` (creates ExecutionContext internally)
  - Dispatch events through `runtime.handle()`
  - Direct ExecutionContext creation for isolated testing
  - Helper methods for common operations (push/pop blocks)

- **Assertion helpers** (Priority: Medium)
  - Query actions by type
  - Verify action execution order
  - Check compile call count and content
  - Validate stack state after execution

## 5. User experience

### 5.1 Entry points & first-time user flow

- Import harness from `@/testing/harness`
- Create harness with optional configuration (clock time, max depth)
- Configure mock JIT with expected block responses
- Execute actions or dispatch events
- Assert on recorded executions and final state

### 5.2 Core experience

- **Configure JIT**: Define what blocks to return for specific statements
  - Clear, fluent API: `harness.mockJit.whenMatches(predicate, block)`
  - Statement content matching: `harness.mockJit.whenTextContains('10:00', timerBlock)`

- **Execute**: Run actions or dispatch events through the runtime
  - Actions are wrapped to record execution metadata
  - Clock is frozen during execution turn

- **Assert**: Verify execution behavior
  - Check `harness.actionExecutions` for recorded actions
  - Check `harness.mockJit.compileCalls` for JIT interactions
  - Verify stack state via `harness.stack`

### 5.3 Advanced features & edge cases

- Testing recursion limits by creating actions that queue more actions
- Verifying clock freezing by checking timestamps within a turn
- Testing error scenarios when max iterations exceeded
- Multi-block execution chains with parent-child relationships

### 5.4 UI/UX highlights

- Fluent builder pattern for configuration
- Type-safe APIs with full TypeScript support
- Clear separation between configuration, execution, and assertion phases

## 6. Narrative

A runtime developer needs to verify that a change to the `ExecutionContext` correctly freezes time during an execution turn. They create a test harness, configure the mock JIT to return a timer block with a `TimerBehavior`, and execute a "next" event. They then verify that all actions generated during the turn see the same `clock.now` timestamp, confirming the frozen clock behavior works correctly.

## 7. Success metrics

### 7.1 User-centric metrics

- Test authors can write execution tests with < 10 lines of setup
- All existing execution-related tests can be migrated to new harness
- Clear error messages when max iterations exceeded

### 7.2 Business metrics

- Reduction in runtime-related bug reports
- Increased test coverage for `ExecutionContext` and `ScriptRuntime`

### 7.3 Technical metrics

- Harness initialization < 10ms
- No memory leaks from recorded executions
- Compatible with existing `MockBlock` and behavior implementations

## 8. Technical considerations

### 8.1 Integration points

- `ExecutionContext` - Core class being tested
- `ScriptRuntime` - Runtime wrapper that creates ExecutionContext
- `JitCompiler` - Extended by MockJitCompiler
- `MockBlock` - Reused from existing harness
- `createMockClock` - Reused for time control

### 8.2 Data storage & privacy

- No persistent storage - all recordings are in-memory during test execution
- Recordings cleared between tests via `clearRecordings()` method

### 8.3 Scalability & performance

- Minimal overhead for action wrapping
- Lazy recording (only when needed for assertions)
- Clear method to reset state between tests

### 8.4 Potential challenges

- Ensuring MockJitCompiler correctly inherits from JitCompiler
- Managing circular dependencies between harness and runtime types
- Keeping action recording non-intrusive to actual execution flow

## 9. Milestones & sequencing

### 9.1 Project estimate

- Small: 2-3 hours implementation

### 9.2 Team size & composition

- 1 developer with runtime knowledge

### 9.3 Suggested phases

- **Phase 1**: MockJitCompiler implementation (30 min)
  - Extend JitCompiler with call recording
  - Add predicate-based block configuration
  - Add assertion helpers for compile calls

- **Phase 2**: ExecutionContextTestHarness core (45 min)
  - Create harness with runtime, mock JIT, test clock
  - Implement action execution recording
  - Implement event dispatch recording

- **Phase 3**: Builder and helpers (30 min)
  - Fluent builder for harness configuration
  - Block creation and registration helpers
  - Assertion convenience methods

- **Phase 4**: Export and documentation (15 min)
  - Add exports to harness index
  - Add to core-entry if needed

## 10. User stories

### 10.1. Create MockJitCompiler with call recording

- **ID**: ECTX-001
- **Description**: As a test author, I want a mock JIT compiler that records all compile calls so I can verify what statements were sent for compilation.
- **Acceptance criteria**:
  - MockJitCompiler extends JitCompiler
  - `compile()` method records statements, timestamp, and result
  - `compileCalls` property returns all recorded calls
  - `lastCompileCall` property returns the most recent call
  - `clearCalls()` method resets recording

### 10.2. Configure pre-defined block responses

- **ID**: ECTX-002
- **Description**: As a test author, I want to define which blocks the mock JIT returns for specific statements so I can control the blocks used during test execution.
- **Acceptance criteria**:
  - `whenMatches(predicate, block)` configures predicate-based matching
  - `whenTextContains(text, block)` provides convenience matching
  - `withDefaultBlock(block)` sets fallback for unmatched statements
  - Block can be a static instance or factory function
  - First matching predicate wins (order-sensitive)

### 10.3. Create ExecutionContextTestHarness

- **ID**: ECTX-003
- **Description**: As a test author, I want a standalone test harness that provides a complete runtime environment with mock JIT so I can test execution behavior.
- **Acceptance criteria**:
  - Harness creates ScriptRuntime with MockJitCompiler
  - Harness uses controllable test clock (createMockClock)
  - Harness exposes runtime, mockJit, clock, stack, eventBus
  - Harness accepts configuration for initial clock time and max action depth

### 10.4. Control test clock

- **ID**: ECTX-004
- **Description**: As a test author, I want to control the clock used by the runtime so I can test timing-sensitive execution scenarios.
- **Acceptance criteria**:
  - `withClock(time)` sets the current time
  - `advanceClock(ms)` advances time by milliseconds
  - Clock is accessible via `harness.clock`
  - Clock is used by ExecutionContext for frozen time

### 10.5. Record action executions

- **ID**: ECTX-005
- **Description**: As a test author, I want all action executions to be recorded so I can verify the actions generated during execution turns.
- **Acceptance criteria**:
  - `executeAction(action)` executes action through runtime.do()
  - Each execution records: action, timestamp, iteration number
  - `actionExecutions` property returns all recorded executions
  - `getActionsByType(type)` filters by action type
  - `wasActionExecuted(type)` returns boolean check

### 10.6. Dispatch events through runtime

- **ID**: ECTX-006
- **Description**: As a test author, I want to dispatch events through the runtime so I can test event-driven execution flows.
- **Acceptance criteria**:
  - `dispatchEvent(event)` dispatches through runtime.handle()
  - Dispatch records: event, timestamp, resulting actions
  - `eventDispatches` property returns all recorded dispatches
  - Resulting actions are executed in same turn

### 10.7. Create blocks with real behaviors

- **ID**: ECTX-007
- **Description**: As a test author, I want to create blocks with real behaviors so I can test actual lifecycle action generation.
- **Acceptance criteria**:
  - `createMockBlock(config)` creates MockBlock with configuration
  - `createAndRegisterBlock(id, match)` creates and registers with JIT
  - Blocks can be configured with real behavior instances
  - Blocks respond to mount/next/unmount with real behavior actions

### 10.8. Fluent builder pattern

- **ID**: ECTX-008
- **Description**: As a test author, I want a fluent builder for the harness so I can configure tests concisely.
- **Acceptance criteria**:
  - `ExecutionContextTestBuilder` provides fluent configuration
  - `withClock(time)` sets initial clock
  - `withMaxDepth(n)` sets max action iterations
  - `withStrategy(strategy)` adds JIT strategies
  - `build()` creates configured harness

### 10.9. Test ExecutionContext iteration limits

- **ID**: ECTX-009
- **Description**: As a test author, I want to verify that ExecutionContext respects iteration limits so I can ensure infinite loops are prevented.
- **Acceptance criteria**:
  - Harness can be configured with low max depth (e.g., 5)
  - Actions that queue more actions are tracked
  - Error is thrown when max iterations exceeded
  - Test can catch and verify the error

### 10.10. Verify frozen clock during turn

- **ID**: ECTX-010
- **Description**: As a test author, I want to verify that all actions in a turn see the same frozen clock time so I can ensure timing consistency.
- **Acceptance criteria**:
  - All action executions in same turn have same timestamp
  - ExecutionContext uses SnapshotClock internally
  - Clock advances between turns but not within