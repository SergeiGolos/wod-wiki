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

  mount(_runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    this.executionTiming.startTime = options?.startTime ?? new Date();

    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onPush?.(this, options);
      if (result) actions.push(...result);
    }
    return actions;
  }

  next(_runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onNext?.(this, options);
      if (result) actions.push(...result);
    }
    return actions;
  }

  unmount(_runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    this.executionTiming.completedAt = options?.completedAt ?? new Date();

    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onPop?.(this, options);
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
}
