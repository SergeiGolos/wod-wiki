# Runtime Integration Testing

This document describes the strategy for validating the engine's core logic, stack management, and output generation using `bun test` and specialized integration harnesses.

## Goal
The goal of runtime integration testing is to deeply validate the engine's behavior, stack state, and memory output across complex workout scenarios. These tests run in a pure JavaScript environment (Bun) and are decoupled from the UI/Storybook.

## Core Principles
1.  **Deep Engine Validation**: Inspecting the internal `RuntimeStack`, memory state, and output statements.
2.  **Clock Control**: Using **Fake Clocks** (`MockClock`) to control time deterministically (EMOMs, AMRAPs).
3.  **Spies & Tracing**: Using an `OutputTracingHarness` to record every event and output statement emitted by the engine for verification.
4.  **Domain-Specific Language (DSL)**: Leveraging a structured test harness to create scenarios, execute actions, and assert state.

## Infrastructure

### 1. Session Test Context
**File:** `tests/jit-compilation/helpers/session-test-utils.ts`

This harness creates a full pipeline with all strategies (AMRAP, Interval, Loop, etc.) and provides a clean API for test execution:
- `createSessionContext(script)`: Parses a script and initializes a full `ScriptRuntime`.
- `startSession(ctx, options)`: Dispatches the `StartSessionAction`.
- `userNext(ctx)`: Simulates the "Next" event (user-driven progression).
- `advanceClock(ctx, ms)`: Advances the mock clock and triggers the `tick` event.

### 2. Output Tracing Harness
**File:** `tests/harness/OutputTracingHarness.ts`

The `OutputTracingHarness` subscribes to the engine's output and records every `IOutputStatement`. It provides powerful assertion helpers:
- `assertSequence(expected)`: Validates the exact sequence of outputs (segments, completions, milestones).
- `assertPairedOutputs()`: Ensures every `segment` (start) has a matching `completion` (end) from the same block.
- `fromBlock(blockKey)`: Filters outputs by their source block.

## What to Validate in Runtime Tests

### Stack Management
- **Depth & Structure**: Is the stack depth correct at each step? (e.g., `SessionRoot > AMRAP > Exercise`).
- **Nesting**: Do nested loops and groups push/pop their children correctly?
- **Auto-Termination**: Does the session end when all blocks are complete or the timer expires?

### Timing & Events
- **Interval Transitions**: Does an EMOM correctly auto-advance to the next round when the clock hits 60s?
- **Timer Expiry**: Does an AMRAP correctly clear all children and terminate when the 20-minute clock expires?
- **Tick Events**: Ensure the engine correctly responds to time-based events.

### Metric Inheritance
- **Rep Schemes**: Does the 21-15-9 scheme correctly distribute 21 reps to the first round and 15 to the second?
- **Memory Values**: Are round counters and total round counts correctly stored in the engine's memory?

### Output Tracing Example
```typescript
it('should emit correct output sequence for Fran', () => {
    const ctx = createSessionContext('(21-15-9)
Thrusters
Pullups');
    startSession(ctx);
    userNext(ctx); // Start

    // Assert the first exercise started
    ctx.tracer.assertSequence([
        { outputType: 'segment', stackLevel: 2, hasFragmentType: FragmentType.Effort }
    ]);
});
```

## Best Practices
- **Use Mock Clocks**: Never use real timers. Deterministic testing requires `advanceClock()`.
- **Trace Outputs**: Use the `tracer` to verify that the engine is communicating the correct information to its subscribers.
- **Isolate Scenarios**: Create a test file for each major workout pattern (AMRAP, EMOM, Rep Scheme, etc.).
- **Dispose**: Always call `disposeSession(ctx)` in `afterEach()` to clear subscriptions and timers.
