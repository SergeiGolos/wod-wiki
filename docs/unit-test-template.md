# Runtime Unit Test Design Template

This document outlines a standardized approach for creating unit tests for the WOD Wiki runtime environment. The goal is to provide a consistent, reusable, and extensible template for verifying the behavior of all runtime blocks and operations.

## 1. Core Testing Philosophy

The testing strategy is centered around an "Arrange-Act-Assert" pattern and is divided into three distinct levels:

1.  **Compiler-Level Unit Testing**: Focuses on the JIT compiler's logic. These tests verify that a given WOD script statement is correctly translated into a runtime block with the appropriate fragments and behaviors, *without* executing it.
2.  **Runtime Integration Testing**: Focuses on the stateful behavior of the runtime. These tests use a specialized test harness to simulate the lifecycle of runtime blocks (pushing, popping, executing) and validate the resulting state changes.
3.  **End-to-End Execution Testing**: Focuses on the final output of the engine. These tests execute a full WOD script from start to finish and validate the aggregated results, such as the final `ExecutionRecord`.

---

## 2. Level 1: Compiler-Level Unit Testing

This level ensures the JIT compiler correctly constructs runtime blocks from parsed statements.

**Workflow**: `Code String` -> `Parser` -> `JIT Compiler` -> `Runtime Block`

**Goal**: Validate that the `Runtime Block` created by the JIT compiler has the correct initial properties, fragments, and attached behaviors.

### 2.1. Test Structure

```typescript
import { suite, test, expect } from 'vitest';
import { WodParser } from '@/parser/WodParser';
import { JitCompiler } from '@/runtime/JitCompiler';
// Assuming a compiler that can create a block without pushing to a stack
// or a test setup that allows inspecting the created block.

suite('JIT Compiler: [Statement Type]', () => {
    test('should create a block with correct fragments and behaviors', () => {
        // 1. ARRANGE
        const script = 'rounds 5 / timer 30s';
        const parser = new WodParser();
        const compiler = new JitCompiler(/* may not need a runtime instance */);
        const { statements } = parser.parse(script);

        // 2. ACT
        // This is a conceptual method. We might need to adapt the JIT Compiler
        // to allow creating a block without immediately pushing it to the stack.
        const createdBlock = compiler.createBlockFrom(statements[0]);

        // 3. ASSERT
        // Validate the block's type and internal configuration.
        expect(createdBlock).toBeInstanceOf(RoundsBlock);
        expect(createdBlock.totalRounds).toBe(5);

        // Validate the fragments attached to the block.
        const fragments = createdBlock.getFragments();
        expect(fragments.some(f => f instanceof TimerFragment && f.duration === 30000)).toBe(true);
        
        // Validate attached behaviors (e.g., looping).
        const behaviors = createdBlock.getBehaviors();
        expect(behaviors.some(b => b instanceof LoopingBehavior)).toBe(true);
    });
});
```

---

## 3. Level 2: Runtime Integration Testing

This level ensures that runtime blocks behave correctly when executed within a stack-based environment. It uses a custom test runtime to provide fine-grained control over the execution flow.

**Workflow**: `Code String` -> `JIT` -> `CustomTestRuntime` -> `Execute Events` -> `Validate State`

**Goal**: Validate the state of the runtime stack and its blocks after specific events (e.g., time passing, actions completing).

### 3.1. The Custom Test Runtime

A `CustomTestRuntime` (or test harness) should be created with helper methods for testability:

*   **Stack Manipulation**: `push(block)`, `pop()`, `next()` to manually control the stack.
*   **State Inspection**: `getCurrentBlock()`, `getBlockById(id)`, `getStateSnapshot()` to get a serializable representation of the runtime for assertions.
*   **State Mutation**: `updateBlockState(blockId, partialState)` to directly modify the state of a specific block, enabling tests for edge cases.
*   **Event Simulation**: `tick(ms)` to advance time, `completeAction()` to simulate user interaction.

### 3.2. Test Structure

```typescript
import { suite, test, expect } from 'vitest';
import { CustomTestRuntime } from '.../helpers/CustomTestRuntime';
import { WodParser } from '@/parser/WodParser';
import { JitCompiler } from '@/runtime/JitCompiler';

suite('Runtime Integration: [Scenario]', () => {
    test('should transition to the next block after a timer expires', () => {
        // 1. ARRANGE
        const script = `
            timer 10s
            timer 20s
        `;
        const testRuntime = new CustomTestRuntime();
        const parser = new WodParser();
        const compiler = new JitCompiler(testRuntime); // JIT uses the test runtime

        const { statements } = parser.parse(script);
        
        // Process the script to load the blocks into the runtime.
        compiler.process(statements[0]);
        compiler.process(statements[1]);
        
        expect(testRuntime.stack.length).toBe(2);
        const firstBlock = testRuntime.current();
        // expect(firstBlock.duration).toBe(10000);

        // 2. ACT
        // Simulate the passage of enough time for the first timer to complete.
        testRuntime.tick(10001);

        // 3. ASSERT
        // The first block should have been popped, and the second is now current.
        expect(testRuntime.stack.length).toBe(1);
        const secondBlock = testRuntime.current();
        // expect(secondBlock.duration).toBe(20000);

        // Or, using a snapshot of the runtime state.
        const state = testRuntime.getStateSnapshot();
        expect(state.stackDepth).toBe(1);
        expect(state.currentBlock.name).toBe('TimerBlock');
        expect(state.currentBlock.properties.remainingTime).toBe(20000);
    });
});
```
---

## 4. Level 3: End-to-End Execution Testing

This level validates the final, aggregated output of a full workout execution. It ensures that the entire pipeline—from parsing to execution to result generation—works together correctly.

**Workflow**: `WOD Script` -> `Parser` -> `JIT` -> `Runtime` -> `Execute to Completion` -> `Capture Output` -> `Validate Output`

**Goal**: Validate the final `ExecutionRecord` generated after a script runs to completion.

### 4.1. Test Harness for Full Execution

The `CustomTestRuntime` can be extended or used to run a script to completion. It should provide:

*   An event emitter to signal completion: `runtime.on('complete', (result) => ...)`
*   A high-level execution method: `runToCompletion()`, which internally simulates time and actions until the runtime stack is empty.

### 4.2. Test Structure

```typescript
import { suite, test, expect } from 'vitest';
import { CustomTestRuntime } from '.../helpers/CustomTestRuntime';
import { WodParser } from '@/parser/WodParser';
import { JitCompiler } from '@/runtime/JitCompiler';
import { ExecutionRecord } from '@/types/ExecutionRecord';

suite('End-to-End Execution: [Workout Type]', () => {
    test('should produce a correct execution record for a simple rounds workout', async () => {
        // 1. ARRANGE
        const script = `
            #workout
            rounds 3
            5 reps
            10 push-ups
        `;
        const testRuntime = new CustomTestRuntime();
        const parser = new WodParser();
        const compiler = new JitCompiler(testRuntime);

        // Set up a promise to capture the final result.
        let executionResult: ExecutionRecord;
        testRuntime.on('complete', (result) => {
            executionResult = result;
        });

        // 2. ACT
        // Parse, compile, and run the entire script to completion.
        const { statements } = parser.parse(script);
        statements.forEach(stmt => compiler.process(stmt));
        await testRuntime.runToCompletion(); // Simulates all ticks and actions needed.

        // 3. ASSERT
        // Validate the aggregated results in the final record.
        expect(executionResult).toBeDefined();
        expect(executionResult.totalTime).toBeGreaterThan(0);
        
        const summary = executionResult.summary;
        expect(summary.completedRounds).toBe(3);

        const metrics = executionResult.metrics;
        expect(metrics.reps.total).toBe(15); // 3 rounds * 5 reps
        expect(metrics['push-ups'].total).toBe(30); // 3 rounds * 10 push-ups
    });
});
```

This three-level approach provides a solid foundation for building a comprehensive and maintainable test suite, ensuring the compiler's translation logic, the runtime's execution behavior, and the final workout results are all thoroughly validated.
