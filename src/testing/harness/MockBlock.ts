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
import { IBehaviorContext, BehaviorEventType, BehaviorEventListener, Unsubscribe } from '@/runtime/contracts/IBehaviorContext';
import { IRuntimeClock } from '@/runtime/contracts/IRuntimeClock';
import { OutputStatementType } from '@/core/models/OutputStatement';
import { IMemoryLocation, MemoryLocation, MemoryTag } from '@/runtime/memory/MemoryLocation';

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
    // Check list-based memory on the MockBlock first
    const tag = type as string as MemoryTag;
    const locations = this._mockBlock.getMemoryByTag(tag);
    if (locations.length > 0) {
      const loc = locations[0];
      if (loc.fragments.length > 0) {
        return loc.fragments[0]?.value as MemoryValueOf<T>;
      }
      return undefined;
    }
    // Fall back to context-based lookup
    const ref = this._mockBlock.context?.get<MemoryValueOf<T>>(type);
    return ref?.get?.() ?? undefined;
  }

  setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
    // Try list-based memory first
    const tag = type as string as MemoryTag;
    const locations = this._mockBlock.getMemoryByTag(tag);
    if (locations.length > 0) {
      const loc = locations[0];
      if (loc.fragments.length > 0) {
        const updated = loc.fragments.map((f, i) =>
          i === 0 ? { ...f, value } : f
        );
        loc.update(updated);
      } else {
        loc.update([{ fragmentType: 0, type: tag, image: '', origin: 'runtime', value } as any]);
      }
      return;
    }
    // Fall back to context-based storage
    const existing = this._mockBlock.context?.get<MemoryValueOf<T>>(type);
    if (existing) {
      existing.set(value);
    } else {
      this._mockBlock.context?.allocate(type, value, 'private');
    }
  }

  pushMemory(_tag: string, _fragments: ICodeFragment[]): IMemoryLocation {
    // Create a real MemoryLocation and push it to the MockBlock
    const location = new MemoryLocation(_tag as MemoryTag, _fragments);
    this._mockBlock.pushMemory(location);
    return location;
  }

  updateMemory(_tag: string, _fragments: ICodeFragment[]): void {
    // Update the first matching location on the MockBlock
    const locations = this._mockBlock.getMemoryByTag(_tag as MemoryTag);
    if (locations.length > 0) {
      locations[0].update(_fragments);
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

  // ============================================================================
  // List-Based Memory API
  // ============================================================================

  private _memory: IMemoryLocation[] = [];
  private _memoryEntries: Map<string, MockMemoryEntry<any, any>> = new Map();

  /**
   * Push a new memory location onto the block's memory list.
   */
  pushMemory(location: IMemoryLocation): void {
    this._memory.push(location);
  }

  /**
   * Get all memory locations matching the given tag.
   */
  getMemoryByTag(tag: MemoryTag): IMemoryLocation[] {
    return this._memory.filter(loc => loc.tag === tag);
  }

  /**
   * Get all memory locations.
   */
  getAllMemory(): IMemoryLocation[] {
    return [...this._memory];
  }

  // ============================================================================
  // Backward-Compatible Memory API (shims over list-based memory)
  // ============================================================================

  /**
   * Check if this block owns memory of the specified type.
   * @deprecated Use getMemoryByTag().length > 0
   */
  hasMemory(type: MemoryType): boolean {
    // Check list-based memory first, then fall back to legacy map
    const tag = type as string as MemoryTag;
    if (this._memory.some(loc => loc.tag === tag)) return true;
    return this._memoryEntries.has(type);
  }

  /**
   * Get memory entry of the specified type.
   * @deprecated Use getMemoryByTag() instead.
   */
  getMemory<T extends MemoryType>(
    type: T
  ): any {
    // Check list-based memory first
    const tag = type as string as MemoryTag;
    const locations = this._memory.filter(loc => loc.tag === tag);
    if (locations.length > 0) {
      const loc = locations[0];
      return {
        get value(): MemoryValueOf<T> {
          if (loc.fragments.length === 0) return undefined as unknown as MemoryValueOf<T>;
          return loc.fragments[0]?.value as MemoryValueOf<T>;
        },
        subscribe(listener: (nv: any, ov: any) => void): () => void {
          return loc.subscribe((newFrags, oldFrags) => {
            const newVal = newFrags.length > 0 ? newFrags[0]?.value : undefined;
            const oldVal = oldFrags.length > 0 ? oldFrags[0]?.value : undefined;
            listener(newVal, oldVal);
          });
        }
      };
    }
    // Fall back to legacy map
    return this._memoryEntries.get(type);
  }

  /**
   * Set memory value directly. Creates or updates a memory entry.
   * @deprecated Use pushMemory() or BehaviorContext APIs.
   */
  setMemoryValue<T extends MemoryType>(
    type: T,
    value: MemoryValueOf<T>
  ): void {
    // Try list-based first
    const tag = type as string as MemoryTag;
    const locations = this._memory.filter(loc => loc.tag === tag);
    if (locations.length > 0) {
      const loc = locations[0];
      if (loc.fragments.length > 0) {
        const updated = loc.fragments.map((f, i) =>
          i === 0 ? { ...f, value } : f
        );
        loc.update(updated);
      } else {
        loc.update([{ fragmentType: 0, type: tag, image: '', origin: 'runtime', value } as any]);
      }
      return;
    }
    // Fall back to legacy map
    if (this._memoryEntries.has(type)) {
      const entry = this._memoryEntries.get(type)!;
      entry.setValue(value);
    } else {
      this._memoryEntries.set(type, new MockMemoryEntry(type, value));
    }
  }
}

/**
 * Simple mock memory entry for testing (legacy fallback).
 */
class MockMemoryEntry<T extends string, V> {
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
