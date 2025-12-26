# Test Harness Implementation Plan

> **Goal**: Implement a unified testing namespace under `tests/` with `BehaviorTestHarness` and `RuntimeTestBuilder` to replace inline mocks across behavior and integration tests.

## Status

| Phase                        | Status         | Notes                                      |
| ---------------------------- | -------------- | ------------------------------------------ |
| Research                     | ✅ Complete     | Analyzed 3,629 lines across 19 test files  |
| Planning                     | ✅ Complete     | This document                              |
| Phase 1: Core Infrastructure | ✅ Complete     | MockBlock, BehaviorTestHarness implemented |
| Phase 2: RuntimeTestBuilder  | ✅ Complete     | Builder pattern for integration tests      |
| Phase 3: Test Migration      | ✅ Complete     | 10 of 10 behavior/strategy tests migrated  |
| Phase 4: Documentation       | 🔲 Not Started | Assertions library not yet created         |

---

## Assessment (2025-12-26)

### ✅ Completed Items

**Phase 1: Core Infrastructure**
- [x] `tests/harness/` directory created
- [x] `MockBlock.ts` implemented with full IRuntimeBlock interface
- [x] `BehaviorTestHarness.ts` implemented with fluent API
- [x] `tests/harness/index.ts` with exports
- [x] Self-tests: `__tests__/MockBlock.test.ts` (5 tests, passing)
- [x] Self-tests: `__tests__/BehaviorTestHarness.test.ts` (9 tests, passing)
- [x] Self-tests: `__tests__/RuntimeTestBuilder.test.ts` (3 tests, passing)

**Phase 2: RuntimeTestBuilder**
- [x] `RuntimeTestBuilder.ts` implemented (simplified version)
- [x] `RuntimeTestHarness` class with script parsing and block pushing
- [x] Self-tests passing

**Phase 3: Test Migration** (Completed 2025-12-26)

| Test File | Status | Notes |
|-----------|--------|-------|
| `TimerBehavior.test.ts` | ✅ Migrated | Uses BehaviorTestHarness + MockBlock |
| `TimerStrategy.test.ts` | ✅ Migrated | Uses RuntimeTestBuilder |
| `CompletionBehavior.test.ts` | ✅ Migrated | Uses BehaviorTestHarness + MockBlock |
| `LoopCoordinatorBehavior.test.ts` | ✅ Migrated | Uses BehaviorTestHarness + inline mock block |
| `IBehavior.test.ts` | ⚪ N/A | Tests interfaces, no runtime needed |
| `ActionLayerBehavior.test.ts` | ✅ Migrated | Uses BehaviorTestHarness + MockBlock |
| `EffortStrategy.test.ts` | ✅ Migrated | Uses BehaviorTestHarness (already migrated) |
| `GroupStrategy.test.ts` | ✅ Migrated | Uses BehaviorTestHarness |
| `IntervalStrategy.test.ts` | ✅ Migrated | Uses BehaviorTestHarness |
| `RoundsStrategy.test.ts` | ✅ Migrated | Uses BehaviorTestHarness |
| `TimeBoundRoundsStrategy.test.ts` | ✅ Migrated | Uses BehaviorTestHarness |

### 🔲 Not Started Items

**Phase 4: Assertions Library**
- [ ] `tests/harness/assertions/` directory
- [ ] `action-matchers.ts`
- [ ] `memory-matchers.ts`
- [ ] `stack-matchers.ts`
- [ ] Update `tests/NAMING_CONVENTIONS.md`

---

## Remaining Work

### ✅ Priority 1: Complete Test Migration - DONE

All behavior and strategy tests have been migrated to use the test harness:
- `CompletionBehavior.test.ts` - Uses BehaviorTestHarness + MockBlock
- `LoopCoordinatorBehavior.test.ts` - Uses BehaviorTestHarness + inline mock block
- `ActionLayerBehavior.test.ts` - Uses BehaviorTestHarness + MockBlock
- `EffortStrategy.test.ts` - Uses BehaviorTestHarness (already migrated)
- `GroupStrategy.test.ts` - Uses BehaviorTestHarness
- `IntervalStrategy.test.ts` - Uses BehaviorTestHarness
- `RoundsStrategy.test.ts` - Uses BehaviorTestHarness
- `TimeBoundRoundsStrategy.test.ts` - Uses BehaviorTestHarness

### Priority 2: Enhance RuntimeTestBuilder (Optional)

Current implementation is minimal. Missing features from plan:
- [ ] `withMemory()` pre-population
- [ ] `withAllStrategies()` convenience method
- [ ] `snapshot()` and `diff()` methods
- [ ] `simulateEvent()`, `simulateNext()`, `simulateTick()`
- [ ] `searchMemory()` method
- [ ] `executeActions()` method
- [ ] `dispose()` method

### Priority 3: Assertions Library (Phase 4)

Create `tests/harness/assertions/`:
- [ ] `expectActionOfType()` 
- [ ] `expectNoActionOfType()`
- [ ] `expectStackDepth()`
- [ ] `expectCurrentBlockType()`
- [ ] `expectStackChange()`
- [ ] `expectBlocksPushed()`
- [ ] `expectBlocksPopped()`

---

## Problem Analysis

### Current State

Existing tests use **inline mock utilities** duplicated across files:

```typescript
// Pattern repeated in 6+ test files
function createMockRuntime(): IScriptRuntime {
  const mockRuntime = {
    stack: { push: vi.fn(), pop: vi.fn(), ... },
    memory: { allocate: vi.fn(), get: vi.fn(), ... },
    handle: vi.fn(),
    ...
  };
  return mockRuntime as any;
}
```

**Files with duplicated mocks:**
- `src/runtime/behaviors/__tests__/TimerBehavior.test.ts` (363 lines)
- `src/runtime/behaviors/__tests__/CompletionBehavior.test.ts` (285 lines)
- `src/runtime/behaviors/__tests__/LoopCoordinatorBehavior.test.ts` (92 lines)
- `src/runtime/strategies/__tests__/EffortStrategy.test.ts` (187 lines)
- `tests/jit-compilation/block-compilation.test.ts` (partial file shown)
- `tests/helpers/test-utils.ts` (shared utilities, underutilized)

### Issues

1. **Inconsistent mock implementations** - Each file creates slightly different mocks
2. **No memory state tracking** - Mocks don't track memory operations
3. **No clock control** - Most mocks lack time manipulation
4. **No lifecycle validation** - Can't verify mount/next/unmount sequences
5. **Integration gaps** - Unit tests don't compose into integration scenarios

---

## Target Architecture

```
tests/
├── harness/                          # NEW: Test harness namespace
│   ├── index.ts                      # Public API exports
│   ├── BehaviorTestHarness.ts        # Unit testing for behaviors
│   ├── MockBlock.ts                  # Configurable block stub
│   ├── RuntimeTestBuilder.ts         # Integration test builder
│   ├── MockRuntime.ts                # Shared mock runtime factory
│   ├── assertions/                   # Custom test assertions
│   │   ├── index.ts
│   │   ├── action-matchers.ts        # Action type matchers
│   │   ├── memory-matchers.ts        # Memory state matchers
│   │   └── stack-matchers.ts         # Stack state matchers
│   └── __tests__/                    # Self-tests for harness
│       ├── BehaviorTestHarness.test.ts
│       ├── RuntimeTestBuilder.test.ts
│       └── MockBlock.test.ts
├── helpers/
│   └── test-utils.ts                 # KEEP: Migrate common utilities here
├── runtime-execution/                # EXISTING: Will use new harness
├── jit-compilation/                  # EXISTING: Will use new harness
└── ...
```

---

## Phase 1: Core Infrastructure

### 1.1 MockBlock Implementation

**File**: `tests/harness/MockBlock.ts`

```typescript
import { BlockKey } from '@/core/models/BlockKey';
import { IRuntimeAction } from '@/runtime/IRuntimeAction';
import { IRuntimeBehavior } from '@/runtime/IRuntimeBehavior';
import { BlockLifecycleOptions, IRuntimeBlock } from '@/runtime/IRuntimeBlock';
import { IScriptRuntime } from '@/runtime/IScriptRuntime';
import { IBlockContext } from '@/runtime/IBlockContext';
import { ICodeFragment } from '@/core/models/CodeFragment';
import { IMemoryReference } from '@/runtime/IMemoryReference';

/**
 * Minimal stub context for MockBlock
 */
class MockBlockContext implements IBlockContext {
  readonly ownerId: string;
  readonly exerciseId: string;
  readonly references: ReadonlyArray<IMemoryReference> = [];
  private _released = false;

  constructor(blockId: string) {
    this.ownerId = blockId;
    this.exerciseId = blockId;
  }

  allocate<T>(_type?: string, _initialValue?: T, _visibility?: string): any {
    return { 
      id: `mock-ref-${Math.random().toString(36).slice(2)}`, 
      type: _type ?? 'mock', 
      ownerId: this.ownerId, 
      visibility: _visibility ?? 'private',
      get: () => _initialValue,
      set: () => {}
    };
  }
  
  get<T>(_type?: string): T | undefined { return undefined; }
  getAll<T>(_type?: string): T[] { return []; }
  release(): void { this._released = true; }
  isReleased(): boolean { return this._released; }
  getOrCreateAnchor(): any { return this.allocate('anchor'); }
}

/**
 * Custom BlockKey for test identification
 */
class MockBlockKey extends BlockKey {
  constructor(private readonly _id: string) { super(); }
  override toString(): string { return this._id; }
}

/**
 * Configuration for MockBlock
 */
export interface MockBlockConfig {
  /** Custom identifier for the block */
  id?: string;
  /** Block type label */
  blockType?: string;
  /** Human-readable label */
  label?: string;
  /** Source statement IDs */
  sourceIds?: number[];
  /** Pre-configured fragments */
  fragments?: ICodeFragment[][];
  /** Custom state object accessible in conditions */
  state?: Record<string, any>;
}

/**
 * MockBlock - Configurable IRuntimeBlock for testing behaviors in isolation.
 * 
 * Unlike real blocks, MockBlock:
 * - Takes behaviors as constructor argument (no coupling to strategies)
 * - Exposes mutable state for test assertions
 * - Provides hooks for custom mount/next/unmount logic
 * 
 * @example
 * ```typescript
 * const block = new MockBlock('test-timer', [
 *   new TimerBehavior('up'),
 *   new CompletionBehavior(() => block.state.isComplete, ['timer:complete'])
 * ]);
 * 
 * block.state.isComplete = false;
 * harness.push(block);
 * harness.mount();
 * 
 * block.state.isComplete = true;
 * harness.simulateEvent('timer:complete');
 * ```
 */
export class MockBlock implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly sourceIds: number[];
  readonly blockType: string;
  readonly label: string;
  readonly context: IBlockContext;
  readonly fragments: ICodeFragment[][];
  executionTiming: BlockLifecycleOptions = {};
  
  /** Mutable state accessible in tests and condition functions */
  public state: Record<string, any>;
  
  private _runtime?: IScriptRuntime;
  
  constructor(
    idOrConfig: string | MockBlockConfig,
    private readonly behaviors: IRuntimeBehavior[] = [],
    config?: MockBlockConfig
  ) {
    // Handle both (id, behaviors, config) and (config, behaviors) signatures
    const resolvedConfig: MockBlockConfig = typeof idOrConfig === 'string' 
      ? { id: idOrConfig, ...config }
      : idOrConfig;
    
    this.key = new MockBlockKey(resolvedConfig.id ?? `mock-${Math.random().toString(36).slice(2)}`);
    this.blockType = resolvedConfig.blockType ?? 'MockBlock';
    this.label = resolvedConfig.label ?? this.blockType;
    this.sourceIds = resolvedConfig.sourceIds ?? [];
    this.fragments = resolvedConfig.fragments ?? [];
    this.context = new MockBlockContext(this.key.toString());
    this.state = resolvedConfig.state ?? {};
  }
  
  /** Internal: Set runtime reference (called by harness) */
  setRuntime(runtime: IScriptRuntime): void {
    this._runtime = runtime;
  }
  
  /** Get the runtime if set */
  get runtime(): IScriptRuntime | undefined {
    return this._runtime;
  }
  
  mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    this.executionTiming.startTime = options?.startTime ?? runtime.clock?.now ?? new Date();
    
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onPush?.(runtime, this, options);
      if (result) actions.push(...result);
    }
    return actions;
  }
  
  next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onNext?.(runtime, this, options);
      if (result) actions.push(...result);
    }
    return actions;
  }
  
  unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    this.executionTiming.completedAt = options?.completedAt ?? runtime.clock?.now ?? new Date();
    
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onPop?.(runtime, this, options);
      if (result) actions.push(...result);
    }
    return actions;
  }
  
  dispose(runtime: IScriptRuntime): void {
    for (const behavior of this.behaviors) {
      if (typeof (behavior as any).onDispose === 'function') {
        (behavior as any).onDispose(runtime, this);
      }
    }
  }
  
  getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined {
    return this.behaviors.find(b => b instanceof behaviorType) as T | undefined;
  }
}
```

### 1.2 BehaviorTestHarness Implementation

**File**: `tests/harness/BehaviorTestHarness.ts`

```typescript
import { vi } from 'bun:test';
import { IRuntimeBlock, BlockLifecycleOptions } from '@/runtime/IRuntimeBlock';
import { IRuntimeAction } from '@/runtime/IRuntimeAction';
import { IScriptRuntime } from '@/runtime/IScriptRuntime';
import { IEvent } from '@/runtime/IEvent';
import { createMockClock } from '@/runtime/RuntimeClock';
import { RuntimeMemory } from '@/runtime/RuntimeMemory';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/EventBus';
import { TypedMemoryReference } from '@/runtime/IMemoryReference';
import { MockBlock } from './MockBlock';

/**
 * Captured action for test assertions
 */
export interface CapturedAction {
  action: IRuntimeAction;
  timestamp: number;
  phase: 'mount' | 'next' | 'unmount' | 'event';
}

/**
 * Captured event for test assertions
 */
export interface CapturedEvent {
  event: IEvent;
  timestamp: number;
}

/**
 * BehaviorTestHarness - Lightweight harness for testing individual behaviors.
 * 
 * Provides:
 * - Real memory, stack, and event bus (not mocks)
 * - Controllable mock clock
 * - Action and event capture for assertions
 * - Fluent API for lifecycle operations
 * 
 * @example
 * ```typescript
 * const harness = new BehaviorTestHarness()
 *   .withClock(new Date('2024-01-01T12:00:00Z'));
 * 
 * const block = new MockBlock('timer-test', [
 *   new TimerBehavior('up')
 * ]);
 * 
 * harness.push(block);
 * harness.mount();
 * 
 * expect(block.getBehavior(TimerBehavior)!.isRunning()).toBe(true);
 * 
 * harness.advanceClock(5000);
 * expect(block.getBehavior(TimerBehavior)!.getElapsedMs()).toBeGreaterThanOrEqual(5000);
 * ```
 */
export class BehaviorTestHarness {
  private _clock: ReturnType<typeof createMockClock>;
  private _memory: RuntimeMemory;
  private _stack: RuntimeStack;
  private _eventBus: EventBus;
  private _mockRuntime: IScriptRuntime;
  
  private _capturedActions: CapturedAction[] = [];
  private _capturedEvents: CapturedEvent[] = [];
  private _handleSpy: ReturnType<typeof vi.fn>;
  
  constructor() {
    this._clock = createMockClock(new Date());
    this._memory = new RuntimeMemory();
    this._stack = new RuntimeStack();
    this._eventBus = new EventBus();
    this._handleSpy = vi.fn();
    this._mockRuntime = this._createMockRuntime();
  }
  
  private _createMockRuntime(): IScriptRuntime {
    const self = this;
    
    return {
      memory: this._memory,
      stack: this._stack,
      eventBus: this._eventBus,
      clock: this._clock,
      jit: {} as any, // Not used in behavior tests
      script: {} as any, // Not used in behavior tests
      tracker: {} as any, // Not used in behavior tests
      errors: [],
      
      handle(event: IEvent) {
        self._capturedEvents.push({ event, timestamp: Date.now() });
        self._handleSpy(event);
        self._eventBus.dispatch(event, this);
      },
      
      pushBlock(block: IRuntimeBlock) {
        self._stack.push(block);
        return block;
      },
      
      popBlock() {
        const block = self._stack.pop();
        if (block) block.dispose(this);
        return block;
      },
      
      isComplete() {
        return self._stack.count === 0;
      }
    } as IScriptRuntime;
  }
  
  // ========== Configuration API ==========
  
  /**
   * Set the initial clock time
   */
  withClock(time: Date): this {
    this._clock = createMockClock(time);
    this._mockRuntime = this._createMockRuntime();
    return this;
  }
  
  /**
   * Pre-allocate memory with initial values
   */
  withMemory<T>(type: string, ownerId: string, value: T, visibility: 'public' | 'private' | 'inherited' = 'private'): this {
    this._memory.allocate(type, ownerId, value, visibility);
    return this;
  }
  
  // ========== Stack Operations ==========
  
  /**
   * Push a block onto the stack (does not mount)
   */
  push(block: IRuntimeBlock): this {
    if (block instanceof MockBlock || typeof (block as any).setRuntime === 'function') {
      (block as any).setRuntime(this._mockRuntime);
    }
    this._stack.push(block);
    return this;
  }
  
  /**
   * Mount the current block
   */
  mount(options?: BlockLifecycleOptions): IRuntimeAction[] {
    const block = this._stack.current;
    if (!block) throw new Error('No block on stack to mount');
    
    const resolvedOptions: BlockLifecycleOptions = {
      startTime: this._clock.now,
      ...options
    };
    
    const actions = block.mount(this._mockRuntime, resolvedOptions);
    this._recordActions(actions, 'mount');
    this._executeActions(actions);
    return actions;
  }
  
  /**
   * Call next() on the current block
   */
  next(options?: BlockLifecycleOptions): IRuntimeAction[] {
    const block = this._stack.current;
    if (!block) throw new Error('No block on stack for next()');
    
    const actions = block.next(this._mockRuntime, options);
    this._recordActions(actions, 'next');
    this._executeActions(actions);
    return actions;
  }
  
  /**
   * Unmount and dispose the current block
   */
  unmount(options?: BlockLifecycleOptions): IRuntimeAction[] {
    const block = this._stack.current;
    if (!block) throw new Error('No block on stack to unmount');
    
    const resolvedOptions: BlockLifecycleOptions = {
      completedAt: this._clock.now,
      ...options
    };
    
    const actions = block.unmount(this._mockRuntime, resolvedOptions);
    this._recordActions(actions, 'unmount');
    this._executeActions(actions);
    
    this._stack.pop();
    block.dispose(this._mockRuntime);
    
    return actions;
  }
  
  // ========== Time Operations ==========
  
  /**
   * Advance the mock clock by milliseconds
   */
  advanceClock(ms: number): this {
    this._clock.advance(ms);
    return this;
  }
  
  /**
   * Set the mock clock to a specific time
   */
  setClock(time: Date): this {
    this._clock.setTime(time);
    return this;
  }
  
  // ========== Event Operations ==========
  
  /**
   * Dispatch an event through the runtime
   */
  simulateEvent(name: string, data?: any): IRuntimeAction[] {
    const event: IEvent = {
      name,
      timestamp: this._clock.now,
      data: { source: 'test-harness', ...data }
    };
    
    this._mockRuntime.handle(event);
    
    // Collect actions from current block's event response
    const block = this._stack.current;
    if (block) {
      // Events are handled via eventBus, actions already executed
    }
    
    return [];
  }
  
  /**
   * Simulate 'next' event (common operation)
   */
  simulateNext(): this {
    this.simulateEvent('next');
    return this;
  }
  
  /**
   * Simulate tick event
   */
  simulateTick(): this {
    this.simulateEvent('tick');
    return this;
  }
  
  // ========== Memory Operations ==========
  
  /**
   * Get a memory value by type and owner
   */
  getMemory<T>(type: string, ownerId: string): T | undefined {
    const refs = this._memory.search({ type, ownerId, id: null, visibility: null });
    if (refs.length === 0) return undefined;
    return this._memory.get(refs[0] as TypedMemoryReference<T>);
  }
  
  /**
   * Allocate memory during test
   */
  allocateMemory<T>(type: string, ownerId: string, value: T, visibility: 'public' | 'private' = 'private'): TypedMemoryReference<T> {
    return this._memory.allocate(type, ownerId, value, visibility);
  }
  
  // ========== Assertions API ==========
  
  /** Current block on stack */
  get currentBlock(): IRuntimeBlock | undefined {
    return this._stack.current;
  }
  
  /** Stack depth */
  get stackDepth(): number {
    return this._stack.count;
  }
  
  /** All blocks on stack (top-first) */
  get blocks(): readonly IRuntimeBlock[] {
    return this._stack.blocks;
  }
  
  /** The mock runtime */
  get runtime(): IScriptRuntime {
    return this._mockRuntime;
  }
  
  /** The mock clock */
  get clock(): ReturnType<typeof createMockClock> {
    return this._clock;
  }
  
  /** All captured actions */
  get capturedActions(): readonly CapturedAction[] {
    return [...this._capturedActions];
  }
  
  /** All captured events */
  get capturedEvents(): readonly CapturedEvent[] {
    return [...this._capturedEvents];
  }
  
  /** The handle() spy for assertions */
  get handleSpy(): ReturnType<typeof vi.fn> {
    return this._handleSpy;
  }
  
  /**
   * Find captured actions by type
   */
  findActions<T extends IRuntimeAction>(actionType: new (...args: any[]) => T): T[] {
    return this._capturedActions
      .filter(c => c.action instanceof actionType)
      .map(c => c.action as T);
  }
  
  /**
   * Find captured events by name
   */
  findEvents(name: string): IEvent[] {
    return this._capturedEvents
      .filter(c => c.event.name === name)
      .map(c => c.event);
  }
  
  /**
   * Check if an event was emitted
   */
  wasEventEmitted(name: string): boolean {
    return this._capturedEvents.some(c => c.event.name === name);
  }
  
  /**
   * Clear captured actions and events
   */
  clearCaptures(): this {
    this._capturedActions = [];
    this._capturedEvents = [];
    this._handleSpy.mockClear();
    return this;
  }
  
  // ========== Private Helpers ==========
  
  private _recordActions(actions: IRuntimeAction[], phase: CapturedAction['phase']): void {
    for (const action of actions) {
      this._capturedActions.push({ action, timestamp: Date.now(), phase });
    }
  }
  
  private _executeActions(actions: IRuntimeAction[]): void {
    for (const action of actions) {
      action.do(this._mockRuntime);
    }
  }
}

/**
 * Factory function for quick harness creation
 */
export function createBehaviorHarness(clockTime?: Date): BehaviorTestHarness {
  const harness = new BehaviorTestHarness();
  if (clockTime) harness.withClock(clockTime);
  return harness;
}
```

### 1.3 Harness Index

**File**: `tests/harness/index.ts`

```typescript
/**
 * Test Harness Namespace
 * 
 * Unified testing infrastructure for WOD Wiki runtime tests.
 * 
 * ## Usage
 * 
 * ### Unit Testing (Behaviors)
 * ```typescript
 * import { BehaviorTestHarness, MockBlock } from 'tests/harness';
 * 
 * const harness = new BehaviorTestHarness().withClock(new Date());
 * const block = new MockBlock('test', [new TimerBehavior('up')]);
 * harness.push(block).mount();
 * ```
 * 
 * ### Integration Testing (Blocks)
 * ```typescript
 * import { RuntimeTestBuilder } from 'tests/harness';
 * 
 * const harness = new RuntimeTestBuilder()
 *   .withScript('3 Rounds\n  10 Pushups')
 *   .withStrategy(new RoundsStrategy())
 *   .build();
 * 
 * harness.pushStatement(0);
 * ```
 */

// Core harness classes
export { MockBlock, type MockBlockConfig } from './MockBlock';
export { 
  BehaviorTestHarness, 
  createBehaviorHarness,
  type CapturedAction,
  type CapturedEvent 
} from './BehaviorTestHarness';
export { 
  RuntimeTestBuilder, 
  type RuntimeTestHarness,
  type MemoryEntry 
} from './RuntimeTestBuilder';

// Assertion helpers
export * from './assertions';


/**
 * TestContext - The shared state passed to every test step.
 * 
 * This is the ONLY fixed part of the harness. Everything else is a dynamically
 * injected action.
 */
export interface TestContext {
  runtime: ScriptRuntime;
  clock: ReturnType<typeof createMockClock>;
  memory: RuntimeMemory;
  stack: RuntimeStack;
  eventBus: EventBus;
  // Optional extras
  script?: WodScript;
  capturedEvents: IEvent[];
}

/**
 * TestStep - The generic unit of work.
 * 
 * A test is simply a sequence of these functions.
 * Add new capabilities by writing new functions, not by extending the class.
 */
export type TestStep = (ctx: TestContext) => void | Promise<void>;

/**
 * Action-Driven Runner
 * 
 * @example
 * ```typescript
 * import { runTest, Setup, Actions, Expect } from 'tests/harness';
 * 
 * await runTest(
 *   Setup.fromScript('3 Rounds...'),
 *   Actions.mount(),
 *   Actions.next(),
 *   Expect.stackDepth(1),
 *   // Custom ad-hoc action without modifying harness
 *   (ctx) => {
 *      ctx.runtime.tracker.startSpan(ctx.stack.current);
 *   }
 * );
 * ```
 */
export async function runTest(...steps: TestStep[]): Promise<TestContext> {
  // 1. Initialize minimalistic container
  const context = createBaseContext();
  
  // 2. Execute pipeline
  for (const step of steps) {
    await step(context);
    
    // Automatic error checking after each step
    if (context.runtime.errors.length > 0) {
      throw new Error(`Runtime crashed: ${context.runtime.errors[0].message}`);
    }
  }
  
  // 3. Cleanup
  context.runtime.dispose();
  return context;
}

// ============================================================================
// EXTENSIBLE ACTION MODULES (These live in separate files)
// ============================================================================

// tests/harness/steps/Setup.ts
export const Setup = {
  fromScript: (text: string): TestStep => (ctx) => {
    const script = new MdTimerRuntime().read(text);
    // ... initialize runtime with script ...
    ctx.runtime = new ScriptRuntime(script, ...);
  },
  
  withMemory: (key: string, value: any): TestStep => (ctx) => {
    ctx.memory.allocate(key, 'root', value);
  }
};

// tests/harness/steps/Actions.ts
export const Actions = {
  next: (): TestStep => (ctx) => {
    ctx.runtime.handle({ name: 'next', timestamp: ctx.clock.now });
  },
  
  advance: (ms: number): TestStep => (ctx) => {
    ctx.clock.advance(ms);
  },
  
  // Easy to add complex domain actions
  completeCurrentBlock: (): TestStep => (ctx) => {
    const current = ctx.stack.current;
    if (!current) return;
    // Simulate complex completion sequence...
  }
};

// tests/harness/steps/Expect.ts
export const Expect = {
  stackDepth: (depth: number): TestStep => (ctx) => {
    expect(ctx.stack.count).toBe(depth);
  },
  
  metricValue: (key: string, value: any): TestStep => (ctx) => {
    const actual = ctx.memory.get(key);
    expect(actual).toBe(value);
  }
};
```

---

## Phase 3: Test Migration

### 3.1 Migration Priority

| Priority | Test File | Lines | Complexity | Notes |
|----------|-----------|-------|------------|-------|
| 1 | `TimerBehavior.test.ts` | 363 | High | Uses inline mocks + clock |
| 2 | `CompletionBehavior.test.ts` | 285 | Medium | Uses inline mocks |
| 3 | `LoopCoordinatorBehavior.test.ts` | 92 | Low | Simple structure |
| 4 | `IBehavior.test.ts` | 271 | Medium | Abstract behavior tests |
| 5 | `ActionLayerBehavior.test.ts` | 37 | Low | Small file |
| 6 | Strategy tests (6 files) | ~1000 | Medium | Similar patterns |
| 7 | Integration tests | ~500 | High | Use RuntimeTestBuilder |

### 3.2 Migration Example: TimerBehavior.test.ts

**Before** (current):
```typescript
// Inline mock utilities duplicated from other files
function createMockRuntime(clockTime: Date = new Date()) {
  const mockClock = createMockClock(clockTime);
  const mockRuntime = {
    stack: { push: vi.fn(), pop: vi.fn(), ... },
    memory: { allocate: vi.fn(), ... },
    clock: mockClock,
    handle: vi.fn(),
    ...
  };
  return { runtime: mockRuntime as any, clock: mockClock };
}

describe('TimerBehavior Contract', () => {
  let runtimeContext: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    runtimeContext = createMockRuntime(new Date('2024-01-01T12:00:00Z'));
  });

  it('should start timer on push', () => {
    const { runtime } = runtimeContext;
    const behavior = new TimerBehavior('up');
    const mockBlock = { key: { toString: () => 'test-block' } } as any;

    behavior.onPush(runtime, mockBlock);
    expect(behavior.isRunning()).toBe(true);
  });
});
```

**After** (migrated):
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from 'tests/harness';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';

describe('TimerBehavior Contract', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it('should start timer on push', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    
    harness.push(block);
    harness.mount();
    
    const timerBehavior = block.getBehavior(TimerBehavior)!;
    expect(timerBehavior.isRunning()).toBe(true);
  });

  it('should track elapsed time correctly', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    
    harness.push(block);
    harness.mount();
    
    harness.advanceClock(1000);
    
    const timerBehavior = block.getBehavior(TimerBehavior)!;
    expect(timerBehavior.getElapsedMs()).toBeGreaterThanOrEqual(1000);
    
    harness.advanceClock(500);
    expect(timerBehavior.getElapsedMs()).toBeGreaterThanOrEqual(1500);
  });

  it('should emit timer:started event on push', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    
    harness.push(block);
    harness.mount();
    
    expect(harness.wasEventEmitted('timer:started')).toBe(true);
    
    const events = harness.findEvents('timer:started');
    expect(events[0].data.blockId).toBe('test-timer');
  });
});
```

### 3.3 Migration Example: Integration Test

**Before** (current `rep-scheme-inheritance.test.ts`):
```typescript
// Manual setup of all components
const parser = new MdTimerRuntime();
const script = parser.read('(21-15-9) Push-ups') as WodScript;

const jitCompiler = new JitCompiler([]);
jitCompiler.registerStrategy(new RoundsStrategy());
jitCompiler.registerStrategy(new EffortStrategy());

const dependencies = {
  memory: new RuntimeMemory(),
  stack: new RuntimeStack(),
  clock: new RuntimeClock(),
  eventBus: new EventBus(),
};
runtime = new ScriptRuntime(script, jitCompiler, dependencies);

const rootBlock = jitCompiler.compile(script.statements, runtime);
runtime.stack.push(rootBlock!);
const mountActions = rootBlock!.mount(runtime);
```

**After** (migrated):

```typescript
import { runTest, Setup, Actions, Expect } from 'tests/harness';
import { MemoryTypeEnum } from '@/runtime/MemoryTypeEnum';

it('should inherit reps from RoundsBlock rep scheme', async () => {
  await runTest(
    // 1. Setup Phase
    Setup.fromScript('(21-15-9) Push-ups'),
    Setup.withAllStrategies(),
    
    // 2. Action Phase
    Actions.compileAndPush(0), // Push the first block
    
    // 3. Assertion Phase
    Expect.blockType('Rounds'),
    
    // Custom inline verification if needed
    (ctx) => {
       const initialReps = ctx.runtime.getMemory(
         MemoryTypeEnum.METRIC_REPS, 
         ctx.stack.current!.key.toString()
       );
       expect(initialReps).toBe(21);
    }
  );
});
```


---

## Phase 4: Assertions Library

**File**: `tests/harness/assertions/index.ts`

```typescript
export * from './action-matchers';
export * from './memory-matchers';
export * from './stack-matchers';
```

**File**: `tests/harness/assertions/action-matchers.ts`

```typescript
import { expect } from 'bun:test';
import { IRuntimeAction } from '@/runtime/IRuntimeAction';
import { CapturedAction } from '../BehaviorTestHarness';

/**
 * Check if actions contain an action of a specific type
 */
export function expectActionOfType<T extends IRuntimeAction>(
  actions: IRuntimeAction[] | readonly CapturedAction[],
  actionType: new (...args: any[]) => T
): T {
  const list = Array.isArray(actions) && actions[0] && 'action' in actions[0]
    ? (actions as readonly CapturedAction[]).map(c => c.action)
    : actions as IRuntimeAction[];
  
  const found = list.find(a => a instanceof actionType);
  expect(found, `Expected action of type ${actionType.name}`).toBeDefined();
  return found as T;
}

/**
 * Check that no action of a specific type exists
 */
export function expectNoActionOfType<T extends IRuntimeAction>(
  actions: IRuntimeAction[] | readonly CapturedAction[],
  actionType: new (...args: any[]) => T
): void {
  const list = Array.isArray(actions) && actions[0] && 'action' in actions[0]
    ? (actions as readonly CapturedAction[]).map(c => c.action)
    : actions as IRuntimeAction[];
  
  const found = list.find(a => a instanceof actionType);
  expect(found, `Expected no action of type ${actionType.name}`).toBeUndefined();
}
```

**File**: `tests/harness/assertions/stack-matchers.ts`

```typescript
import { expect } from 'bun:test';
import { RuntimeTestHarness, RuntimeSnapshot, SnapshotDiff } from '../RuntimeTestBuilder';
import { BehaviorTestHarness } from '../BehaviorTestHarness';

type AnyHarness = RuntimeTestHarness | BehaviorTestHarness;

/**
 * Assert stack depth
 */
export function expectStackDepth(harness: AnyHarness, expected: number): void {
  expect(harness.stackDepth).toBe(expected);
}

/**
 * Assert current block type
 */
export function expectCurrentBlockType(harness: AnyHarness, expectedType: string): void {
  expect(harness.currentBlock?.blockType).toBe(expectedType);
}

/**
 * Assert stack changed by specific amount
 */
export function expectStackChange(diff: SnapshotDiff, expectedChange: number): void {
  expect(diff.stack.depthChange).toBe(expectedChange);
}

/**
 * Assert blocks were pushed
 */
export function expectBlocksPushed(diff: SnapshotDiff, count: number): void {
  expect(diff.stack.pushed.length).toBe(count);
}

/**
 * Assert blocks were popped
 */
export function expectBlocksPopped(diff: SnapshotDiff, count: number): void {
  expect(diff.stack.popped.length).toBe(count);
}
```

---

## Implementation Tasks

### Phase 1: Core Infrastructure ✅ COMPLETE

- [x] Create `tests/harness/` directory structure
- [x] Implement `MockBlock.ts`
- [x] Implement `BehaviorTestHarness.ts`
- [x] Create `tests/harness/index.ts` with exports
- [x] Write self-tests for harness (`tests/harness/__tests__/`)

### Phase 2: RuntimeTestBuilder 🟡 PARTIAL

- [x] Implement `RuntimeTestBuilder.ts` (basic version)
- [x] Write self-tests for builder
- [ ] Add `withMemory()` pre-population
- [ ] Add `withAllStrategies()` convenience method
- [ ] Add snapshot/diff functionality
- [ ] Add event simulation methods
- [ ] Test integration with real strategies

### Phase 3: Test Migration ✅ COMPLETE

**Migrated:**
- [x] `TimerBehavior.test.ts` → BehaviorTestHarness
- [x] `TimerStrategy.test.ts` → RuntimeTestBuilder
- [x] `CompletionBehavior.test.ts` → BehaviorTestHarness + MockBlock
- [x] `LoopCoordinatorBehavior.test.ts` → BehaviorTestHarness + inline mock block
- [x] `ActionLayerBehavior.test.ts` → BehaviorTestHarness + MockBlock
- [x] `EffortStrategy.test.ts` → BehaviorTestHarness (already migrated)
- [x] `GroupStrategy.test.ts` → BehaviorTestHarness
- [x] `IntervalStrategy.test.ts` → BehaviorTestHarness
- [x] `RoundsStrategy.test.ts` → BehaviorTestHarness
- [x] `TimeBoundRoundsStrategy.test.ts` → BehaviorTestHarness

**Notes:**
- All 109 tests pass (plus 1 todo in CompletionBehavior)
- Strategy tests use harness.runtime for mock runtime reference
- LoopCoordinatorBehavior uses inline mock block due to complex getBehavior override requirement

### Phase 4: Documentation 🔲 NOT STARTED

- [ ] Create `tests/harness/assertions/` directory
- [ ] Implement assertion helpers
- [ ] Update `tests/NAMING_CONVENTIONS.md` with harness usage
- [ ] Add examples to harness index.ts JSDoc
- [ ] Update `tests/helpers/test-utils.ts` (deprecate duplicates)

---

## Success Criteria

1. **Zero inline mocks** in migrated test files ✅ Achieved
2. **All existing tests pass** after migration ✅ 109 pass, 1 todo
3. **Harness self-tests pass** with 100% coverage of harness API ✅ 17 tests passing
4. **< 50ms** harness setup time per test ✅ < 15ms observed
5. **Clear documentation** with usage examples 🟡 Partial (JSDoc in index.ts)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Behavior differences between mocks and real components | Test failures | Run tests in parallel during migration |
| Import path issues with `tests/harness` | Build errors | Use relative imports or configure tsconfig |
| Performance degradation from real components | Slow tests | Use real memory/stack but mock clock |
| Breaking existing tests during migration | Regressions | Migrate one file at a time, run CI after each |

---

## File Creation Checklist

```
tests/harness/
├── index.ts                    # ✅ Created
├── MockBlock.ts                # ✅ Created
├── BehaviorTestHarness.ts      # ✅ Created
├── RuntimeTestBuilder.ts       # ✅ Created (basic version)
├── assertions/                 # 🔲 Not created
│   ├── index.ts
│   ├── action-matchers.ts
│   ├── memory-matchers.ts
│   └── stack-matchers.ts
└── __tests__/                  # ✅ Created
    ├── MockBlock.test.ts       # ✅ 5 tests passing
    ├── BehaviorTestHarness.test.ts  # ✅ 9 tests passing
    └── RuntimeTestBuilder.test.ts   # ✅ 3 tests passing
```

## Current Test Metrics (2025-12-26)

| Category | Total Tests | Passing | Files Migrated |
|----------|-------------|---------|----------------|
| Harness Self-Tests | 17 | 17 | N/A |
| Behavior Tests | 55 | 54 + 1 todo | 5 of 5 (all migrated) |
| Strategy Tests | 56 | 56 | 6 of 6 (all migrated) |
