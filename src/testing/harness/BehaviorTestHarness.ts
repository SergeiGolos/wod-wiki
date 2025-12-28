import { vi } from 'bun:test';
import { IRuntimeBlock, BlockLifecycleOptions } from '@/runtime/contracts';
import { IRuntimeAction } from '@/runtime/contracts';
import { IScriptRuntime } from '@/runtime/contracts';
import { IEvent } from '@/runtime/contracts/events';
import { createMockClock } from '@/runtime/RuntimeClock';
import { RuntimeMemory } from '@/runtime/RuntimeMemory';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { TypedMemoryReference } from '@/runtime/contracts';
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
      jit: {} as unknown as IScriptRuntime['jit'], // Not used in behavior tests
      script: {} as unknown as IScriptRuntime['script'], // Not used in behavior tests
      tracker: {} as unknown as IScriptRuntime['tracker'], // Not used in behavior tests
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
