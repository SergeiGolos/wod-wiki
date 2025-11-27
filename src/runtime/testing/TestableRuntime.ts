import { IScriptRuntime } from '../IScriptRuntime';
import { RuntimeStack } from '../RuntimeStack';
import { IRuntimeMemory, Nullable } from '../IRuntimeMemory';
import { IMemoryReference, TypedMemoryReference } from '../IMemoryReference';
import { JitCompiler } from '../JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { IEvent } from '../IEvent';
import { RuntimeError } from '../actions/ErrorAction';
import { IMetricCollector } from '../MetricCollector';
import { ExecutionRecord } from '../models/ExecutionRecord';
import { MemoryOperation, StackOperation } from './TestableBlock';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { BlockKey } from '../../core/models/BlockKey';

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
      visibility: 'public' | 'private';
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
 * A minimal stub block for pre-populating the stack
 */
class StubBlock implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly sourceIds: number[] = [];
  readonly blockType?: string;
  readonly label: string;
  
  constructor(config: InitialStackEntry) {
    this.key = new StubBlockKey(config.key);
    this.blockType = config.blockType ?? 'stub';
    this.label = config.label ?? config.key;
  }
  
  mount(): [] { return []; }
  next(): [] { return []; }
  unmount(): [] { return []; }
  dispose(): void {}
  getBehavior(): undefined { return undefined; }
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
  private _wrappedMemory: IRuntimeMemory;
  private _wrappedStack: RuntimeStack;
  
  constructor(
    private readonly _wrapped: IScriptRuntime,
    config: TestableRuntimeConfig = {}
  ) {
    // Set up wrapped memory and stack first
    this._wrappedMemory = this._createWrappedMemory();
    this._wrappedStack = this._createWrappedStack();
    
    // Apply initial memory state
    if (config.initialMemory) {
      for (const entry of config.initialMemory) {
        this._wrapped.memory.allocate(
          entry.type,
          entry.ownerId,
          entry.value,
          entry.visibility ?? 'private'
        );
      }
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
  
  get memory(): IRuntimeMemory {
    return this._wrappedMemory;
  }
  
  get stack(): RuntimeStack {
    return this._wrappedStack;
  }
  
  get jit(): JitCompiler {
    return this._wrapped.jit;
  }
  
  get errors(): RuntimeError[] | undefined {
    return this._wrapped.errors;
  }
  
  get metrics(): IMetricCollector | undefined {
    return this._wrapped.metrics;
  }
  
  get executionLog(): ExecutionRecord[] {
    return this._wrapped.executionLog;
  }
  
  // ========== IScriptRuntime Methods (delegated) ==========
  
  isComplete(): boolean {
    return this._wrapped.isComplete();
  }
  
  handle(event: IEvent): void {
    this._wrapped.handle(event);
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
    const memoryRefs = this._wrapped.memory.search({
      id: null,
      ownerId: null,
      type: null,
      visibility: null
    });
    
    const snapshot: RuntimeSnapshot = {
      timestamp: Date.now(),
      label,
      stack: {
        depth: this._wrapped.stack.blocks.length,
        blockKeys: this._wrapped.stack.blocks.map(b => b.key.toString()),
        currentBlockKey: this._wrapped.stack.current?.key.toString()
      },
      memory: {
        entries: memoryRefs.map(ref => ({
          id: ref.id,
          ownerId: ref.ownerId,
          type: ref.type,
          visibility: ref.visibility,
          value: ref.value()
        })),
        totalCount: memoryRefs.length
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
  
  // ========== Private Helpers ==========
  
  private _createWrappedMemory(): IRuntimeMemory {
    const self = this;
    const original = this._wrapped.memory;
    
    return {
      allocate<T>(type: string, ownerId: string, initialValue?: T, visibility?: 'public' | 'private') {
        const ref = original.allocate(type, ownerId, initialValue, visibility);
        self._memoryOps.push({
          operation: 'allocate',
          type,
          ownerId,
          refId: ref.id,
          value: initialValue,
          timestamp: Date.now()
        });
        return ref;
      },
      
      get<T>(reference: TypedMemoryReference<T>) {
        const value = original.get(reference);
        self._memoryOps.push({
          operation: 'get',
          type: reference.type,
          ownerId: reference.ownerId,
          refId: reference.id,
          value,
          timestamp: Date.now()
        });
        return value;
      },
      
      set<T>(reference: TypedMemoryReference<T>, value: T) {
        self._memoryOps.push({
          operation: 'set',
          type: reference.type,
          ownerId: reference.ownerId,
          refId: reference.id,
          value,
          timestamp: Date.now()
        });
        original.set(reference, value);
      },
      
      release(reference: IMemoryReference) {
        self._memoryOps.push({
          operation: 'release',
          type: reference.type,
          ownerId: reference.ownerId,
          refId: reference.id,
          timestamp: Date.now()
        });
        original.release(reference);
      },
      
      search(criteria: Nullable<IMemoryReference>) {
        const refs = original.search(criteria);
        self._memoryOps.push({
          operation: 'search',
          type: criteria.type ?? '*',
          ownerId: criteria.ownerId ?? '*',
          timestamp: Date.now()
        });
        return refs;
      },
      
      subscribe(callback: (ref: IMemoryReference, value: any, oldValue: any) => void) {
        return original.subscribe(callback);
      }
    };
  }
  
  private _createWrappedStack(): RuntimeStack {
    const self = this;
    const original = this._wrapped.stack;
    
    // Create a proxy for the stack that records operations
    return new Proxy(original, {
      get(target, prop) {
        if (prop === 'push') {
          return function(block: IRuntimeBlock) {
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
          return function() {
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
    }) as RuntimeStack;
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
