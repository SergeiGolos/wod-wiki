# Runtime Debugging and Testing Architecture

This document outlines the architecture for enabling a global debug mode, generic test blocks, and comprehensive logging within the runtime engine.

## 1. Objectives

- **Global Debug Mode**: A toggleable state in the runtime engine that affects how blocks and behaviors are executed.
- **Console Logging**: Automatic, verbose logging of block lifecycle and events when debug mode is active.
- **Test Blocks / Spies**: A generic mechanism to wrap or replace standard block functionality with test-specific implementations (spies, mocks).
- **Behavior Overwriting**: The ability to intercept and replace the standard behavior chain of a `RuntimeBlock` for testing purposes.

## 2. Architecture Overview

### 2.1. Global Debug Mode

The `IScriptRuntime` interface will be extended to include a `debugMode` property.

```typescript
export interface IScriptRuntime {
  // ... existing properties
  debugMode: boolean;
  setDebugMode(enabled: boolean): void;
}
```

When `debugMode` is enabled, the runtime and its components (Compiler, Blocks, Behaviors) will emit detailed logs and expose internal state.

### 2.2. Generic Test Block (The "Spy" Wrapper)

To support the requirement: *"By default, it should just overwrite behaviors and create the spy,"* we will introduce a `TestBlock` or a `DebugProxyBlock`.

Instead of creating a new class hierarchy, we will implement a **Proxy Pattern** around `RuntimeBlock`.

#### Mechanism:
1.  **Interception**: When the JIT Compiler creates a block, if `debugMode` is on (or if specific test configurations are present), it wraps the block or its behaviors.
2.  **Spying**: The wrapper intercepts `mount`, `next`, `unmount`, and event handling.
3.  **Behavior Replacement**: The wrapper can suppress the original behaviors and substitute them with mock behaviors.

### 2.3. Behavior Injection & Overwriting

Currently, `RuntimeBlock` takes an array of `IRuntimeBehavior` in its constructor. To make this testable, we need to allow the `JitCompiler` (or a `TestCompiler` extension) to inject a `DebugBehavior` or `SpyBehavior`.

#### Proposed `SpyBehavior`:
A generic behavior that sits at the front of the behavior chain.

```typescript
class SpyBehavior implements IRuntimeBehavior {
    constructor(private originalBehaviors: IRuntimeBehavior[]) {}

    onPush(runtime: IScriptRuntime, block: IRuntimeBlock) {
        if (runtime.debugMode) {
             console.log(`[Spy] ${block.label} MOUNT`);
        }
        // Logic to conditionally call original behaviors or mock them
    }
    // ... implement onNext, onPop, onEvent
}
```

## 3. Implementation Plan

### 3.1. Update `IScriptRuntime` and `ScriptRuntime`
Add `debugMode` state.

```typescript
// src/runtime/ScriptRuntime.ts
export class ScriptRuntime implements IScriptRuntime {
    public debugMode: boolean = false;

    constructor(...) {
        // ...
        // Listen to global debug toggle if needed
    }
}
```

### 3.2. Enhance `JitCompiler` for Debugging
Modify `JitCompiler.compile` to attach debug metadata or wrap the resulting block.

```typescript
// src/runtime/JitCompiler.ts
compile(nodes: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    // ... existing compile logic ...
    const block = strategy.compile(nodes, runtime);

    if (runtime.debugMode && block instanceof RuntimeBlock) {
        return this.createDebugProxy(block);
    }
    return block;
}

private createDebugProxy(block: RuntimeBlock): RuntimeBlock {
    // Option A: Inject a DebugBehavior that logs everything
    // Option B: Return a Proxy<RuntimeBlock>

    // Recommended: Behavior Injection
    // We can't easily modify the readonly behaviors array of an existing block,
    // so the Strategy might need to be aware of debugMode during creation.
}
```

**Refined Approach**: Pass `debugMode` into the strategies or the `RuntimeBlock` constructor.

### 3.3. The `TestBlock` and Behavior Replacement
We will create a specific `TestBlockStrategy` or genericize the existing strategies to support a "Test Mode".

If the goal is to *replace* functionality, we can introduce a **Runtime Interceptor**.

**New Interface**: `IBlockInterceptor`
Allows replacing the implementation of `mount`, `next`, etc.

### 3.4. Console Logging Integration
When `debugMode` is enabled, the `ExecutionLogger` (or a new `ConsoleLogger`) should output:
- **Block Lifecycle**: `[Block: Pushups] MOUNT`, `[Block: Pushups] NEXT`, `[Block: Pushups] UNMOUNT`
- **Behavior Execution**: `[TimerBehavior] Tick`, `[EffortBehavior] Rep completed`
- **State Changes**: Variable allocations/updates.

## 4. Workflows

### 4.1. User turns on Debug Mode in UI
1.  UI sets `runtime.debugMode = true`.
2.  Future blocks compiled by `JitCompiler` will have debug behaviors attached.
3.  Existing blocks (if we want hot-swapping) might check `runtime.debugMode` inside their `next()` loops.

### 4.2. Writing a Test for a Block
The user (or developer) wants to test "10 Pushups" but replace the actual timer with a mock.

1.  **Test Setup**:
    ```typescript
    runtime.debugMode = true;
    runtime.registerSpy('Pushups', (block) => {
        // Replace behaviors
        block.behaviors = [new MockTimerBehavior()];
    });
    ```
2.  **Execution**:
    - `JitCompiler` matches "10 Pushups".
    - It creates the `RuntimeBlock`.
    - It checks for registered spies.
    - It applies the spy modification (swapping behaviors).

## 5. Summary of Changes

1.  **`src/runtime/IScriptRuntime.ts`**: Add `debugMode`.
2.  **`src/runtime/RuntimeBlock.ts`**:
    - Allow behavior modification (maybe generic setters for testing).
    - Add `debug()` method to dump state.
3.  **`src/runtime/behaviors/DebugBehavior.ts`**: Create a new behavior that logs lifecycle events.
4.  **`src/runtime/JitCompiler.ts`**: Inject `DebugBehavior` if `runtime.debugMode` is true.

This architecture satisfies the requirement to "overwrite behaviors," "create spies," and "enable console logging" generically across the application.
