import { BlockLifecycleOptions, IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../core/models/BlockKey';
import { NextBlockLogger } from './NextBlockLogger';
import { ExecutionTracker } from './ExecutionTracker';
import { IScriptRuntime } from './IScriptRuntime';
import { BlockWrapperFactory, DebugLogEvent, IRuntimeOptions } from './IRuntimeOptions';
import { TestableBlock, TestableBlockConfig } from './testing/TestableBlock';
import { IRuntimeAction } from './IRuntimeAction';
import { RuntimeTimestamp } from './RuntimeClock';

const MAX_STACK_DEPTH = 10;

export interface RuntimeStackTracker {
  getActiveSpanId?: (blockKey: string) => string | null | undefined;
  startSpan?: (block: IRuntimeBlock, parentSpanId: string | null) => void;
  endSpan?: (blockKey: string) => void;
  recordLegacyMetric?: (blockKey: string, metric: unknown) => void;
}

export interface RuntimeStackWrapper {
  wrap?: (block: IRuntimeBlock, parent?: IRuntimeBlock) => IRuntimeBlock;
  cleanup?: (block: IRuntimeBlock) => void;
}

export interface RuntimeStackLogger {
  debug?: (message: string, details?: Record<string, unknown>) => void;
  error?: (message: string, error: unknown, details?: Record<string, unknown>) => void;
}

export interface RuntimeStackHooks {
  onBeforePush?: (block: IRuntimeBlock, parent?: IRuntimeBlock) => void;
  onAfterPush?: (block: IRuntimeBlock, parent?: IRuntimeBlock) => void;
  onBeforePop?: (block: IRuntimeBlock | undefined) => void;
  onAfterPop?: (block: IRuntimeBlock | undefined) => void;
  unregisterByOwner?: (ownerKey: string) => void;
}

export interface RuntimeStackOptions extends IRuntimeOptions {
  tracker?: RuntimeStackTracker;
  wrapper?: RuntimeStackWrapper;
  logger?: RuntimeStackLogger;
  hooks?: RuntimeStackHooks;
}

const noopTracker: RuntimeStackTracker = {
  getActiveSpanId: () => null,
  startSpan: () => {},
  endSpan: () => {},
  recordLegacyMetric: () => {},
};

const noopWrapper: RuntimeStackWrapper = {
  wrap: block => block,
  cleanup: () => {},
};

const noopLogger: RuntimeStackLogger = {
  debug: () => {},
  error: () => {},
};

const noopHooks: RuntimeStackHooks = {
  onBeforePush: () => {},
  onAfterPush: () => {},
  onBeforePop: () => {},
  onAfterPop: () => {},
  unregisterByOwner: () => {},
};

/**
 * Default block wrapper factory that uses TestableBlock in spy mode.
 */
const defaultBlockWrapperFactory: BlockWrapperFactory = (
  block: IRuntimeBlock,
  config?: TestableBlockConfig
): IRuntimeBlock => {
  return new TestableBlock(block, {
    testId: config?.testId ?? `debug-${block.key.toString()}`,
    labelOverride: config?.labelOverride,
    mountMode: config?.mountMode ?? 'spy',
    nextMode: config?.nextMode ?? 'spy',
    unmountMode: config?.unmountMode ?? 'spy',
    disposeMode: config?.disposeMode ?? 'spy',
    mountOverride: config?.mountOverride,
    nextOverride: config?.nextOverride,
    unmountOverride: config?.unmountOverride,
    disposeOverride: config?.disposeOverride,
  });
};

/**
 * Unified runtime stack with lifecycle orchestration, execution tracking, and optional debug wrapping.
 *
 * Responsibilities:
 * - Validate push/pop operations with depth limits
 * - Track execution spans via injected tracker
 * - Orchestrate lifecycle on pop (unmount → pop/end span → dispose → context.release → unregister handlers → parent.next)
 * - Invoke injected instrumentation (hooks, tracker, wrapper, logger) with safe no-op defaults
 * - Optionally wrap blocks with TestableBlock for debug/inspection
 */
export class RuntimeStack {
  private readonly _blocks: IRuntimeBlock[] = [];
  private readonly _wrappedBlocks: Map<string, TestableBlock> = new Map();
  private readonly _wrapperFactory: BlockWrapperFactory;
  private readonly _defaultConfig: Partial<TestableBlockConfig>;
  private readonly _onDebugLog?: (event: DebugLogEvent) => void;
  private readonly tracker: RuntimeStackTracker;
  private readonly wrapper: RuntimeStackWrapper;
  private readonly logger: RuntimeStackLogger;
  private readonly hooks: RuntimeStackHooks;
  private readonly options: RuntimeStackOptions;

  constructor(
    private readonly runtime: IScriptRuntime,
    tracker: ExecutionTracker,
    options: RuntimeStackOptions = {}
  ) {
    this.options = options;
    this._wrapperFactory = options.blockWrapperFactory ?? defaultBlockWrapperFactory;
    this._defaultConfig = options.defaultTestableConfig ?? {};
    this._onDebugLog = options.onDebugLog;

    this.tracker = options.tracker ?? tracker ?? noopTracker;
    this.wrapper = options.wrapper ?? this.createDefaultWrapper();
    this.logger = options.logger ?? noopLogger;
    this.hooks = { ...noopHooks, ...options.hooks };

    if (options.debugMode || options.enableLogging) {
      NextBlockLogger.setEnabled(true);
    }
  }

  /** Whether debug mode is currently active */
  get isDebugMode(): boolean {
    return this.options.debugMode ?? false;
  }

  /** Top-first view of blocks */
  public get blocks(): readonly IRuntimeBlock[] {
    return [...this._blocks].reverse();
  }

  public get blocksTopFirst(): readonly IRuntimeBlock[] {
    return this.blocks;
  }

  public get blocksBottomFirst(): readonly IRuntimeBlock[] {
    return [...this._blocks];
  }

  public get keys(): BlockKey[] {
    return [...this._blocks].reverse().map(b => b.key);
  }

  public get current(): IRuntimeBlock | undefined {
    if (this._blocks.length === 0) {
      return undefined;
    }
    return this._blocks[this._blocks.length - 1];
  }

  /** Get all wrapped TestableBlock instances for inspection (debug mode only). */
  get wrappedBlocks(): ReadonlyMap<string, TestableBlock> {
    return this._wrappedBlocks;
  }

  getWrappedBlock(blockKey: string): TestableBlock | undefined {
    return this._wrappedBlocks.get(blockKey);
  }

  getAllCalls(): Array<{ blockKey: string; calls: ReadonlyArray<any> }> {
    const result: Array<{ blockKey: string; calls: ReadonlyArray<any> }> = [];
    for (const [key, block] of this._wrappedBlocks) {
      result.push({ blockKey: key, calls: block.calls });
    }
    return result;
  }

  clearAllCalls(): void {
    for (const block of this._wrappedBlocks.values()) {
      block.clearCalls();
    }
  }

  public push(block: IRuntimeBlock, options: BlockLifecycleOptions = {}): void {
    this.validateBlock(block);

    const parentBlock = this.current;
    this.safeCall(() => this.hooks.onBeforePush?.(block, parentBlock), 'hooks.onBeforePush', {
      blockKey: block.key.toString(),
      parentKey: parentBlock?.key.toString(),
    });

    const parentSpanId = parentBlock
      ? this.tracker.getActiveSpanId?.(parentBlock.key.toString()) ?? null
      : null;

    this.safeCall(() => this.tracker.startSpan?.(block, parentSpanId), 'tracker.startSpan', {
      blockKey: block.key.toString(),
      parentKey: parentBlock?.key.toString(),
      parentSpanId,
    });

    this.recordLegacyMetric(block);

    const wrappedBlock = this.wrapBlock(block, parentBlock);

    const startTime = this.getTimestamp(options.startTime);
    this.setStartTime(wrappedBlock, startTime);

    if (typeof (wrappedBlock as any).setRuntime === 'function') {
      (wrappedBlock as any).setRuntime(this.runtime);
    }

    const depthBefore = this._blocks.length;
    this._blocks.push(wrappedBlock);
    const depthAfter = this._blocks.length;

    NextBlockLogger.logStackPush(block.key.toString(), depthBefore, depthAfter);

    this._logDebugEvent({
      type: 'stack-push',
      timestamp: Date.now(),
      blockKey: block.key.toString(),
      blockType: block.blockType,
      details: {
        stackDepth: this._blocks.length,
        isWrapped: this.isDebugMode && !(block instanceof TestableBlock),
      },
    });

    this.safeCall(() => this.logger.debug?.('runtime-stack.push', {
      blockKey: block.key.toString(),
      parentKey: parentBlock?.key.toString(),
      stackDepth: depthAfter,
    }), 'logger.debug', {
      blockKey: block.key.toString(),
    });

    this.safeCall(() => this.hooks.onAfterPush?.(wrappedBlock, parentBlock), 'hooks.onAfterPush', {
      blockKey: block.key.toString(),
      parentKey: parentBlock?.key.toString(),
    });
  }

  public pop(options: BlockLifecycleOptions = {}): IRuntimeBlock | undefined {
    const currentBlock = this.current;
    if (!currentBlock) {
      return undefined;
    }

    const completedAt = this.getTimestamp(options.completedAt);
    const lifecycleOptions: BlockLifecycleOptions = { ...options, completedAt };
    this.setCompletedTime(currentBlock, completedAt);

    this.safeCall(() => this.hooks.onBeforePop?.(currentBlock), 'hooks.onBeforePop', {
      blockKey: currentBlock.key.toString(),
    });

    const unmountActions =
      this.safeCall(() => currentBlock.unmount(this.runtime, lifecycleOptions) ?? [], 'block.unmount', {
        blockKey: currentBlock.key.toString(),
      }) ?? [];

    const popped = this.popRaw();
    if (!popped) {
      return undefined;
    }

    const ownerKey = this.resolveOwnerKey(popped);
    const wasWrapped = this._wrappedBlocks.has(ownerKey) || this._wrappedBlocks.has(popped.key.toString());

    this.safeCall(() => this.tracker.endSpan?.(ownerKey), 'tracker.endSpan', {
      blockKey: ownerKey,
    });

    this.safeCall(() => popped.dispose(this.runtime), 'block.dispose', {
      blockKey: ownerKey,
    });

    this.safeCall(() => popped.context?.release?.(), 'context.release', {
      blockKey: ownerKey,
    });

    this.safeCall(() => this.hooks.unregisterByOwner?.(ownerKey), 'hooks.unregisterByOwner', {
      blockKey: ownerKey,
    });

    this.safeCall(() => this.wrapper.cleanup?.(popped), 'wrapper.cleanup', {
      blockKey: ownerKey,
    });

    this._logDebugEvent({
      type: 'stack-pop',
      timestamp: Date.now(),
      blockKey: popped.key.toString(),
      blockType: popped.blockType,
      details: {
        stackDepth: this._blocks.length,
        wasWrapped,
      },
    });

    this.safeCall(() => this.logger.debug?.('runtime-stack.pop', {
      blockKey: ownerKey,
      stackDepth: this._blocks.length,
    }), 'logger.debug', {
      blockKey: ownerKey,
    });

    this.runActions(unmountActions, 'block.unmount.actions', {
      blockKey: ownerKey,
    });

    const parent = this.current;
    if (parent) {
      const nextActions =
        this.safeCall(() => parent.next(this.runtime, lifecycleOptions) ?? [], 'parent.next', {
          parentKey: parent.key.toString(),
          childKey: ownerKey,
        }) ?? [];

      this.runActions(nextActions, 'parent.next.actions', {
        parentKey: parent.key.toString(),
        childKey: ownerKey,
      });
    }

    this.safeCall(() => this.hooks.onAfterPop?.(popped), 'hooks.onAfterPop', {
      blockKey: ownerKey,
    });

    return popped;
  }

  public setBlocks(blocks: IRuntimeBlock[]): void {
    this._blocks.length = 0;
    this._blocks.push(...blocks);
  }

  public getParentBlocks(): IRuntimeBlock[] {
    if (this._blocks.length <= 1) {
      return [];
    }
    return [...this._blocks].slice(0, -1);
  }

  public graph(): IRuntimeBlock[] {
    return [...this._blocks].reverse();
  }

  cleanupWrappedBlock(blockKey: string): void {
    this._wrappedBlocks.delete(blockKey);
    this._wrappedBlocks.delete(blockKey.replace('debug-', ''));
  }

  private validateBlock(block: IRuntimeBlock): void {
    if (block === null || block === undefined) {
      throw new TypeError('Block cannot be null or undefined');
    }
    if (!block.key) {
      throw new TypeError('Block must have a valid key');
    }
    if (!block.sourceIds || !Array.isArray(block.sourceIds)) {
      throw new TypeError(`Block must have a valid sourceIds array (block key: ${block.key})`);
    }
    if (this._blocks.length >= MAX_STACK_DEPTH) {
      throw new TypeError(
        `Stack overflow: maximum depth (${MAX_STACK_DEPTH}) exceeded (current depth: ${this._blocks.length}, block: ${block.key})`
      );
    }
  }

  private wrapBlock(block: IRuntimeBlock, parentBlock: IRuntimeBlock | undefined): IRuntimeBlock {
    const wrapped = this.safeCall(() => this.wrapper.wrap?.(block, parentBlock), 'wrapper.wrap', {
      blockKey: block.key.toString(),
      parentKey: parentBlock?.key.toString(),
    });
    return wrapped ?? block;
  }

  private setStartTime(block: IRuntimeBlock, startTime: RuntimeTimestamp): void {
    const target = block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
    target.executionTiming = { ...(target.executionTiming ?? {}), startTime };
  }

  private setCompletedTime(block: IRuntimeBlock, completedAt: RuntimeTimestamp): void {
    const target = block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
    target.executionTiming = { ...(target.executionTiming ?? {}), completedAt };
  }

  private getTimestamp(seed?: RuntimeTimestamp): RuntimeTimestamp {
    const fallback = (): RuntimeTimestamp => ({
      wallTimeMs: seed?.wallTimeMs ?? Date.now(),
      monotonicTimeMs: seed?.monotonicTimeMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    });

    const capture = (this.runtime as any)?.clock?.captureTimestamp;
    if (typeof capture === 'function') {
      try {
        return capture(seed) ?? fallback();
      } catch {
        return fallback();
      }
    }

    return fallback();
  }

  private recordLegacyMetric(block: IRuntimeBlock): void {
    if (!block.compiledMetrics && !(block.blockType === 'Effort' && block.label)) {
      return;
    }

    if (block.compiledMetrics) {
      this.tracker.recordLegacyMetric?.(block.key.toString(), block.compiledMetrics);
      return;
    }

    const label = block.label;
    if (!label) {
      return;
    }
    const match = label.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const reps = parseInt(match[1], 10);
      const exerciseName = match[2].trim();
      if (!isNaN(reps)) {
        this.tracker.recordLegacyMetric?.(block.key.toString(), {
          exerciseId: exerciseName,
          values: [{ type: 'repetitions', value: reps, unit: 'reps' }],
          timeSpans: [],
        });
      }
    } else {
      this.tracker.recordLegacyMetric?.(block.key.toString(), {
        exerciseId: label,
        values: [],
        timeSpans: [],
      });
    }
  }

  private resolveOwnerKey(block: IRuntimeBlock): string {
    if (block instanceof TestableBlock) {
      return block.wrapped.key.toString();
    }
    return block.key.toString();
  }

  private createDefaultWrapper(): RuntimeStackWrapper {
    if (!this.options.debugMode) {
      return noopWrapper;
    }

    return {
      wrap: (block: IRuntimeBlock) => {
        if (block instanceof TestableBlock) {
          this._wrappedBlocks.set(block.key.toString(), block);
          return block;
        }

        const config: TestableBlockConfig = {
          ...this._defaultConfig,
          testId: this._defaultConfig.testId ?? `debug-${block.key.toString()}`,
        };

        const wrapped = this._wrapperFactory(block, config);
        this._wrappedBlocks.set(block.key.toString(), wrapped as TestableBlock);

        this._logDebugEvent({
          type: 'block-wrapped',
          timestamp: Date.now(),
          blockKey: block.key.toString(),
          blockType: block.blockType,
          details: {
            wrapperTestId: (wrapped as TestableBlock).testId,
            config,
          },
        });

        NextBlockLogger.logPushBlockStart(block.key.toString(), this._blocks.length);
        return wrapped;
      },
      cleanup: (block: IRuntimeBlock) => {
        const ownerKey = this.resolveOwnerKey(block);
        this.cleanupWrappedBlock(ownerKey);
        this.cleanupWrappedBlock(block.key.toString());
      },
    };
  }

  private popRaw(): IRuntimeBlock | undefined {
    return this._blocks.pop();
  }

  private runActions(actions: IRuntimeAction[], stage: string, context: Record<string, unknown>): void {
    for (const action of actions) {
      this.safeCall(() => action.do(this.runtime), stage, context);
    }
  }

  private safeCall<T>(fn: () => T, stage: string, details?: Record<string, unknown>): T | undefined {
    try {
      return fn();
    } catch (error) {
      this.logger.error?.(stage, error, details);
      return undefined;
    }
  }

  private _logDebugEvent(event: DebugLogEvent): void {
    if (this._onDebugLog) {
      this._onDebugLog(event);
    }

    if ((NextBlockLogger as any).enabled) {
      const prefix = `🔍 DEBUG | ${event.type}`;
      console.log(prefix, {
        blockKey: event.blockKey,
        blockType: event.blockType,
        ...event.details,
      });
    }
  }
}
