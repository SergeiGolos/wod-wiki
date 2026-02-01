import { BlockKey } from '@/core/models/BlockKey';
import { IRuntimeAction } from '@/runtime/contracts';
import { IRuntimeBehavior } from '@/runtime/contracts';
import { BlockLifecycleOptions, IRuntimeBlock } from '@/runtime/contracts';
import { IScriptRuntime } from '@/runtime/contracts';
import { IBlockContext } from '@/runtime/contracts';
import { ICodeFragment, FragmentType } from '@/core/models/CodeFragment';
import { IMemoryReference, TypedMemoryReference } from '@/runtime/contracts';
import { MemoryTypeEnum } from '@/runtime/models/MemoryTypeEnum';
import { IAnchorValue } from '@/runtime/contracts/IAnchorValue';
import { MemoryType, MemoryValueOf } from '@/runtime/memory/MemoryTypes';
import { IMemoryEntry } from '@/runtime/memory/IMemoryEntry';
import { IBehaviorContext, BehaviorEventType, BehaviorEventListener, Unsubscribe } from '@/runtime/contracts/IBehaviorContext';
import { IRuntimeClock } from '@/runtime/contracts/IRuntimeClock';
import { OutputStatementType } from '@/core/models/OutputStatement';

/**
 * Minimal stub context for MockBlock
 */
class MockBlockContext implements IBlockContext {
  readonly ownerId: string;
  readonly exerciseId: string;
  readonly references: Array<IMemoryReference> = [];
  private _released = false;

  constructor(blockId: string) {
    this.ownerId = blockId;
    this.exerciseId = blockId;
  }

  allocate<T>(type: MemoryTypeEnum | string, initialValue?: T, visibility?: 'public' | 'private'): TypedMemoryReference<T> {
    let currentValue = initialValue;
    const ref = {
      id: `mock-ref-${Math.random().toString(36).slice(2)}`,
      type: type,
      ownerId: this.ownerId,
      visibility: (visibility ?? 'private') as 'public' | 'private' | 'inherited',
      value: () => currentValue,
      get: () => currentValue,
      set: (value: T) => { currentValue = value; },
      _subscriptions: [],
      _memory: {} as any, // Mock
      subscribe: (cb: any) => { (ref as any)._subscriptions.push(cb); return () => { }; }
    } as unknown as TypedMemoryReference<T>;

    this.references.push(ref);
    return ref;
  }

  get<T>(type: MemoryTypeEnum | string): TypedMemoryReference<T> | undefined {
    return this.references.find(r => r.type === type) as TypedMemoryReference<T> | undefined;
  }

  getAll<T>(type: string): TypedMemoryReference<T>[] {
    return this.references.filter(r => r.type === type) as TypedMemoryReference<T>[];
  }

  set<T>(reference: TypedMemoryReference<T>, value: T): void {
    reference.set(value);
  }

  release(): void { this._released = true; }
  isReleased(): boolean { return this._released; }

  getOrCreateAnchor(anchorId: string): TypedMemoryReference<IAnchorValue> {
    const existing = this.get<IAnchorValue>(`anchor-${anchorId}`);
    if (existing) return existing;
    return this.allocate<IAnchorValue>(`anchor-${anchorId}`, { searchCriteria: {} }, 'public');
  }
}

/**
 * Minimal mock implementation of IBehaviorContext for testing.
 * Provides the essential properties behaviors need without full runtime integration.
 */
class MockBehaviorContext implements IBehaviorContext {
  readonly block: IRuntimeBlock;
  readonly clock: IRuntimeClock;
  readonly stackLevel: number;
  private _mockBlock: MockBlock;

  constructor(block: MockBlock, clock: IRuntimeClock, stackLevel: number = 0) {
    this._mockBlock = block;
    this.block = block;
    this.clock = clock;
    this.stackLevel = stackLevel;
  }

  subscribe(_eventType: BehaviorEventType, _listener: BehaviorEventListener): Unsubscribe {
    // Mock: no-op subscription
    return () => {};
  }

  emitOutput(_type: OutputStatementType, _fragments: ICodeFragment[], _options?: { label?: string }): void {
    // Mock: no-op output emission
  }

  emitEvent(_event: { name: string; timestamp: Date; data?: unknown }): void {
    // Mock: no-op event emission
  }

  getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined {
    const ref = this._mockBlock.context?.get<MemoryValueOf<T>>(type);
    return ref?.get?.() ?? undefined;
  }

  setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
    const existing = this._mockBlock.context?.get<MemoryValueOf<T>>(type);
    if (existing) {
      existing.set(value);
    } else {
      this._mockBlock.context?.allocate(type, value, 'private');
    }
  }

  markComplete(reason?: string): void {
    this._mockBlock.markComplete(reason);
  }

  dispose(): void {
    // Mock: no-op dispose
  }
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
  private _forcedMountActions: IRuntimeAction[] = [];
  private _forcedNextActions: IRuntimeAction[] = [];
  private _forcedUnmountActions: IRuntimeAction[] = [];
  private _isComplete = false;
  private _completionReason?: string;

  /**
   * Indicates whether this block has completed execution.
   */
  get isComplete(): boolean {
    return this._isComplete;
  }

  /**
   * Marks the block as complete. Idempotent - subsequent calls have no effect.
   * @param reason Optional reason for completion (for debugging/history)
   */
  markComplete(reason?: string): void {
    if (this._isComplete) return;
    this._isComplete = true;
    this._completionReason = reason;
  }

  /**
   * Gets the completion reason if block is complete.
   */
  get completionReason(): string | undefined {
    return this._completionReason;
  }

  constructor(
    idOrConfig: string | MockBlockConfig,
    private readonly behaviors: IRuntimeBehavior[] = [],
    config?: MockBlockConfig
  ) {
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

  setRuntime(runtime: IScriptRuntime): void {
    this._runtime = runtime;
  }

  get runtime(): IScriptRuntime | undefined {
    return this._runtime;
  }

  // Helper methods to force specific actions for testing
  setMountActions(actions: IRuntimeAction[]): void {
    this._forcedMountActions = actions;
  }

  setNextActions(actions: IRuntimeAction[]): void {
    this._forcedNextActions = actions;
  }

  setUnmountActions(actions: IRuntimeAction[]): void {
    this._forcedUnmountActions = actions;
  }

  mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const clock = options?.clock ?? runtime.clock;
    this.executionTiming.startTime = options?.startTime ?? clock.now;

    if (this._forcedMountActions.length > 0) {
      return [...this._forcedMountActions];
    }

    const ctx = new MockBehaviorContext(this, clock, runtime.stack?.count ?? 0);
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      // Detect API version: if onMount exists, use new API; otherwise use legacy onPush
      const usesNewApi = typeof behavior.onMount === 'function';
      const result = usesNewApi 
        ? behavior.onMount(ctx) 
        : behavior.onPush?.(this, clock);
      if (result) actions.push(...result);
    }
    return actions;
  }

  next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    if (this._forcedNextActions.length > 0) {
      return [...this._forcedNextActions];
    }

    const clock = options?.clock ?? runtime.clock;
    const ctx = new MockBehaviorContext(this, clock, runtime.stack?.count ?? 0);
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      // Detect API version: if onMount exists (new API) use ctx, else use legacy (block, clock)
      const usesNewApi = typeof behavior.onMount === 'function';
      const result = usesNewApi 
        ? behavior.onNext?.(ctx) 
        : (behavior as any).onNext?.(this, clock);
      if (result) actions.push(...result);
    }
    return actions;
  }

  unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const clock = options?.clock ?? runtime.clock;
    this.executionTiming.completedAt = options?.completedAt ?? clock.now;

    if (this._forcedUnmountActions.length > 0) {
      return [...this._forcedUnmountActions];
    }

    const ctx = new MockBehaviorContext(this, clock, runtime.stack?.count ?? 0);
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      // Detect API version: if onMount exists (new API) use ctx, else use legacy onPop
      const usesNewApi = typeof behavior.onMount === 'function';
      const result = usesNewApi 
        ? behavior.onUnmount?.(ctx) 
        : behavior.onPop?.(this, clock);
      if (result) actions.push(...result);
    }
    return actions;
  }

  dispose(_runtime: IScriptRuntime): void {
    for (const behavior of this.behaviors) {
      if (typeof (behavior as any).onDispose === 'function') {
        (behavior as any).onDispose(this);
      }
    }
  }

  getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined {
    return this.behaviors.find(b => b instanceof behaviorType) as T | undefined;
  }

  findFragment<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType,
    predicate?: (f: ICodeFragment) => boolean
  ): T | undefined {
    for (const group of this.fragments) {
      const found = group.find(f => f.fragmentType === type && (!predicate || predicate(f)));
      if (found) return found as T;
    }
    return undefined;
  }

  filterFragments<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType
  ): T[] {
    const result: T[] = [];
    for (const group of this.fragments) {
      const found = group.filter(f => f.fragmentType === type);
      result.push(...(found as T[]));
    }
    return result;
  }

  hasFragment(type: FragmentType): boolean {
    return this.fragments.some(group => group.some(f => f.fragmentType === type));
  }

  // ============================================================================
  // Block-Owned Memory (required by IRuntimeBlock interface)
  // ============================================================================

  private _memoryEntries: Map<string, MockMemoryEntry<any, any>> = new Map();

  /**
   * Check if this block owns memory of the specified type.
   */
  hasMemory<T extends MemoryType>(type: T): boolean {
    return this._memoryEntries.has(type);
  }

  /**
   * Get memory entry of the specified type.
   */
  getMemory<T extends MemoryType>(
    type: T
  ): IMemoryEntry<T, MemoryValueOf<T>> | undefined {
    return this._memoryEntries.get(type);
  }

  /**
   * Get all memory types owned by this block.
   */
  getMemoryTypes(): MemoryType[] {
    return Array.from(this._memoryEntries.keys()) as MemoryType[];
  }

  /**
   * Set memory value directly. Creates or updates a memory entry.
   */
  setMemoryValue<T extends MemoryType>(
    type: T,
    value: MemoryValueOf<T>
  ): void {
    if (this._memoryEntries.has(type)) {
      const entry = this._memoryEntries.get(type)!;
      entry.setValue(value);
    } else {
      this._memoryEntries.set(type, new MockMemoryEntry(type, value));
    }
  }
}

/**
 * Simple mock memory entry for testing.
 */
class MockMemoryEntry<T extends string, V> implements IMemoryEntry<T, V> {
  readonly type: T;
  private _value: V;
  private _subscribers: Set<(newValue: V | undefined, oldValue: V | undefined) => void> = new Set();

  constructor(type: T, initialValue: V) {
    this.type = type;
    this._value = initialValue;
  }

  get value(): V {
    return this._value;
  }

  setValue(newValue: V): void {
    const oldValue = this._value;
    this._value = newValue;
    for (const subscriber of this._subscribers) {
      subscriber(newValue, oldValue);
    }
  }

  subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void {
    this._subscribers.add(listener);
    return () => this._subscribers.delete(listener);
  }
}
