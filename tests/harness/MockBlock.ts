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

  allocate<T>(_type?: string, _initialValue?: T, _visibility?: string): IMemoryReference {
    return {
      id: `mock-ref-${Math.random().toString(36).slice(2)}`,
      type: _type ?? 'mock',
      ownerId: this.ownerId,
      visibility: (_visibility ?? 'private') as 'public' | 'private' | 'inherited',
      value: () => _initialValue,
      subscriptions: []
    };
  }

  get<T>(_type?: string): T | undefined { return undefined; }
  getAll<T>(_type?: string): T[] { return []; }
  release(): void { this._released = true; }
  isReleased(): boolean { return this._released; }
  getOrCreateAnchor(): IMemoryReference { return this.allocate('anchor'); }
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
