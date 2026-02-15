import { BlockKey, IMemoryReference, IRuntimeBlock, ICodeFragment, IScriptRuntime, WodScript, JitCompiler, IScript, CodeStatement } from "@/core";
import { FragmentType } from "@/core/models/CodeFragment";
import { IBlockContext, RuntimeError } from "@/core-entry";
import { IRuntimeStack, IRuntimeClock, IEventBus, IEvent, TypedMemoryReference } from "@/runtime/contracts";
import { IOutputStatement } from "@/core/models/OutputStatement";
import { ITestSetupAction } from "../setup";
import { MemoryOperation, StackOperation } from "./TestableBlock";
import { MemoryLocation } from "@/runtime/memory/MemoryLocation";


// Re-export for backward compatibility
export type ExecutionRecord = IOutputStatement;

/**
 * Snapshot of runtime state at a point in time
 */
export interface RuntimeSnapshot {
  /** Timestamp when snapshot was taken */
  timestamp: number;

  /** Stack state */
  stack: {
    depth: number;
    blockKeys: string[];
    currentBlockKey?: string;
  };

  /** Memory state */
  memory: {
    entries: Array<{
      id: string;
      ownerId: string;
      type: string;
      visibility: 'public' | 'private' | 'inherited';
      value: any;
    }>;
    totalCount: number;
  };

  /** Label for this snapshot */
  label?: string;
}

/**
 * Diff between two snapshots
 */
export interface SnapshotDiff {
  before: RuntimeSnapshot;
  after: RuntimeSnapshot;

  stack: {
    pushed: string[];
    popped: string[];
    depthChange: number;
  };

  memory: {
    allocated: string[];
    released: string[];
    modified: Array<{ id: string; oldValue: any; newValue: any }>;
  };
}

/**
 * Configuration for pre-populating memory
 */
export interface InitialMemoryEntry {
  type: string;
  ownerId: string;
  value: any;
  visibility?: 'public' | 'private';
}

/**
 * Configuration for pre-populating stack with stub blocks
 */
export interface InitialStackEntry {
  key: string;
  blockType?: string;
  label?: string;
}

/**
 * Configuration for TestableRuntime
 */
export interface TestableRuntimeConfig {
  /** Pre-populate memory with these entries */
  initialMemory?: InitialMemoryEntry[];

  /** Pre-populate stack with these block stubs */
  initialStack?: InitialStackEntry[];
}

/**
 * A stub block key that returns a custom string
 */
class StubBlockKey extends BlockKey {
  constructor(private readonly _id: string) {
    super();
  }

  override toString(): string {
    return this._id;
  }
}

/**
 * A stub context for pre-populating the stack.
 * Provides minimal implementation for testing purposes.
 */
class StubBlockContext implements IBlockContext {
  readonly ownerId: string;
  readonly exerciseId: string;
  readonly references: ReadonlyArray<IMemoryReference> = [];

  constructor(blockId: string) {
    this.ownerId = blockId;
    this.exerciseId = blockId;
  }

  allocate<T>(_type?: string, _initialValue?: T, _visibility?: string): any {
    return { id: '', type: '', ownerId: this.ownerId, visibility: 'private', value: () => null };
  }
  get<T>(_type?: string): TypedMemoryReference<T> | undefined { return undefined; }
  getAll<T>(_type?: string): TypedMemoryReference<T>[] { return []; }
  set<T>(_reference: TypedMemoryReference<T>, _value: T): void { }
  release(): void { }
  isReleased(): boolean { return false; }
  getOrCreateAnchor(): any {
    return {
      id: '',
      type: '',
      ownerId: this.ownerId,
      visibility: 'public',
      get: () => ({ searchCriteria: {} }),
      set: () => { },
      subscribe: () => (() => { }),
      value: () => ({ searchCriteria: {} }),
      subscriptions: []
    } as any;
  }
}

/**
 * A minimal stub block for pre-populating the stack
 */
class StubBlock implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly sourceIds: number[] = [];
  readonly blockType?: string;
  readonly context: IBlockContext;
  readonly fragments?: ICodeFragment[][];
  private _isComplete = false;
  private _memory: import('@/runtime/memory/MemoryLocation').IMemoryLocation[] = [];

  /**
   * Computed label derived from the block's Label fragment in memory.
   * Falls back to blockType → 'Block'.
   */
  get label(): string {
    for (const loc of this._memory) {
      for (const frag of loc.fragments) {
        if ((frag as any).fragmentType === FragmentType.Label) {
          return frag.image || (frag.value as any)?.toString() || this.blockType || 'Block';
        }
      }
    }
    return this.blockType || 'Block';
  }

  get isComplete(): boolean {
    return this._isComplete;
  }

  markComplete(_reason?: string): void {
    this._isComplete = true;
  }

  constructor(config: InitialStackEntry) {
    this.key = new StubBlockKey(config.key);
    this.blockType = config.blockType ?? 'stub';
    this.context = new StubBlockContext(config.key);

    // Store label as a Label fragment in memory
    const labelText = config.label ?? config.key;
    if (labelText) {
      this._memory.push(new MemoryLocation('fragment:label', [{
        fragmentType: FragmentType.Label,
        type: 'label',
        image: labelText,
        origin: 'config',
        value: labelText
      } as ICodeFragment]));
    }
  }

  mount(): import("@/runtime/contracts").IRuntimeAction[] { return []; }
  next(): import("@/runtime/contracts").IRuntimeAction[] { return []; }
  unmount(): import("@/runtime/contracts").IRuntimeAction[] { return []; }
  dispose(): void { }
  getBehavior<T>(_type: any): T | undefined { return undefined; }
  pushMemory(location: import("@/runtime/memory/MemoryLocation").IMemoryLocation): void { this._memory.push(location); }
  getMemoryByTag(tag: import("@/runtime/memory/MemoryLocation").MemoryTag): import("@/runtime/memory/MemoryLocation").IMemoryLocation[] { return this._memory.filter(loc => loc.tag === tag); }
  getAllMemory(): import("@/runtime/memory/MemoryLocation").IMemoryLocation[] { return [...this._memory]; }
  hasMemory(): boolean { return false; }
  getMemory<T extends import("@/runtime/memory/MemoryTypes").MemoryType>(_type: T): any { return undefined; }
  setMemoryValue<T extends import("@/runtime/memory/MemoryTypes").MemoryType>(_type: T, _value: any): void { }
}

/**
 * TestableRuntime wraps IScriptRuntime to provide:
 * - Operation tracking (memory allocations, stack changes)
 * - State snapshots for before/after comparisons
 * - Pre-configured initial state for testing
 * 
 * @example
 * ```typescript
 * const testRuntime = new TestableRuntime(realRuntime, {
 *   initialMemory: [
 *     { type: 'metric:reps', ownerId: 'parent', value: 21, visibility: 'public' }
 *   ]
 * });
 * 
 * const before = testRuntime.snapshot('before mount');
 * block.mount(testRuntime);
 * const after = testRuntime.snapshot('after mount');
 * const diff = testRuntime.diff(before, after);
 * ```
 */
export class TestableRuntime implements IScriptRuntime {
  private _memoryOps: MemoryOperation[] = [];
  private _stackOps: StackOperation[] = [];
  private _snapshots: RuntimeSnapshot[] = [];
  private _wrappedStack: IRuntimeStack;

  constructor(
    private readonly _wrapped: IScriptRuntime,
    config: TestableRuntimeConfig = {}
  ) {
    // Set up wrapped stack first
    this._wrappedStack = this._createWrappedStack();

    // Apply initial memory state
    if (config.initialMemory) {
      // Note: Central memory is outdated. Initial memory should be handled 
      // by the blocks themselves or injected via configuration.
      // For now, we skip this or we would need to find a target block.
      console.warn('[TestableRuntime] Initial memory pre-population is skipped because central memory is removed.');
    }

    // Apply initial stack state (using stub blocks)
    if (config.initialStack) {
      for (const stub of config.initialStack) {
        const stubBlock = new StubBlock(stub);
        this._wrapped.stack.push(stubBlock);
      }
    }
  }

  // ========== IScriptRuntime Properties (delegated) ==========

  get script(): WodScript {
    return this._wrapped.script;
  }

  get stack(): IRuntimeStack {
    return this._wrappedStack;
  }

  get jit(): JitCompiler {
    return this._wrapped.jit;
  }

  get clock(): IRuntimeClock {
    return this._wrapped.clock;
  }


  get errors(): RuntimeError[] | undefined {
    return this._wrapped.errors;
  }



  get eventBus(): IEventBus {
    return this._wrapped.eventBus;
  }

  get options(): import("@/runtime/contracts/IRuntimeOptions").RuntimeStackOptions {
    return this._wrapped.options;
  }

  get tracker(): any {
    return this._wrapped.tracker;
  }

  // ========== IScriptRuntime Methods (delegated) ==========

  /**
   * Executes an action on the wrapped runtime.
   */
  do(action: import("@/runtime/contracts/IRuntimeAction").IRuntimeAction): void {
    this._wrapped.do(action);
  }

  /**
   * Pushes multiple actions in the correct order for execution.
   */
  doAll(actions: import("@/runtime/contracts/IRuntimeAction").IRuntimeAction[]): void {
    this._wrapped.doAll(actions);
  }

  /**
   * Dispatches an event to the wrapped runtime.
   */
  handle(event: IEvent): void {
    this._wrapped.handle(event);
  }

  dispose(): void {
    this._wrapped.dispose();
  }

  // ========== Output Statement API (delegated) ==========

  subscribeToOutput(listener: (output: import("@/core").IOutputStatement) => void): import("@/runtime/contracts").Unsubscribe {
    return this._wrapped.subscribeToOutput(listener);
  }

  getOutputStatements(): import("@/core").IOutputStatement[] {
    return this._wrapped.getOutputStatements();
  }

  addOutput(output: import("@/core").IOutputStatement): void {
    this._wrapped.addOutput(output);
  }

  // ========== Stack Observer API (delegated) ==========

  subscribeToStack(observer: import("@/runtime/contracts").StackObserver): import("@/runtime/contracts").Unsubscribe {
    return this._wrapped.subscribeToStack(observer);
  }

  // ========== Block Lifecycle API (delegated) ==========

  pushBlock(block: import("@/runtime/contracts/IRuntimeBlock").IRuntimeBlock, lifecycle?: import("@/runtime/contracts/IRuntimeBlock").BlockLifecycleOptions): void {
    this._wrapped.pushBlock(block, lifecycle);
  }

  popBlock(lifecycle?: import("@/runtime/contracts/IRuntimeBlock").BlockLifecycleOptions): void {
    this._wrapped.popBlock(lifecycle);
  }

  getStatementById(id: number): any {
    return this.script.getId(id);
  }

  // ========== Testing API ==========

  /** Access the underlying runtime */
  get wrapped(): IScriptRuntime {
    return this._wrapped;
  }

  /** All recorded memory operations */
  get memoryOperations(): ReadonlyArray<MemoryOperation> {
    return [...this._memoryOps];
  }

  /** All recorded stack operations */
  get stackOperations(): ReadonlyArray<StackOperation> {
    return [...this._stackOps];
  }

  /** All captured snapshots */
  get snapshots(): ReadonlyArray<RuntimeSnapshot> {
    return [...this._snapshots];
  }

  /** Clear all recorded operations */
  clearOperations(): void {
    this._memoryOps = [];
    this._stackOps = [];
  }

  /** Clear all captured snapshots */
  clearSnapshots(): void {
    this._snapshots = [];
  }

  /** Clear everything (operations and snapshots) */
  reset(): void {
    this.clearOperations();
    this.clearSnapshots();
  }

  /** Capture current state as a snapshot */
  snapshot(label?: string): RuntimeSnapshot {
    // Collect all references from all blocks on the stack
    const allRefs = this._wrapped.stack.blocks.flatMap(b => b.context.references);

    const snapshot: RuntimeSnapshot = {
      timestamp: Date.now(),
      label,
      stack: {
        depth: this._wrapped.stack.blocks.length,
        blockKeys: this._wrapped.stack.blocks.map(b => b.key.toString()),
        currentBlockKey: this._wrapped.stack.current?.key.toString()
      },
      memory: {
        entries: allRefs.map(ref => ({
          id: ref.id,
          ownerId: ref.ownerId,
          type: ref.type,
          visibility: ref.visibility,
          value: ref.value()
        })),
        totalCount: allRefs.length
      }
    };

    this._snapshots.push(snapshot);
    return snapshot;
  }

  /** Calculate diff between two snapshots */
  diff(before: RuntimeSnapshot, after: RuntimeSnapshot): SnapshotDiff {
    const beforeMemIds = new Set(before.memory.entries.map(e => e.id));
    const afterMemIds = new Set(after.memory.entries.map(e => e.id));

    const allocated = after.memory.entries
      .filter(e => !beforeMemIds.has(e.id))
      .map(e => e.id);

    const released = before.memory.entries
      .filter(e => !afterMemIds.has(e.id))
      .map(e => e.id);

    const modified: Array<{ id: string; oldValue: any; newValue: any }> = [];
    for (const afterEntry of after.memory.entries) {
      const beforeEntry = before.memory.entries.find(e => e.id === afterEntry.id);
      if (beforeEntry && JSON.stringify(beforeEntry.value) !== JSON.stringify(afterEntry.value)) {
        modified.push({
          id: afterEntry.id,
          oldValue: beforeEntry.value,
          newValue: afterEntry.value
        });
      }
    }

    const beforeStackKeys = new Set(before.stack.blockKeys);
    const afterStackKeys = new Set(after.stack.blockKeys);

    return {
      before,
      after,
      stack: {
        pushed: after.stack.blockKeys.filter(k => !beforeStackKeys.has(k)),
        popped: before.stack.blockKeys.filter(k => !afterStackKeys.has(k)),
        depthChange: after.stack.depth - before.stack.depth
      },
      memory: {
        allocated,
        released,
        modified
      }
    };
  }

  /** Get memory operations filtered by type */
  getMemoryOps(operation?: MemoryOperation['operation']): MemoryOperation[] {
    if (!operation) return [...this._memoryOps];
    return this._memoryOps.filter(op => op.operation === operation);
  }

  /** Get stack operations filtered by type */
  getStackOps(operation?: StackOperation['operation']): StackOperation[] {
    if (!operation) return [...this._stackOps];
    return this._stackOps.filter(op => op.operation === operation);
  }

  // ========== Event Simulation API ==========

  /**
   * Simulate a 'tick' event (periodic timer update)
   * This is typically called by the runtime loop
   */
  simulateTick(): void {
    this.handle({
      name: 'tick',
      timestamp: new Date(),
      data: { source: 'test-simulation' }
    });
  }

  /**
   * Simulate a 'next' event (user action to advance)
   * This triggers completion for generic effort blocks
   */
  simulateNext(): void {
    this.handle({
      name: 'next',
      timestamp: new Date(),
      data: { source: 'test-simulation' }
    });
  }

  /**
   * Simulate a rep completion event for EffortBlock
   * @param blockId - The block receiving the rep update
   * @param reps - Number of reps completed
   */
  simulateReps(blockId: string, reps: number): void {
    this.handle({
      name: 'reps:update',
      timestamp: new Date(),
      data: {
        source: 'test-simulation',
        blockId,
        reps
      }
    });
  }

  /**
   * Simulate a timer event
   * @param eventType - Type of timer event
   * @param data - Additional event data
   */
  simulateTimerEvent(eventType: 'timer:start' | 'timer:stop' | 'timer:pause' | 'timer:resume' | 'timer:complete', data?: any): void {
    this.handle({
      name: eventType,
      timestamp: new Date(),
      data: { source: 'test-simulation', ...data }
    });
  }

  /**
   * Simulate round completion
   * @param blockId - The block completing a round
   * @param roundNumber - Which round completed
   */
  simulateRoundComplete(blockId: string, roundNumber: number): void {
    this.handle({
      name: 'rounds:complete',
      timestamp: new Date(),
      data: {
        source: 'test-simulation',
        blockId,
        round: roundNumber
      }
    });
  }

  /**
   * Simulate a custom event
   * @param name - Event name
   * @param data - Event data
   */
  simulateEvent(name: string, data?: any): void {
    this.handle({
      name,
      timestamp: new Date(),
      data: { source: 'test-simulation', ...data }
    });
  }

  /**
   * Run multiple ticks (simulate time passage)
   * @param count - Number of ticks to simulate
   * @param intervalMs - Delay between ticks (for realistic testing)
   */
  async simulateTicks(count: number, intervalMs: number = 0): Promise<void> {
    for (let i = 0; i < count; i++) {
      this.simulateTick();
      if (intervalMs > 0 && i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  // ========== Test Setup API ==========

  /**
   * Apply an array of test setup actions to configure runtime state.
   * Use this to set up specific scenarios before testing lifecycle operations.
   * 
   * @param actions - Array of setup actions to apply
   * @example
   * ```typescript
   * testRuntime.applyTestActions([
   *   new SetLoopIndexAction({ blockKey: 'rounds-1', currentIndex: 2 }),
   *   new SetEffortStateAction({ blockKey: 'effort-1', currentReps: 5 })
   * ]);
   * ```
   */
  applyTestActions(actions: ITestSetupAction[]): void {
    for (const action of actions) {
      action.apply(this);
    }
  }

  /**
   * Compile and push a statement from a parsed script by statement ID.
   * The statement ID is the unique identifier assigned during parsing.
   * 
   * @param script - The parsed WodScript containing statements
   * @param statementId - The statement ID to compile and push
   * @param options - Additional options
   * @returns The compiled block, or undefined if statement not found
   * 
   * @example
   * ```typescript
   * const script = parseWodScript("3 Rounds\n  10 Pushups\n  15 Squats");
   * // Push the "10 Pushups" statement (statement ID depends on parser)
   * const block = testRuntime.pushStatementById(script, 2);
   * ```
   */
  pushStatementById(
    script: IScript,
    statementId: number,
    options: { includeChildren?: boolean; mountAfterPush?: boolean } = {}
  ): IRuntimeBlock | undefined {
    const { includeChildren = false, mountAfterPush = true } = options;

    const statement = script.getId(statementId);
    if (!statement) {
      console.warn(`pushStatementById: No statement found with ID ${statementId}`);
      return undefined;
    }

    // Gather statements to compile
    let statementsToCompile = [statement];

    if (includeChildren && statement.children && statement.children.length > 0) {
      const childIds = statement.children.flat();
      const childStatements = script.getIds(childIds);
      statementsToCompile = [...statementsToCompile, ...childStatements];
    }

    // Compile using JIT
    const block = this._wrapped.jit.compile(
      statementsToCompile as CodeStatement[],
      this._wrapped
    );

    if (!block) {
      console.warn(`pushStatementById: Failed to compile statement ID ${statementId}`);
      return undefined;
    }

    // Push to stack
    this.stack.push(block);

    // Optionally mount
    if (mountAfterPush) {
      const mountActions = block.mount(this);
      // Execute mount actions
      for (const action of mountActions) {
        action.do(this);
      }
    }

    return block;
  }

  /**
   * Compile and push a statement from a parsed script by array index.
   * The index is 0-based position in the statements array.
   * 
   * @param script - The parsed WodScript containing statements
   * @param index - The 0-based array index of the statement
   * @param options - Additional options
   * @returns The compiled block, or undefined if index out of bounds
   */
  pushStatementByIndex(
    script: IScript,
    index: number,
    options: { includeChildren?: boolean; mountAfterPush?: boolean } = {}
  ): IRuntimeBlock | undefined {
    const { includeChildren = false, mountAfterPush = true } = options;

    const statement = script.getAt(index);
    if (!statement) {
      console.warn(`pushStatementByIndex: No statement at index ${index}`);
      return undefined;
    }

    // Gather statements to compile
    let statementsToCompile = [statement];

    if (includeChildren && statement.children && statement.children.length > 0) {
      const childIds = statement.children.flat();
      const childStatements = script.getIds(childIds);
      statementsToCompile = [...statementsToCompile, ...childStatements];
    }

    // Compile using JIT
    const block = this._wrapped.jit.compile(
      statementsToCompile as CodeStatement[],
      this._wrapped
    );

    if (!block) {
      console.warn(`pushStatementByIndex: Failed to compile statement at index ${index}`);
      return undefined;
    }

    // Push to stack
    this.stack.push(block);

    // Optionally mount
    if (mountAfterPush) {
      const mountActions = block.mount(this);
      // Execute mount actions
      for (const action of mountActions) {
        action.do(this);
      }
    }

    return block;
  }

  /**
   * Get all block keys currently on the stack.
   * Useful for selecting targets for test setup actions.
   */
  getStackBlockKeys(): string[] {
    return this._wrapped.stack.blocks.map(b => b.key.toString());
  }

  /**
   * Get the current block key (top of stack).
   */
  getCurrentBlockKey(): string | undefined {
    return this._wrapped.stack.current?.key.toString();
  }

  // ========== Private Helpers ==========

  private _createWrappedStack(): IRuntimeStack {
    const self = this;
    const original = this._wrapped.stack;

    // Create a proxy for the stack that records operations
    return new Proxy(original, {
      get(target, prop) {
        if (prop === 'push') {
          return function (block: IRuntimeBlock) {
            self._stackOps.push({
              operation: 'push',
              blockKey: block.key.toString(),
              blockType: block.blockType,
              timestamp: Date.now()
            });
            return target.push(block);
          };
        }

        if (prop === 'pop') {
          return function () {
            const block = target.pop();
            if (block) {
              self._stackOps.push({
                operation: 'pop',
                blockKey: block.key.toString(),
                blockType: block.blockType,
                timestamp: Date.now()
              });
            }
            return block;
          };
        }

        const value = (target as any)[prop];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }
    }) as IRuntimeStack;
  }
}

/**
 * Factory function to create a TestableRuntime with minimal setup
 */
export function createTestableRuntime(
  wrapped: IScriptRuntime,
  config?: TestableRuntimeConfig
): TestableRuntime {
  return new TestableRuntime(wrapped, config);
}
