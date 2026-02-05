import { ScriptRuntime, ScriptRuntimeDependencies } from '@/runtime/ScriptRuntime';
import { MockJitCompiler } from './MockJitCompiler';
import { createMockClock } from '@/runtime/RuntimeClock';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events/EventBus';
import { WodScript } from '@/parser/WodScript';
import { IRuntimeAction } from '@/runtime/contracts/IRuntimeAction';
import { IEvent } from '@/runtime/contracts/events/IEvent';
import { IRuntimeBlockStrategy } from '@/runtime/contracts/IRuntimeBlockStrategy';
import { IRuntimeClock } from '@/runtime/contracts/IRuntimeClock';
import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime';
import { ICodeStatement, CodeMetadata, ICodeFragment } from '@/core/models/CodeStatement';

/**
 * Helper function to create a minimal mock statement for testing.
 */
function createMockStatement(config: { id: number; source?: string }): ICodeStatement {
  return {
    id: config.id,
    parent: undefined,
    children: [],
    fragments: [],
    isLeaf: true,
    meta: {
      source: config.source ?? `statement-${config.id}`,
      start: { line: config.id, column: 0 },
      end: { line: config.id, column: 0 }
    } as CodeMetadata,
    hints: undefined,
    findFragment<T extends ICodeFragment = ICodeFragment>(
      _type: string | number,
      _predicate?: (f: ICodeFragment) => boolean
    ): T | undefined {
      return undefined;
    },
    filterFragments<T extends ICodeFragment = ICodeFragment>(
      _type: string | number
    ): T[] {
      return [];
    },
    hasFragment(_type: string | number): boolean {
      return false;
    }
  };
}

/**
 * Record of a single action execution.
 */
export interface ActionExecution {
  /** The action that was executed */
  action: IRuntimeAction;
  /** Timestamp when the action was executed (frozen clock time) */
  timestamp: Date;
  /** Which iteration within the current turn (starts at 1) */
  iteration: number;
  /** Which execution turn (each executeAction() call creates new turn) */
  turnId: number;
}

/**
 * Record of an event dispatch.
 */
export interface EventDispatch {
  /** The event that was dispatched */
  event: IEvent;
  /** Timestamp when the event was dispatched */
  timestamp: Date;
  /** Actions that resulted from the event dispatch */
  resultingActions: IRuntimeAction[];
  /** Which turn the event was dispatched in */
  turnId: number;
}

/**
 * Simple mock statement for testing.
 */
export interface MockStatement {
  id: number;
  source?: string;
}

/**
 * Configuration for the test harness.
 */
export interface HarnessConfig {
  /** Initial clock time. Default: new Date() */
  clockTime?: Date;
  /** Max ExecutionContext iterations before throwing. Default: 20 */
  maxDepth?: number;
  /** JIT strategies to register with MockJitCompiler */
  strategies?: IRuntimeBlockStrategy[];
  /** Mock statements to populate the script. Useful for testing child execution. */
  statements?: MockStatement[];
}

/** Type for the mock clock with advance/setTime methods */
type MockClock = IRuntimeClock & {
  advance: (ms: number) => void;
  setTime: (time: Date) => void;
};

/**
 * ExecutionContextTestHarness - Testing infrastructure for ExecutionContext behavior.
 * 
 * Provides:
 * - Complete ScriptRuntime environment with MockJitCompiler
 * - Recording of turn-initiating action executions with timestamps
 * - Recording of all event dispatches
 * - Controllable mock clock for timing verification
 * - Assertion helpers for execution flow validation
 * - Test isolation and cleanup support
 * 
 * **Note on action recording**: Only actions passed to `executeAction()` are recorded.
 * Nested actions (those queued by actions via `runtime.do()`) are executed by the
 * ExecutionContext but not individually recorded. This is by design - each
 * `executeAction()` call represents a distinct "turn" of execution.
 * 
 * @example
 * ```typescript
 * const harness = new ExecutionContextTestHarness({
 *   clockTime: new Date('2024-01-01T12:00:00Z'),
 *   maxDepth: 20
 * });
 * 
 * // Configure mock JIT
 * harness.mockJit.whenMatches(() => true, new MockBlock('test', []));
 * 
 * // Execute actions
 * harness.executeAction({ type: 'test', do: () => {} });
 * 
 * // Assert on recordings
 * expect(harness.actionExecutions).toHaveLength(1);
 * expect(harness.wasActionExecuted('test')).toBe(true);
 * 
 * // Cleanup
 * harness.clearRecordings();
 * ```
 */
export class ExecutionContextTestHarness {
  /** The ScriptRuntime instance for testing */
  readonly runtime: ScriptRuntime;
  /** Mock JIT compiler for configuring block responses */
  readonly mockJit: MockJitCompiler;
  /** Controllable mock clock */
  readonly clock: MockClock;
  /** Runtime stack */
  readonly stack: RuntimeStack;
  /** Event bus */
  readonly eventBus: EventBus;

  private _actionExecutions: ActionExecution[] = [];
  private _eventDispatches: EventDispatch[] = [];
  private _currentTurnId = 0;
  private _currentIteration = 0;
  private _isExecutingTurn = false;

  constructor(config: HarnessConfig = {}) {
    // 1. Create mock clock
    this.clock = createMockClock(config.clockTime ?? new Date());

    // 2. Create stack and event bus
    this.stack = new RuntimeStack();
    this.eventBus = new EventBus();

    // 3. Create MockJitCompiler with strategies
    this.mockJit = new MockJitCompiler(config.strategies ?? []);

    // 4. Create WodScript with mock statements
    const statements = (config.statements ?? []).map(s => createMockStatement(s));
    const script = new WodScript('', statements);

    // 5. Create dependencies
    const dependencies: ScriptRuntimeDependencies = {
      stack: this.stack,
      clock: this.clock,
      eventBus: this.eventBus
    };

    // 6. Create ScriptRuntime
    this.runtime = new ScriptRuntime(
      script,
      this.mockJit,
      dependencies,
      { maxActionDepth: config.maxDepth ?? 20 }
    );

    // 7. Intercept runtime.do() for recording
    this._interceptRuntimeDo();

    // 8. Subscribe to event dispatches
    this._subscribeToEvents();
  }

  /**
   * Intercept runtime.do() to record action executions.
   * Preserves the original ExecutionContext behavior.
   */
  private _interceptRuntimeDo(): void {
    const originalDo = this.runtime.do.bind(this.runtime);
    const self = this;

    (this.runtime as any).do = function(action: IRuntimeAction): void {
      // Track turn boundaries - a new turn starts when we're not already executing
      if (!self._isExecutingTurn) {
        self._currentTurnId++;
        self._currentIteration = 0;
        self._isExecutingTurn = true;
      }

      // Record action execution
      self._currentIteration++;
      self._actionExecutions.push({
        action,
        timestamp: new Date(self.clock.now.getTime()),
        iteration: self._currentIteration,
        turnId: self._currentTurnId
      });

      // Execute via original method
      try {
        originalDo(action);
      } finally {
        // Only reset turn flag if this is the outermost call
        // We check by seeing if we're at iteration 1 (the initiating call)
        // Actually we need to track nesting depth instead
      }
    };

    // We need better tracking - use a depth counter
    let executionDepth = 0;
    (this.runtime as any).do = function(action: IRuntimeAction): void {
      const isNewTurn = executionDepth === 0;
      
      if (isNewTurn) {
        self._currentTurnId++;
        self._currentIteration = 0;
      }

      executionDepth++;
      self._currentIteration++;
      
      self._actionExecutions.push({
        action,
        timestamp: new Date(self.clock.now.getTime()),
        iteration: self._currentIteration,
        turnId: self._currentTurnId
      });

      try {
        originalDo(action);
      } finally {
        executionDepth--;
      }
    };
  }

  /**
   * Subscribe to all events to record dispatches.
   */
  private _subscribeToEvents(): void {
    this.eventBus.on('*', (event, _runtime) => {
      // Record the event dispatch
      // Note: The actions are already executed by the time the callback fires
      // We capture actions by dispatching again (but this would double-dispatch)
      // Instead, we record the event and note that actions were handled
      this._eventDispatches.push({
        event,
        timestamp: new Date(this.clock.now.getTime()),
        resultingActions: [], // Actions are handled by emit(), not captured here
        turnId: this._currentTurnId
      });
    }, 'harness-event-listener');
  }

  // ============================================================================
  // Execution API
  // ============================================================================

  /**
   * Execute an action through the runtime.
   * The action and any nested actions will be recorded.
   * 
   * @param action The action to execute
   */
  executeAction(action: IRuntimeAction): void {
    this.runtime.do(action);
  }

  /**
   * Start a workout by dispatching StartWorkoutAction.
   * This wraps the script's statements in a root block and pushes it.
   * 
   * @param options Optional configuration (totalRounds, etc.)
   */
  startWorkout(options?: { totalRounds?: number }): void {
    const { StartWorkoutAction } = require('@/runtime/actions/stack/StartWorkoutAction');
    this.executeAction(new StartWorkoutAction(options));
  }

  /**
   * Dispatch an event through the event bus.
   * The event and any resulting actions will be recorded.
   * 
   * @param event The event to dispatch
   */
  dispatchEvent(event: IEvent): void {
    this.eventBus.emit(event, this.runtime);
  }

  // ============================================================================
  // Recording Access
  // ============================================================================

  /**
   * Get all recorded action executions.
   * Returns a copy to prevent external mutation.
   */
  get actionExecutions(): readonly ActionExecution[] {
    return [...this._actionExecutions];
  }

  /**
   * Get all recorded event dispatches.
   * Returns a copy to prevent external mutation.
   */
  get eventDispatches(): readonly EventDispatch[] {
    return [...this._eventDispatches];
  }

  // ============================================================================
  // Assertion Helpers
  // ============================================================================

  /**
   * Get all action executions of a specific type.
   * 
   * @param type The action type to filter by
   */
  getActionsByType(type: string): ActionExecution[] {
    return this._actionExecutions.filter(e => e.action.type === type);
  }

  /**
   * Check if an action of the given type was executed.
   * 
   * @param type The action type to check
   */
  wasActionExecuted(type: string): boolean {
    return this._actionExecutions.some(e => e.action.type === type);
  }

  /**
   * Get all action executions from a specific turn.
   * 
   * @param turnId The turn ID to filter by
   */
  getActionsByTurn(turnId: number): ActionExecution[] {
    return this._actionExecutions.filter(e => e.turnId === turnId);
  }

  /**
   * Get all event dispatches with a specific name.
   * 
   * @param name The event name to filter by
   */
  getEventsByName(name: string): EventDispatch[] {
    return this._eventDispatches.filter(e => e.event.name === name);
  }

  /**
   * Check if an event with the given name was dispatched.
   * 
   * @param name The event name to check
   */
  wasEventDispatched(name: string): boolean {
    return this._eventDispatches.some(e => e.event.name === name);
  }

  // ============================================================================
  // Time Control
  // ============================================================================

  /**
   * Advance the mock clock by the specified milliseconds.
   * 
   * @param ms Milliseconds to advance
   * @returns this for method chaining
   */
  advanceClock(ms: number): this {
    this.clock.advance(ms);
    return this;
  }

  /**
   * Set the mock clock to a specific time.
   * 
   * @param time The time to set
   * @returns this for method chaining
   */
  setClock(time: Date): this {
    this.clock.setTime(time);
    return this;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clear all recordings and reset counters.
   * Call this in beforeEach() for test isolation.
   * Does not affect clock time or configured matchers.
   */
  clearRecordings(): void {
    this._actionExecutions = [];
    this._eventDispatches = [];
    this._currentTurnId = 0;
    this._currentIteration = 0;
    this.mockJit.clearCalls();
  }

  /**
   * Dispose of the runtime and clean up resources.
   * Call this in afterEach() or afterAll().
   */
  dispose(): void {
    this.runtime.dispose();
  }

  /**
   * Check if the runtime stack is empty.
   * (Runtime is "complete" when no blocks remain.)
   */
  isComplete(): boolean {
    return this.stack.count === 0;
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Push block to stack and mount it in one call.
   * 
   * @param block Block to push and mount
   * @returns this for method chaining
   */
  pushAndMount(block: IRuntimeBlock): this {
    this.stack.push(block);
    const mountAction: IRuntimeAction = {
      type: 'mount',
      do: (rt: IScriptRuntime) => block.mount(rt)
    };
    this.executeAction(mountAction);
    return this;
  }

  /**
   * Execute action and advance clock by duration.
   * 
   * @param action Action to execute
   * @param ms Milliseconds to advance clock after execution
   * @returns this for method chaining
   */
  executeAndAdvance(action: IRuntimeAction, ms: number): this {
    this.executeAction(action);
    this.advanceClock(ms);
    return this;
  }

  /**
   * Dispatch event and return the actions that were executed as a result.
   * Note: Due to the turn-based execution model, this returns actions
   * that were recorded after the event dispatch.
   * 
   * @param event Event to dispatch
   * @returns Actions that resulted from the event
   */
  dispatchAndGetActions(event: IEvent): IRuntimeAction[] {
    const beforeCount = this._actionExecutions.length;
    this.dispatchEvent(event);
    return this._actionExecutions.slice(beforeCount).map(e => e.action);
  }

  /**
   * Assert that an action was executed exactly N times.
   * Throws if the count doesn't match.
   * 
   * @param type Action type to check
   * @param count Expected execution count
   * @throws Error if count doesn't match
   */
  expectActionCount(type: string, count: number): void {
    const actual = this.getActionsByType(type).length;
    if (actual !== count) {
      throw new Error(
        `Expected ${count} executions of action '${type}' but found ${actual}`
      );
    }
  }

  /**
   * Assert that an action was executed at a specific iteration.
   * Throws if not found at that iteration.
   * 
   * @param type Action type to check
   * @param iteration Expected iteration number
   * @throws Error if action not found at iteration
   */
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

  /**
   * Get the most recent action execution of a specific type.
   * 
   * @param type Action type to find
   * @returns Last action execution of that type, or undefined
   */
  getLastAction(type: string): ActionExecution | undefined {
    const actions = this.getActionsByType(type);
    return actions[actions.length - 1];
  }

  /**
   * Force a new turn boundary by executing a no-op action.
   * Useful for testing turn-based behavior.
   * 
   * @returns this for method chaining
   */
  nextTurn(): this {
    this.executeAction({
      type: '__turn_boundary',
      do: () => {}
    });
    return this;
  }
}
