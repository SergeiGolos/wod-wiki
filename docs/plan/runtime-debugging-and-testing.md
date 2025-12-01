# Runtime Debugging and Testing Architecture

This document outlines the architecture for enabling a global debug mode, generic test blocks, and comprehensive logging within the runtime engine.

## 1. Objectives

- **Global Debug Mode**: A toggleable state in the runtime engine that affects how blocks and behaviors are executed.
- **Runtime Ownership**: The debug capabilities are owned by the `ScriptRuntime` instance and configured at construction time.
- **Universal Spy Wrapping**: In debug mode, *every* `RuntimeBlock` processed by the runtime is wrapped by a generic Spy object.
- **Transparency**: The Spy object fully implements `IRuntimeBlock` and displays itself as the original object to the rest of the system, delegating calls transparently.
- **Behavior Overwriting (Override Language)**: The Spy object provides a mechanism to intercept and replace standard block behaviors with mocks or alternate logic.
- **Console Logging**: The Spy automatically generates verbose logs for all block lifecycle events and state changes.

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

### 2.2. The Spy Wrapper (Transparent Proxy)

To satisfy the requirement that *any runtime block* is first wrapped by the spy object without changing the actual block, we will use a **Proxy** or **Decorator** pattern.

#### mechanism:
1.  **Wrapping**: When the JIT Compiler produces a block (or when the Runtime pushes it to the stack), if `debugMode` is active, the block is wrapped in a `RuntimeBlockSpy`.
2.  **Transparency**: `RuntimeBlockSpy` implements `IRuntimeBlock`. It forwards all property access and method calls to the underlying block, *unless* they are explicitly overridden.
3.  **Self-Display**: The Spy ensures that properties like `key`, `label`, `blockType`, and `context` appear identical to the original block.

```typescript
class RuntimeBlockSpy implements IRuntimeBlock {
    constructor(private readonly realBlock: IRuntimeBlock) {}

    get key() { return this.realBlock.key; }
    get label() { return this.realBlock.label; }
    // ... proxies all other properties ...

    mount(runtime: IScriptRuntime): IRuntimeAction[] {
        // 1. Log Start
        console.log(`[Spy] Mount: ${this.label}`);

        // 2. Check for Overrides
        if (this.hasOverride('mount')) {
             return this.executeOverride('mount', runtime);
        }

        // 3. Delegate
        const result = this.realBlock.mount(runtime);

        // 4. Log Result
        console.log(`[Spy] Mount Result:`, result);
        return result;
    }

    // ... implements next(), unmount(), etc.
}
```

### 2.3. Behavior Overwriting (The "Override Language")

The Spy object serves as the hook for the "Override Language". This allows tests to modify behavior without touching the original block code.

- **Injection**: Tests can register overrides for specific blocks (by Key or Type) on the Runtime.
- **Execution**: The Spy checks these registrations before delegating.

```typescript
// Example of the "Override Language" usage in a test
runtime.debug.spyOn('Pushups').override('next', (runtime, block) => {
    // Custom logic to skip the timer
    return [new NextBlockAction()];
});
```

### 2.4. Console Logging Integration

The Spy wrapper enforces logging "for free" on all blocks.
- **Lifecycle Logs**: `mount`, `next`, `unmount`.
- **Event Logs**: When the block's event handlers are triggered.
- **Data Dumps**: `debug()` method on the Spy prints the full state of the inner block.

## 3. Implementation Plan

### 3.1. Update `ScriptRuntime` Construction
- Add `IRuntimeOptions` to the constructor.
- Implement logic to wrap blocks pushed to the stack if `debugMode` is true.

### 3.2. Implement `RuntimeBlockSpy`
- Create `src/runtime/debug/RuntimeBlockSpy.ts`.
- Implement `IRuntimeBlock`.
- Add logging hooks.
- Add an `overrides` registry map within the spy or referenced from the runtime.

### 3.3. Update `JitCompiler` (Optional)
- Alternatively, the JIT compiler could return the wrapped block directly. However, wrapping at the `RuntimeStack.push` level might be safer to catch *all* blocks, including manually created ones.
- *Decision*: Let's handle it in `RuntimeFactory` or `JitCompiler` to ensure the runtime only ever sees the Spy.

### 3.4. Debug Interface
- Expose a `runtime.debug` API (available only in debug mode) to configure spies and overrides.

## 4. Workflows

### 4.1. Enabling Debug Mode
```typescript
const runtime = new RuntimeBuilder(script)
    .withDebugMode(true)
    .build();
```

### 4.2. Runtime Execution with Spies
1.  Runtime asks Compiler for a block.
2.  Compiler creates `RuntimeBlock`.
3.  Because `debugMode` is on, Compiler (or Factory) wraps it in `RuntimeBlockSpy`.
4.  Runtime receives `RuntimeBlockSpy`.
5.  Runtime calls `block.mount()`.
6.  `RuntimeBlockSpy` logs "Mounting...", calls `realBlock.mount()`, logs result, returns result.

### 4.3. Test Scenario
User wants to verify that "10 Pushups" triggers a specific event but wants to skip the 10-second timer.

1.  **Setup**:
    ```typescript
    const runtime = new RuntimeFactory().createRuntime(block, { debug: true });

    // Use the override language
    runtime.spies.forLabel('Pushups').overrideBehavior(TimerBehavior, new MockTimer());
    ```
2.  **Run**:
    - The `RuntimeBlockSpy` for "Pushups" sees the override.
    - Instead of executing the real `TimerBehavior`, it uses `MockTimer`.

## 5. Summary of Changes

1.  **`src/runtime/IScriptRuntime.ts`**: Add `debugMode` and `spyRegistry`.
2.  **`src/runtime/debug/RuntimeBlockSpy.ts`**: The core Proxy implementation.
3.  **`src/runtime/RuntimeFactory.ts`**: Update to accept options and inject the wrapping logic.
4.  **`src/runtime/JitCompiler.ts`**: Ensure compiled blocks are wrapped if the runtime context demands it (or let the runtime handle the wrapping upon receipt).

This refined architecture ensures that the debug/spy system is transparent, owned by the runtime, and provides a powerful override mechanism for testing.
