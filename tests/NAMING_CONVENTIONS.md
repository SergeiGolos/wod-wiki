# Test Naming Conventions

This document defines naming conventions for test files in the WOD Wiki project.

## General Principles

1. **Use descriptive names** that clearly indicate what is being validated
2. **Use kebab-case** for all test filenames
3. **No suffix indicators** - the directory structure indicates test type (unit, integration, etc.)
4. **Group related tests** in subfolders when appropriate

## Directory Structure

```
tests/
├── harness/                  # Test harness infrastructure (see below)
│   ├── __tests__/           # Harness self-tests
│   └── assertions/          # Custom assertion helpers (planned)
├── language-compilation/     # Parser and AST generation tests
├── jit-compilation/          # Strategy and block compilation tests
├── runtime-execution/        # Runtime state management tests
│   ├── stack/               # RuntimeStack lifecycle
│   ├── blocks/              # Block implementations
│   ├── behaviors/           # Behavior implementations
│   ├── memory/              # Memory allocation and references
│   ├── events/              # Event system
│   └── workflows/           # Integration workflows
├── metrics-recording/        # Metric collection and emission
├── performance/             # Performance benchmarks (deferred)
├── integration/             # Cross-component integration tests
└── e2e/                     # Playwright browser tests
```

## Test Harness

The project provides a unified test harness under `tests/harness/` for consistent runtime testing.

### Available Classes

| Class | Purpose | Use Case |
|-------|---------|----------|
| `BehaviorTestHarness` | Lightweight harness with real memory/stack/eventbus | Unit testing behaviors |
| `MockBlock` | Configurable IRuntimeBlock stub | Testing behaviors in isolation |
| `RuntimeTestBuilder` | Builder for full ScriptRuntime | Integration testing strategies/blocks |

### Usage: Unit Testing Behaviors

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '../../../../tests/harness';
import { TimerBehavior } from '../TimerBehavior';

describe('TimerBehavior', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should start timer on mount', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    
    harness.push(block);
    harness.mount();
    
    expect(block.getBehavior(TimerBehavior)!.isRunning()).toBe(true);
  });

  it('should track elapsed time', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    
    harness.push(block);
    harness.mount();
    harness.advanceClock(5000);
    
    expect(block.getBehavior(TimerBehavior)!.getElapsedMs()).toBeGreaterThanOrEqual(5000);
  });

  it('should emit timer:started event', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    
    harness.push(block);
    harness.mount();
    
    expect(harness.wasEventEmitted('timer:started')).toBe(true);
  });
});
```

### Usage: Integration Testing Strategies

```typescript
import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '../harness';
import { TimerStrategy } from '@/runtime/strategies/TimerStrategy';

describe('TimerStrategy', () => {
  it('should compile timer block from script', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 Run')
      .withStrategy(new TimerStrategy())
      .build();

    const block = harness.pushStatement(0);
    
    expect(block.blockType).toBe('Timer');
    expect(harness.stackDepth).toBe(1);
  });
});
```

### BehaviorTestHarness API

```typescript
// Configuration
harness.withClock(date: Date)           // Set mock clock time
harness.withMemory(type, ownerId, value, visibility?)  // Pre-allocate memory

// Stack Operations
harness.push(block)                     // Push block (does not mount)
harness.mount(options?)                 // Mount current block
harness.next(options?)                  // Call next() on current block
harness.unmount(options?)               // Unmount and dispose current block

// Time Operations
harness.advanceClock(ms)                // Advance mock clock
harness.setClock(date)                  // Set clock to specific time

// Event Operations
harness.simulateEvent(name, data?)      // Dispatch event
harness.simulateNext()                  // Simulate 'next' event
harness.simulateTick()                  // Simulate 'tick' event

// Memory Operations
harness.getMemory<T>(type, ownerId)     // Get memory value
harness.allocateMemory(type, ownerId, value, visibility?)

// Assertions
harness.currentBlock                    // Current block on stack
harness.stackDepth                      // Number of blocks on stack
harness.wasEventEmitted(name)           // Check if event was emitted
harness.findEvents(name)                // Get events by name
harness.findActions(ActionType)         // Get actions by type
harness.capturedActions                 // All captured actions
harness.capturedEvents                  // All captured events
harness.handleSpy                       // vi.fn() spy for assertions
```

### MockBlock API

```typescript
// Constructor options
new MockBlock('block-id', behaviors, {
  blockType?: string,           // Default: 'MockBlock'
  label?: string,               // Display label
  sourceIds?: number[],         // Source statement IDs
  fragments?: ICodeFragment[][], // Pre-configured fragments
  state?: Record<string, any>   // Custom mutable state
});

// Mutable state for test conditions
block.state.isComplete = true;  // Accessible in behavior conditions
block.state.customValue = 42;

// Behavior access
block.getBehavior(TimerBehavior)  // Get specific behavior instance
```

## Naming Patterns

### Language Compilation Tests

- `parser-integration.test.ts` - Parser integration with runtime
- `statement-ids.test.ts` - Statement ID validation
- `wod-script-parsing.test.ts` - WodScript parsing logic
- `parser-error-recovery.test.ts` - Error recovery behavior

### JIT Compilation Tests

- `strategy-precedence.test.ts` - Strategy precedence order validation
- `strategy-matching.test.ts` - Strategy matching logic
- `block-compilation.test.ts` - Block creation from statements
- `fragment-compilation.test.ts` - Fragment → MetricValue transformation

### Runtime Execution Tests

**Stack:**
- `stack-api.test.ts` - RuntimeStack API contract
- `stack-disposal.test.ts` - Block disposal and cleanup
- `stack-edge-cases.test.ts` - Edge cases and boundary conditions

**Blocks:**
- `{block-name}-lifecycle.test.ts` - Block lifecycle (mount/next/dispose)
- Example: `timer-block-lifecycle.test.ts`, `effort-block-lifecycle.test.ts`

**Behaviors:**
- `{behavior-name}.test.ts` - Behavior implementation
- Example: `completion-behavior.test.ts`, `timer-behavior.test.ts`

**Memory:**
- `block-context.test.ts` - BlockContext lifecycle and memory management
- `memory-reference.test.ts` - Memory reference interface
- `anchor-subscriptions.test.ts` - Anchor-based subscription model

**Events:**
- `{event-name}.test.ts` - Event class and handler
- Example: `next-event.test.ts`, `next-event-handler.test.ts`

**Workflows:**
- `{workflow-name}-workflow.test.ts` - Integration workflow
- Example: `next-button-workflow.test.ts`, `runtime-hooks.test.ts`

**Top-level:**
- `orchestration.test.ts` - ScriptRuntime orchestration
- `actions.test.ts` - Runtime actions (Push, Pop, EmitMetric)

### Metrics Recording Tests

- `metric-collector.test.ts` - MetricCollector implementation
- `metric-inheritance.test.ts` - Metric inheritance across blocks
- `metric-emission.test.ts` - Metric emission actions

### Performance Tests

- `{component-name}-performance.test.ts` - Performance benchmarks
- Example: `stack-performance.test.ts`

## Placeholder Tests

Tests marked as TODO should include:

```typescript
/**
 * {Test Category} Tests
 * 
 * TODO: Implement {description of what needs testing}
 * - Bullet point of specific test case
 * - Another test case
 */

import { describe, it, expect } from 'bun:test';

describe('{Test Category}', () => {
  it.todo('should {description of test case}');
  it.todo('should {description of another test case}');
});
```

## Anti-Patterns to Avoid

❌ **Don't use suffix indicators:**
- `~parser.contract.test.ts~` → Use `parser-integration.test.ts`
- `~block.unit.test.ts~` → Use `block-compilation.test.ts`

❌ **Don't use implementation file names:**
- `~timer.parser.test.ts~` → Use `parser-integration.test.ts`
- `~JitCompiler.test.ts~` → Use `strategy-precedence.test.ts`

❌ **Don't mix concerns:**
- Tests should validate ONE concern (language, JIT, runtime, or metrics)
- Integration tests belong in `workflows/` subfolder

## Test IDs

Legacy tests may include test IDs (e.g., `TSP-001`, `TSC-001`, `TBC-001`). These can be preserved for traceability but are not required for new tests.

## Running Tests

### Unit Tests (src/)
```bash
# Run all unit tests (src/**/*.test.ts)
bun run test

# Run specific test file
bun test src/runtime/behaviors/__tests__/TimerBehavior.test.ts --preload ./tests/unit-setup.ts

# Run tests in watch mode
bun run test --watch

# Run tests with coverage
bun run test:coverage
```

### Component/Integration Tests (tests/)
```bash
# Run all tests in tests/ directory
bun run test:components

# Run harness self-tests
bun test tests/harness --preload ./tests/unit-setup.ts

# Run specific test category
bun test tests/jit-compilation --preload ./tests/setup.ts

# Run all unit + component tests
bun run test:all
```

### Storybook Tests
```bash
# Run Storybook component tests (requires Playwright)
bun run test:storybook
```

### End-to-End Tests
```bash
# Run Playwright e2e tests
bun run test:e2e

# Run with Playwright UI
bun x playwright test --ui
```

### Performance Tests
```bash
# Run performance benchmarks
bun run test:perf
```
