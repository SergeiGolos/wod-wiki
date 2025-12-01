# Runtime Debugging and Testing Architecture

> **Implementation Status: ✅ COMPLETE**
> 
> This architecture has been implemented in the following files:
> - [`src/runtime/IRuntimeOptions.ts`](../../src/runtime/IRuntimeOptions.ts) - Runtime configuration options
> - [`src/runtime/RuntimeBuilder.ts`](../../src/runtime/RuntimeBuilder.ts) - Fluent builder for runtime creation
> - [`src/runtime/DebugRuntimeStack.ts`](../../src/runtime/DebugRuntimeStack.ts) - Debug-aware stack with automatic wrapping
> - [`src/runtime/ScriptRuntime.ts`](../../src/runtime/ScriptRuntime.ts) - Updated to support debug mode
> - [`src/runtime/NextBlockLogger.ts`](../../src/runtime/NextBlockLogger.ts) - Enhanced logging with lifecycle events
> - [`src/runtime/__tests__/RuntimeDebugMode.test.ts`](../../src/runtime/__tests__/RuntimeDebugMode.test.ts) - Comprehensive test suite

This document outlines the architecture for enabling a global debug mode, generic test blocks, and comprehensive logging within the runtime engine. It builds upon existing infrastructure including [`TestableBlock`](../../src/runtime/testing/TestableBlock.ts) and [`NextBlockLogger`](../../src/runtime/NextBlockLogger.ts).

## 1. Objectives

- **Global Debug Mode**: A toggleable state in the runtime engine that affects how blocks and behaviors are executed.
- **Runtime Ownership**: The debug capabilities are owned by the `ScriptRuntime` instance and configured at construction time.
- **Universal Spy Wrapping**: In debug mode, *every* `RuntimeBlock` processed by the runtime is wrapped using the existing `TestableBlock` class.
- **Transparency**: The `TestableBlock` wrapper fully implements `IRuntimeBlock` and displays itself as the original object to the rest of the system, delegating calls transparently.
- **Behavior Overwriting**: The `TestableBlock` provides multiple modes (`spy`, `override`, `passthrough`, `ignore`) for intercepting and replacing standard block behaviors.
- **Console Logging**: Integration with the existing `NextBlockLogger` for structured debug output of block lifecycle events.

## 2. Architecture Overview

### 2.1. Global Debug Mode & Runtime Ownership

The debug capability is not just a flag but a structural configuration of the `ScriptRuntime`.

- **Configuration**: The spying feature is enabled or disabled via the `ScriptRuntime` constructor or a `RuntimeBuilder`.
- **Ownership**: The runtime holds the reference to the `SpyFactory` or `Interceptor` logic.

```typescript
export interface IRuntimeOptions {
    debugMode?: boolean;
    spyFactory?: (block: IRuntimeBlock) => IRuntimeBlock;
}

export class ScriptRuntime implements IScriptRuntime {
    constructor(
        script: WodScript,
        compiler: JitCompiler,
        options: IRuntimeOptions = {}
    ) {
        // ...
    }
}
```

### 2.2. Leveraging TestableBlock

The codebase already has a `TestableBlock` class in [`src/runtime/testing/TestableBlock.ts`](../../src/runtime/testing/TestableBlock.ts) that provides exactly this functionality with `spy`, `override`, `passthrough`, and `ignore` modes.

#### Mechanism:
1.  **Interception**: When the JIT Compiler creates a block, if `debugMode` is on (or if specific test configurations are present), it wraps the block using `TestableBlock` in the appropriate mode.
2.  **Spying**: `TestableBlock` in `spy` mode intercepts `mount`, `next`, `unmount`, `dispose`, and event handling, logging calls and optionally collecting metrics.
3.  **Behavior Replacement**: In `override` mode, `TestableBlock` can suppress the original behaviors and substitute them with mock implementations.

#### Example: Using TestableBlock in Spy Mode

```typescript
import { TestableBlock } from "@/runtime/testing/TestableBlock";

// Wrap a block in spy mode with custom logging
const testBlock = new TestableBlock(originalBlock, {
    testId: 'debug-pushups-1',
    mountMode: 'spy',
    nextMode: 'spy',
    disposeMode: 'spy'
});

// After execution, inspect recorded calls
console.log(testBlock.calls);           // All recorded method calls
console.log(testBlock.wasCalled('mount')); // Check if mount was called
console.log(testBlock.callCount('next'));  // Count next() invocations
```

### 2.3. Behavior Injection & Overwriting

Currently, `RuntimeBlock` takes an array of `IRuntimeBehavior` in its constructor. The `behaviors` property is declared as `protected readonly` (see [`src/runtime/RuntimeBlock.ts`](../../src/runtime/RuntimeBlock.ts)), which means it cannot be reassigned after construction.

For testability, the `JitCompiler` (or a test extension) should wrap blocks with `TestableBlock` and select the desired mode (`spy`, `override`, etc.) to inject test behaviors via composition rather than mutation.

The complete list of `IRuntimeBehavior` lifecycle hooks is:
- `onPush` - Called when the owning block is pushed onto the stack
- `onNext` - Called when determining the next block after a child completes
- `onPop` - Called right before the owning block is popped from the stack
- `onDispose` - Called when the block is being disposed
- `onEvent` - Called when an event is dispatched to the block

See [`src/runtime/IRuntimeBehavior.ts`](../../src/runtime/IRuntimeBehavior.ts) for the complete interface definition.

#### Example: Overriding Behavior with TestableBlock

```typescript
import { TestableBlock } from "@/runtime/testing/TestableBlock";

// Override mount to skip default behavior
const testBlock = new TestableBlock(originalBlock, {
    testId: 'test-pushups',
    mountMode: 'override',
    mountOverride: (runtime) => {
        console.log('[Test] Skipping default mount behavior');
        return []; // Return empty actions
    }
});
```

### 2.4. Console Logging Integration

The codebase already has `NextBlockLogger` in [`src/runtime/NextBlockLogger.ts`](../../src/runtime/NextBlockLogger.ts) with toggleable logging via `NextBlockLogger.setEnabled(true)`. This existing logger provides structured debug output for block lifecycle events.

#### Enabling Debug Logging

```typescript
import { NextBlockLogger } from "@/runtime/NextBlockLogger";

// Enable logging
NextBlockLogger.setEnabled(true);

// Run your workout execution...

// Review log history
console.log(NextBlockLogger.getHistory());
console.log(NextBlockLogger.getSummary());

// Clear history when done
NextBlockLogger.clearHistory();
```

#### Log Output Examples
- **Next Action**: `🎯 NEXT-BLOCK | Action Start`, `✅ NEXT-BLOCK | Action Complete`
- **Child Advancement**: `📍 NEXT-BLOCK | Child Advancement`
- **Compilation**: `🔨 NEXT-BLOCK | Compilation Start`, `✅ NEXT-BLOCK | Compilation Success`
- **Stack Operations**: `⬆️ NEXT-BLOCK | Push Start`, `✅ NEXT-BLOCK | Push Complete`
- **Block Lifecycle**: `[Block: Pushups] MOUNT`, `[Block: Pushups] NEXT`, `[Block: Pushups] DISPOSE`

## 3. Implementation Plan

### 3.1. Update `ScriptRuntime` Construction
- Add `IRuntimeOptions` to the constructor.
- Implement logic to wrap blocks pushed to the stack using `TestableBlock` if `debugMode` is true.
- Enable `NextBlockLogger` automatically when `debugMode` is active.

### 3.2. Integrate with TestableBlock
- Extend `TestableBlock` configuration if needed for additional debug features.
- The existing `TestableBlock` already provides:
  - Method interception (`spy`, `override`, `passthrough`, `ignore` modes)
  - Call recording for assertions
  - Custom test IDs for easy identification

### 3.3. Update `JitCompiler` (Optional)
- The JIT compiler could return the wrapped block directly. However, wrapping at the `RuntimeStack.push` level might be safer to catch *all* blocks, including manually created ones.
- *Decision*: Let's handle it in `RuntimeFactory` or `JitCompiler` to ensure the runtime only ever sees the `TestableBlock` wrapper.

### 3.4. Debug Interface
- Expose a `runtime.debug` API (available only in debug mode) to configure `TestableBlock` wrappers and overrides.
- Leverage `NextBlockLogger.setEnabled()` for toggling console output.

## 4. Workflows

### 4.1. Enabling Debug Mode
```typescript
import { NextBlockLogger } from "@/runtime/NextBlockLogger";

// Enable logging
NextBlockLogger.setEnabled(true);

const runtime = new RuntimeBuilder(script)
    .withDebugMode(true)
    .build();
```

### 4.2. Runtime Execution with TestableBlock
1.  Runtime asks Compiler for a block.
2.  Compiler creates `RuntimeBlock`.
3.  Because `debugMode` is on, Compiler (or Factory) wraps it in `TestableBlock`.
4.  Runtime receives `TestableBlock`.
5.  Runtime calls `block.mount()`.
6.  `TestableBlock` records the call, delegates to `realBlock.mount()`, returns result.
7.  `NextBlockLogger` outputs structured logs if enabled.

### 4.3. Test Scenario
User wants to verify that "10 Pushups" triggers a specific event but wants to skip the default behavior.

1.  **Setup**:
    ```typescript
    import { TestableBlock } from "@/runtime/testing/TestableBlock";
    
    // Create block normally
    const pushupsBlock = compiler.compile(statements, runtime);
    
    // Wrap with TestableBlock using override mode
    const testableBlock = new TestableBlock(pushupsBlock, {
        testId: 'test-pushups',
        mountMode: 'override',
        mountOverride: (runtime) => {
            // Custom logic - skip default mount, return specific actions
            return [new CustomTestAction()];
        }
    });
    ```
2.  **Run**:
    - The `TestableBlock` intercepts `mount()` and uses the override.
    - After execution, inspect `testableBlock.calls` to verify behavior.

## 5. Summary of Changes

This architecture builds upon existing infrastructure rather than creating new implementations:

1.  **`src/runtime/IScriptRuntime.ts`**: Add `debugMode` flag to `IRuntimeOptions`.
2.  **`src/runtime/testing/TestableBlock.ts`**: Already exists - extend if needed for additional debug features.
3.  **`src/runtime/NextBlockLogger.ts`**: Already exists - integrate with debug mode for automatic enabling.
4.  **`src/runtime/JitCompiler.ts`**: Update to wrap compiled blocks with `TestableBlock` when debug mode is active.

### Design Principles

- **Behaviors remain immutable after construction**; do not allow modification via setters.
- For testing, use the `TestableBlock` wrapper pattern to substitute behaviors via **composition over mutation**.
- Leverage existing logging infrastructure (`NextBlockLogger`) rather than creating new loggers.

This refined architecture ensures that the debug/spy system is transparent, owned by the runtime, and provides a powerful override mechanism for testing while maintaining compatibility with the existing codebase.

## 6. Quick Start Guide

### Enabling Debug Mode

```typescript
import { RuntimeBuilder } from '@/runtime';
import { WodScript } from '@/parser/WodScript';
import { globalCompiler } from '@/runtime-test-bench/services/testbench-services';

// Parse your workout script
const script = new WodScript('3 Rounds\n  10 Pushups\n  15 Squats', statements);

// Create runtime with debug mode enabled
const runtime = new RuntimeBuilder(script, globalCompiler)
    .withDebugMode(true)
    .build();

// All blocks are now automatically wrapped with TestableBlock
```

### Inspecting Block Calls

```typescript
// After execution, inspect wrapped blocks
const allCalls = runtime.getAllBlockCalls();
console.log('All block method calls:', allCalls);

// Get a specific wrapped block
const pushupBlock = runtime.getWrappedBlock('effort-pushups-1');
if (pushupBlock) {
    console.log('Mount was called:', pushupBlock.wasCalled('mount'));
    console.log('Next call count:', pushupBlock.callCount('next'));
    console.log('All calls:', pushupBlock.calls);
}
```

### Using NextBlockLogger

```typescript
import { NextBlockLogger } from '@/runtime/NextBlockLogger';

// Enable logging (automatically enabled in debug mode)
NextBlockLogger.setEnabled(true);

// After execution, review logs
console.log('Log summary:', NextBlockLogger.getSummary());
console.log('Stage counts:', NextBlockLogger.getStageCounts());
console.log('Full history:', NextBlockLogger.getHistory());

// Get logs for a specific block
const blockLogs = NextBlockLogger.getBlockHistory('effort-pushups-1');

// Clear logs when done
NextBlockLogger.clearHistory();
```

### Custom Debug Event Handler

```typescript
const runtime = new RuntimeBuilder(script, compiler)
    .withDebugMode(true)
    .withDebugLogHandler((event) => {
        // Custom handling of debug events
        console.log(`[${event.type}] ${event.blockKey}`, event.details);
        
        // Send to analytics, write to file, etc.
        analytics.track('runtime-debug', event);
    })
    .build();
```

### Override Block Behavior for Testing

```typescript
import { TestableBlock } from '@/runtime/testing';

const realBlock = compiler.compile(statements, runtime);

// Override mount to skip default behavior
const testBlock = new TestableBlock(realBlock, {
    testId: 'test-pushups',
    mountMode: 'override',
    mountOverride: (runtime) => {
        console.log('[Test] Custom mount behavior');
        return []; // Return custom actions or empty
    },
    nextMode: 'spy', // Spy on next() calls
    disposeMode: 'passthrough', // Let dispose run normally
});

// Use testBlock instead of realBlock
runtime.stack.push(testBlock);
```

### Using RuntimeFactory with Debug Mode

```typescript
import { RuntimeFactory } from '@/runtime/RuntimeFactory';
import { globalCompiler } from '@/runtime-test-bench/services/testbench-services';

const factory = new RuntimeFactory(globalCompiler);

// Create runtime with debug mode for a WodBlock
const runtime = factory.createRuntime(wodBlock, { 
    debugMode: true,
    enableLogging: true 
});
```
