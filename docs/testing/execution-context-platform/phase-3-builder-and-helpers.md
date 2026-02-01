# Phase 3: Builder & Helper APIs

**Duration**: 30 minutes  
**Priority**: High  
**Dependencies**: Phase 1 (MockJitCompiler), Phase 2 (ExecutionContextTestHarness)

## Overview

Create a fluent builder API (`ExecutionContextTestBuilder`) and convenience factory methods to simplify test harness creation. This phase focuses on developer experience, reducing boilerplate in test files.

## Goals

- ✅ Fluent builder API for harness configuration
- ✅ Factory methods for common scenarios (timer tests, behavior tests, compilation tests)
- ✅ Convenience methods for block configuration and event simulation
- ✅ Zero-boilerplate test setup for 90% of use cases
- ✅ Type-safe configuration with IntelliSense support

## File Structure

```
tests/harness/
├── ExecutionContextTestBuilder.ts           # NEW - Fluent builder
├── factory.ts                                # NEW - Factory methods
├── index.ts                                  # UPDATED - Export builder and factories
└── __tests__/
    ├── ExecutionContextTestBuilder.test.ts  # NEW - Builder tests
    └── factory.test.ts                       # NEW - Factory tests
```

## Technical Specification

### 1. ExecutionContextTestBuilder

```typescript
/**
 * Fluent builder for creating ExecutionContextTestHarness with minimal boilerplate
 */
export class ExecutionContextTestBuilder {
  private _config: HarnessConfig = {};
  private _jitMatchers: Array<{
    predicate: BlockMatcher;
    block: IRuntimeBlock | (() => IRuntimeBlock);
  }> = [];
  private _initialBlocks: IRuntimeBlock[] = [];
  private _eventHandlers: Array<{
    eventName: string;
    handler: EventHandler;
    ownerId: string;
  }> = [];

  /**
   * Set initial clock time
   */
  withClock(time: Date): this {
    this._config.clockTime = time;
    return this;
  }

  /**
   * Set max ExecutionContext iterations
   */
  withMaxDepth(depth: number): this {
    this._config.maxDepth = depth;
    return this;
  }

  /**
   * Register JIT compilation strategies
   */
  withStrategies(...strategies: IRuntimeBlockStrategy[]): this {
    this._config.strategies = [
      ...(this._config.strategies ?? []),
      ...strategies
    ];
    return this;
  }

  /**
   * Configure MockJitCompiler to return block when predicate matches
   */
  whenCompiling(
    predicate: BlockMatcher,
    block: IRuntimeBlock | (() => IRuntimeBlock)
  ): this {
    this._jitMatchers.push({ predicate, block });
    return this;
  }

  /**
   * Configure MockJitCompiler to return block when text contains string
   */
  whenTextContains(
    substring: string,
    block: IRuntimeBlock | (() => IRuntimeBlock)
  ): this {
    return this.whenCompiling(
      (statements, runtime) => 
        statements.some(s => s.source?.includes(substring)),
      block
    );
  }

  /**
   * Configure MockJitCompiler to return block for specific statement indices
   */
  whenStatements(
    indices: number[],
    block: IRuntimeBlock | (() => IRuntimeBlock)
  ): this {
    return this.whenCompiling(
      (statements) => 
        indices.every(i => statements.includes(i)),
      block
    );
  }

  /**
   * Push block(s) to stack before harness is built
   */
  withBlocks(...blocks: IRuntimeBlock[]): this {
    this._initialBlocks.push(...blocks);
    return this;
  }

  /**
   * Register event handler
   */
  onEvent(
    eventName: string,
    handler: EventHandler,
    ownerId = 'test-builder'
  ): this {
    this._eventHandlers.push({ eventName, handler, ownerId });
    return this;
  }

  /**
   * Build the harness with all configurations applied
   */
  build(): ExecutionContextTestHarness {
    const harness = new ExecutionContextTestHarness(this._config);

    // Configure MockJitCompiler matchers
    this._jitMatchers.forEach(({ predicate, block }) => {
      harness.mockJit.whenMatches(predicate, block);
    });

    // Push initial blocks to stack
    this._initialBlocks.forEach(block => {
      harness.stack.push(block);
    });

    // Register event handlers
    this._eventHandlers.forEach(({ eventName, handler, ownerId }) => {
      harness.eventBus.register(eventName, handler, ownerId);
    });

    return harness;
  }
}
```

### 2. Factory Methods

```typescript
/**
 * Create harness for testing timer-based behaviors
 */
export function createTimerTestHarness(config?: {
  clockTime?: Date;
  timerDuration?: number;
}): ExecutionContextTestHarness {
  return new ExecutionContextTestBuilder()
    .withClock(config?.clockTime ?? new Date('2024-01-01T12:00:00Z'))
    .withStrategies(new TimerStrategy())
    .build();
}

/**
 * Create harness for testing behavior isolation
 */
export function createBehaviorTestHarness(
  behavior: IRuntimeBehavior,
  config?: {
    clockTime?: Date;
    maxDepth?: number;
  }
): ExecutionContextTestHarness {
  const block = new MockBlock('test-block', [behavior]);
  
  return new ExecutionContextTestBuilder()
    .withClock(config?.clockTime ?? new Date())
    .withMaxDepth(config?.maxDepth ?? 20)
    .withBlocks(block)
    .build();
}

/**
 * Create harness for testing JIT compilation
 */
export function createCompilationTestHarness(
  strategies: IRuntimeBlockStrategy[],
  config?: {
    clockTime?: Date;
  }
): ExecutionContextTestHarness {
  return new ExecutionContextTestBuilder()
    .withClock(config?.clockTime ?? new Date())
    .withStrategies(...strategies)
    .build();
}

/**
 * Create harness pre-configured with common test blocks
 */
export function createBasicTestHarness(config?: {
  clockTime?: Date;
  maxDepth?: number;
  withTimerBlock?: boolean;
  withLoopBlock?: boolean;
}): ExecutionContextTestHarness {
  const builder = new ExecutionContextTestBuilder()
    .withClock(config?.clockTime ?? new Date())
    .withMaxDepth(config?.maxDepth ?? 20);

  if (config?.withTimerBlock) {
    const timer = new MockBlock('timer', [/* timer behaviors */]);
    builder.withBlocks(timer);
  }

  if (config?.withLoopBlock) {
    const loop = new MockBlock('loop', [/* loop behaviors */]);
    builder.withBlocks(loop);
  }

  return builder.build();
}

/**
 * Create harness with event handlers pre-configured
 */
export function createEventTestHarness(
  handlers: Record<string, EventHandler>,
  config?: {
    clockTime?: Date;
  }
): ExecutionContextTestHarness {
  const builder = new ExecutionContextTestBuilder()
    .withClock(config?.clockTime ?? new Date());

  Object.entries(handlers).forEach(([eventName, handler]) => {
    builder.onEvent(eventName, handler);
  });

  return builder.build();
}
```

### 3. Convenience Extension Methods

```typescript
/**
 * Extend ExecutionContextTestHarness with convenience methods
 */
declare module './ExecutionContextTestHarness' {
  interface ExecutionContextTestHarness {
    /**
     * Push block to stack and mount it in one call
     */
    pushAndMount(block: IRuntimeBlock): this;

    /**
     * Execute action and advance clock by duration
     */
    executeAndAdvance(action: IRuntimeAction, ms: number): this;

    /**
     * Dispatch event and return resulting actions
     */
    dispatchAndGetActions(event: IEvent): IRuntimeAction[];

    /**
     * Assert action was executed exactly N times
     */
    expectActionCount(type: string, count: number): void;

    /**
     * Assert action was executed at specific iteration
     */
    expectActionAtIteration(type: string, iteration: number): void;

    /**
     * Get last action execution of specific type
     */
    getLastAction(type: string): ActionExecution | undefined;

    /**
     * Advance to next turn (equivalent to separate do() call)
     */
    nextTurn(): this;
  }
}

// Implementation in ExecutionContextTestHarness.ts
export class ExecutionContextTestHarness {
  // ... existing implementation ...

  pushAndMount(block: IRuntimeBlock): this {
    this.stack.push(block);
    const mountAction = { 
      type: 'mount',
      do: (rt) => block.mount(rt) 
    };
    this.executeAction(mountAction);
    return this;
  }

  executeAndAdvance(action: IRuntimeAction, ms: number): this {
    this.executeAction(action);
    this.advanceClock(ms);
    return this;
  }

  dispatchAndGetActions(event: IEvent): IRuntimeAction[] {
    const beforeCount = this._actionExecutions.length;
    this.dispatchEvent(event);
    return this._actionExecutions.slice(beforeCount).map(e => e.action);
  }

  expectActionCount(type: string, count: number): void {
    const actual = this.getActionsByType(type).length;
    if (actual !== count) {
      throw new Error(
        `Expected ${count} executions of action '${type}' but found ${actual}`
      );
    }
  }

  expectActionAtIteration(type: string, iteration: number): void {
    const action = this._actionExecutions.find(
      e => e.action.type === type && e.iteration === iteration
    );
    if (!action) {
      throw new Error(
        `Expected action '${type}' at iteration ${iteration} but not found`
      );
    }
  }

  getLastAction(type: string): ActionExecution | undefined {
    const actions = this.getActionsByType(type);
    return actions[actions.length - 1];
  }

  nextTurn(): this {
    // Executing a dummy action starts a new turn
    this.executeAction({ 
      type: '__turn_boundary', 
      do: () => {} 
    });
    return this;
  }
}
```

### 4. Updated Index Exports

```typescript
// tests/harness/index.ts

// Phase 1
export { MockJitCompiler } from './MockJitCompiler';
export type { CompileCall, BlockMatcher } from './MockJitCompiler';

// Phase 2
export { ExecutionContextTestHarness } from './ExecutionContextTestHarness';
export type { 
  ActionExecution, 
  EventDispatch, 
  HarnessConfig 
} from './ExecutionContextTestHarness';

// Phase 3 - NEW
export { ExecutionContextTestBuilder } from './ExecutionContextTestBuilder';
export {
  createTimerTestHarness,
  createBehaviorTestHarness,
  createCompilationTestHarness,
  createBasicTestHarness,
  createEventTestHarness
} from './factory';

// Existing exports
export { MockBlock } from './MockBlock';
export { BehaviorTestHarness } from './BehaviorTestHarness';
export { RuntimeTestBuilder } from './RuntimeTestBuilder';
```

## Implementation Steps

### Step 1: Create ExecutionContextTestBuilder.ts (15 min)

1. Create file: `tests/harness/ExecutionContextTestBuilder.ts`
2. Import dependencies
3. Define builder class with private state
4. Implement fluent configuration methods:
   - `withClock()`, `withMaxDepth()`, `withStrategies()`
   - `whenCompiling()`, `whenTextContains()`, `whenStatements()`
   - `withBlocks()`, `onEvent()`
5. Implement `build()` method that applies all configurations
6. Add JSDoc comments with usage examples

### Step 2: Create Factory Methods (10 min)

1. Create file: `tests/harness/factory.ts`
2. Implement factory functions:
   - `createTimerTestHarness()`
   - `createBehaviorTestHarness()`
   - `createCompilationTestHarness()`
   - `createBasicTestHarness()`
   - `createEventTestHarness()`
3. Add JSDoc comments for each factory
4. Include usage examples

### Step 3: Add Convenience Methods (5 min)

1. Update `tests/harness/ExecutionContextTestHarness.ts`
2. Add convenience methods:
   - `pushAndMount()`, `executeAndAdvance()`
   - `dispatchAndGetActions()`, `expectActionCount()`
   - `expectActionAtIteration()`, `getLastAction()`
   - `nextTurn()`
3. Add module declaration for TypeScript typing

### Step 4: Update Index Exports (5 min)

1. Update `tests/harness/index.ts`
2. Export builder and factory functions
3. Verify no circular dependencies
4. Test imports in sample test file

### Step 5: Create Tests (15 min)

1. Create `tests/harness/__tests__/ExecutionContextTestBuilder.test.ts`
2. Test builder fluent API
3. Create `tests/harness/__tests__/factory.test.ts`
4. Test all factory methods

## Test Structure

### Builder Tests

```typescript
import { describe, it, expect } from 'bun:test';
import { ExecutionContextTestBuilder } from '@/testing/harness';
import { MockBlock } from '@/testing/harness';

describe('ExecutionContextTestBuilder', () => {
  describe('Clock Configuration', () => {
    it('should set clock time', () => {
      const time = new Date('2025-06-15T10:30:00Z');
      
      const harness = new ExecutionContextTestBuilder()
        .withClock(time)
        .build();

      expect(harness.clock.now.getTime()).toBe(time.getTime());
    });
  });

  describe('Max Depth Configuration', () => {
    it('should set max iterations', () => {
      const harness = new ExecutionContextTestBuilder()
        .withMaxDepth(5)
        .build();

      const recursiveAction = {
        type: 'recursive',
        do: (rt) => rt.do(recursiveAction)
      };

      expect(() => {
        harness.executeAction(recursiveAction);
      }).toThrow(/Max iterations/);
    });
  });

  describe('JIT Matcher Configuration', () => {
    it('should configure whenTextContains matcher', () => {
      const timerBlock = new MockBlock('timer', []);
      
      const harness = new ExecutionContextTestBuilder()
        .whenTextContains('10:00', timerBlock)
        .build();

      harness.mockJit.compile(
        [{ source: '10:00 Run', index: 0 }],
        harness.runtime
      );

      expect(harness.mockJit.lastCompileCall?.result).toBe(timerBlock);
    });

    it('should configure custom predicate matcher', () => {
      const block = new MockBlock('custom', []);
      
      const harness = new ExecutionContextTestBuilder()
        .whenCompiling(
          (statements) => statements.length === 2,
          block
        )
        .build();

      harness.mockJit.compile([1, 2], harness.runtime);

      expect(harness.mockJit.lastCompileCall?.result).toBe(block);
    });

    it('should support factory functions for blocks', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return new MockBlock(`block-${callCount}`, []);
      };

      const harness = new ExecutionContextTestBuilder()
        .whenTextContains('test', factory)
        .build();

      const result1 = harness.mockJit.compile(
        [{ source: 'test 1', index: 0 }],
        harness.runtime
      );
      const result2 = harness.mockJit.compile(
        [{ source: 'test 2', index: 1 }],
        harness.runtime
      );

      expect(result1.id).toBe('block-1');
      expect(result2.id).toBe('block-2');
    });
  });

  describe('Initial Blocks Configuration', () => {
    it('should push blocks to stack', () => {
      const block1 = new MockBlock('block-1', []);
      const block2 = new MockBlock('block-2', []);

      const harness = new ExecutionContextTestBuilder()
        .withBlocks(block1, block2)
        .build();

      expect(harness.stack.depth).toBe(2);
      expect(harness.stack.current()).toBe(block2);
    });
  });

  describe('Event Handler Configuration', () => {
    it('should register event handlers', () => {
      const handler = {
        id: 'test-handler',
        name: 'Test',
        handler: () => [{ type: 'action', do: () => {} }]
      };

      const harness = new ExecutionContextTestBuilder()
        .onEvent('test:event', handler)
        .build();

      harness.dispatchEvent({ name: 'test:event', timestamp: new Date() });

      expect(harness.wasActionExecuted('action')).toBe(true);
    });
  });

  describe('Fluent Chaining', () => {
    it('should support chaining all configuration methods', () => {
      const block = new MockBlock('test', []);
      
      const harness = new ExecutionContextTestBuilder()
        .withClock(new Date())
        .withMaxDepth(10)
        .whenTextContains('timer', block)
        .withBlocks(block)
        .onEvent('test', { id: 'h', name: 'H', handler: () => [] })
        .build();

      expect(harness).toBeDefined();
      expect(harness.runtime).toBeDefined();
    });
  });
});
```

### Factory Tests

```typescript
import { describe, it, expect } from 'bun:test';
import {
  createTimerTestHarness,
  createBehaviorTestHarness,
  createCompilationTestHarness,
  createBasicTestHarness,
  createEventTestHarness
} from '@/testing/harness';
import { MockBlock } from '@/testing/harness';
import { TimerBehavior } from '@/runtime/behaviors';

describe('Factory Functions', () => {
  describe('createTimerTestHarness', () => {
    it('should create harness with timer strategy', () => {
      const harness = createTimerTestHarness();

      expect(harness.runtime).toBeDefined();
      expect(harness.clock.now).toBeInstanceOf(Date);
    });

    it('should respect custom clock time', () => {
      const time = new Date('2030-01-01T00:00:00Z');
      
      const harness = createTimerTestHarness({ clockTime: time });

      expect(harness.clock.now.getTime()).toBe(time.getTime());
    });
  });

  describe('createBehaviorTestHarness', () => {
    it('should create harness with behavior pre-loaded', () => {
      const behavior = new TimerBehavior('up');
      
      const harness = createBehaviorTestHarness(behavior);

      expect(harness.stack.depth).toBe(1);
      const block = harness.stack.current();
      expect(block.getBehaviors()).toContain(behavior);
    });
  });

  describe('createCompilationTestHarness', () => {
    it('should create harness with strategies', () => {
      const strategy = new TimerStrategy();
      
      const harness = createCompilationTestHarness([strategy]);

      expect(harness.mockJit).toBeDefined();
    });
  });

  describe('createBasicTestHarness', () => {
    it('should create minimal harness', () => {
      const harness = createBasicTestHarness();

      expect(harness.runtime).toBeDefined();
      expect(harness.stack.depth).toBe(0);
    });

    it('should add timer block when requested', () => {
      const harness = createBasicTestHarness({ withTimerBlock: true });

      expect(harness.stack.depth).toBe(1);
    });

    it('should add multiple blocks when requested', () => {
      const harness = createBasicTestHarness({
        withTimerBlock: true,
        withLoopBlock: true
      });

      expect(harness.stack.depth).toBe(2);
    });
  });

  describe('createEventTestHarness', () => {
    it('should register event handlers', () => {
      const handlers = {
        'event:a': {
          id: 'a',
          name: 'A',
          handler: () => [{ type: 'action-a', do: () => {} }]
        },
        'event:b': {
          id: 'b',
          name: 'B',
          handler: () => [{ type: 'action-b', do: () => {} }]
        }
      };

      const harness = createEventTestHarness(handlers);

      harness.dispatchEvent({ name: 'event:a', timestamp: new Date() });
      harness.dispatchEvent({ name: 'event:b', timestamp: new Date() });

      expect(harness.wasActionExecuted('action-a')).toBe(true);
      expect(harness.wasActionExecuted('action-b')).toBe(true);
    });
  });
});
```

### Convenience Method Tests

```typescript
describe('ExecutionContextTestHarness Convenience Methods', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestBuilder().build();
  });

  describe('pushAndMount', () => {
    it('should push block and mount in one call', () => {
      const block = new MockBlock('test', []);
      
      harness.pushAndMount(block);

      expect(harness.stack.current()).toBe(block);
      expect(harness.wasActionExecuted('mount')).toBe(true);
    });
  });

  describe('executeAndAdvance', () => {
    it('should execute action and advance clock', () => {
      const startTime = harness.clock.now.getTime();
      
      harness.executeAndAdvance(
        { type: 'test', do: () => {} },
        5000
      );

      expect(harness.wasActionExecuted('test')).toBe(true);
      expect(harness.clock.now.getTime()).toBe(startTime + 5000);
    });
  });

  describe('dispatchAndGetActions', () => {
    it('should return actions resulting from event', () => {
      harness.eventBus.register(
        'test',
        {
          id: 'h',
          name: 'H',
          handler: () => [
            { type: 'action-1', do: () => {} },
            { type: 'action-2', do: () => {} }
          ]
        },
        'test-owner'
      );

      const actions = harness.dispatchAndGetActions({
        name: 'test',
        timestamp: new Date()
      });

      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe('action-1');
      expect(actions[1].type).toBe('action-2');
    });
  });

  describe('expectActionCount', () => {
    it('should pass when count matches', () => {
      harness.executeAction({ type: 'test', do: () => {} });
      harness.executeAction({ type: 'test', do: () => {} });

      expect(() => {
        harness.expectActionCount('test', 2);
      }).not.toThrow();
    });

    it('should throw when count does not match', () => {
      harness.executeAction({ type: 'test', do: () => {} });

      expect(() => {
        harness.expectActionCount('test', 2);
      }).toThrow(/Expected 2.*but found 1/);
    });
  });

  describe('expectActionAtIteration', () => {
    it('should pass when action executed at iteration', () => {
      harness.executeAction({
        type: 'first',
        do: (rt) => {
          rt.do({ type: 'second', do: () => {} });
        }
      });

      expect(() => {
        harness.expectActionAtIteration('first', 1);
        harness.expectActionAtIteration('second', 2);
      }).not.toThrow();
    });

    it('should throw when action not at iteration', () => {
      harness.executeAction({ type: 'test', do: () => {} });

      expect(() => {
        harness.expectActionAtIteration('test', 2);
      }).toThrow(/Expected action.*at iteration 2/);
    });
  });

  describe('getLastAction', () => {
    it('should return most recent action of type', () => {
      harness.executeAction({ type: 'test', do: () => {} });
      harness.advanceClock(1000);
      harness.executeAction({ type: 'test', do: () => {} });

      const last = harness.getLastAction('test');

      expect(last).toBeDefined();
      expect(last!.iteration).toBe(1);
      expect(last!.turnId).toBe(2);
    });

    it('should return undefined when action not executed', () => {
      const last = harness.getLastAction('not-executed');

      expect(last).toBeUndefined();
    });
  });

  describe('nextTurn', () => {
    it('should increment turn ID', () => {
      harness.executeAction({ type: 'test', do: () => {} });
      
      harness.nextTurn();
      
      harness.executeAction({ type: 'test', do: () => {} });

      const actions = harness.actionExecutions;
      expect(actions[0].turnId).toBe(1);
      expect(actions[1].turnId).toBe(2);
      expect(actions[2].turnId).toBe(3);
    });
  });
});
```

## Acceptance Criteria

- ✅ ExecutionContextTestBuilder class created with fluent API
- ✅ All configuration methods implemented (clock, depth, strategies, etc.)
- ✅ JIT matcher configuration methods work (`whenCompiling`, `whenTextContains`)
- ✅ `build()` method applies all configurations correctly
- ✅ 5 factory methods created for common scenarios
- ✅ Convenience methods added to ExecutionContextTestHarness
- ✅ All exports added to index.ts
- ✅ Builder tests pass (15+ test cases)
- ✅ Factory tests pass (10+ test cases)
- ✅ Convenience method tests pass (10+ test cases)
- ✅ No TypeScript errors
- ✅ IntelliSense works for all fluent methods
- ✅ Zero-boilerplate possible for common test scenarios

## Example Usage (Before & After)

### Before (Raw Harness)

```typescript
import { ExecutionContextTestHarness } from '@/testing/harness';
import { MockBlock } from '@/testing/harness';
import { TimerStrategy } from '@/runtime/compiler/strategies';

const harness = new ExecutionContextTestHarness({
  clockTime: new Date('2024-01-01T12:00:00Z'),
  maxDepth: 20,
  strategies: [new TimerStrategy()]
});

const timerBlock = new MockBlock('timer', []);
harness.mockJit.whenMatches(
  (statements) => statements.some(s => s.source?.includes('10:00')),
  timerBlock
);

harness.stack.push(timerBlock);
harness.executeAction({ type: 'mount', do: (rt) => timerBlock.mount(rt) });
```

### After (Builder API)

```typescript
import { ExecutionContextTestBuilder } from '@/testing/harness';
import { MockBlock } from '@/testing/harness';

const timerBlock = new MockBlock('timer', []);

const harness = new ExecutionContextTestBuilder()
  .withClock(new Date('2024-01-01T12:00:00Z'))
  .whenTextContains('10:00', timerBlock)
  .build();

harness.pushAndMount(timerBlock);
```

### After (Factory Method)

```typescript
import { createTimerTestHarness } from '@/testing/harness';

const harness = createTimerTestHarness({
  clockTime: new Date('2024-01-01T12:00:00Z')
});
```

## Integration Notes

- **Uses**: `ExecutionContextTestHarness` from Phase 2
- **Uses**: `MockJitCompiler` from Phase 1
- **Pattern**: Builder pattern with fluent API
- **Exports**: All builder and factory functions via index.ts

## Performance Considerations

- Builder state accumulation: ~1KB per builder instance
- Factory method overhead: < 1ms
- No runtime performance impact (configuration only)

## Completion Checklist

- [ ] `tests/harness/ExecutionContextTestBuilder.ts` created
- [ ] All fluent configuration methods implemented
- [ ] JIT matcher configuration methods implemented
- [ ] `build()` method implemented
- [ ] `tests/harness/factory.ts` created
- [ ] 5 factory methods implemented
- [ ] Convenience methods added to ExecutionContextTestHarness
- [ ] Module declaration for TypeScript typing
- [ ] `tests/harness/index.ts` updated with exports
- [ ] `tests/harness/__tests__/ExecutionContextTestBuilder.test.ts` created
- [ ] 15+ builder test cases implemented
- [ ] `tests/harness/__tests__/factory.test.ts` created
- [ ] 10+ factory test cases implemented
- [ ] Convenience method tests created (10+ cases)
- [ ] All tests pass
- [ ] No TypeScript errors: `bun x tsc --noEmit`
- [ ] JSDoc comments added to all public APIs

## Related Files

- **Depends On**: [tests/harness/ExecutionContextTestHarness.ts](../../../tests/harness/ExecutionContextTestHarness.ts) (Phase 2)
- **Depends On**: [tests/harness/MockJitCompiler.ts](../../../tests/harness/MockJitCompiler.ts) (Phase 1)
- **Updates**: [tests/harness/index.ts](../../../tests/harness/index.ts)

---

**Status**: 📝 Ready for implementation  
**Previous Phase**: [Phase 2: ExecutionContextTestHarness](./phase-2-execution-context-test-harness.md)  
**Next Phase**: [Phase 4: Export & Documentation](./phase-4-export-and-documentation.md)

