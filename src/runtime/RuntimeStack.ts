import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../core/models/BlockKey';
import { NextBlockLogger } from './NextBlockLogger';
import { ExecutionTracker } from './ExecutionTracker';
import { IScriptRuntime } from './IScriptRuntime';
import { BlockWrapperFactory, DebugLogEvent, IRuntimeOptions } from './IRuntimeOptions';
import { TestableBlock, TestableBlockConfig } from './testing/TestableBlock';
import { IRuntimeAction } from './IRuntimeAction';

const MAX_STACK_DEPTH = 10;

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
 * Unified runtime stack with lifecycle, execution tracking, and optional debug wrapping.
 *
 * Responsibilities:
 * - Validate push/pop operations with depth limits
 * - Track execution spans via ExecutionTracker
 * - Manage lifecycle popWithLifecycle (unmount → pop/end span → dispose → context.release → unregister handlers → parent.next)
 * - Optionally wrap blocks with TestableBlock for debug/inspection
 */
export class RuntimeStack {
  private readonly _blocks: IRuntimeBlock[] = [];
  private readonly _wrappedBlocks: Map<string, TestableBlock> = new Map();
  private readonly _wrapperFactory: BlockWrapperFactory;
  private readonly _defaultConfig: Partial<TestableBlockConfig>;
  private readonly _onDebugLog?: (event: DebugLogEvent) => void;

  constructor(
    private readonly runtime: IScriptRuntime,
    private readonly tracker: ExecutionTracker,
    private readonly options: IRuntimeOptions = {}
  ) {
    this._wrapperFactory = options.blockWrapperFactory ?? defaultBlockWrapperFactory;
    this._defaultConfig = options.defaultTestableConfig ?? {};
    this._onDebugLog = options.onDebugLog;

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

  public push(block: IRuntimeBlock): void {
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

    const parentBlock = this.current;
    let parentSpanId: string | null = null;

    if (parentBlock) {
      parentSpanId = this.tracker.getActiveSpanId(parentBlock.key.toString());
    }

    let blockToPush = block;
    const originalKey = block.key.toString();

    if (this.isDebugMode) {
      if (!(block instanceof TestableBlock)) {
        const config: TestableBlockConfig = {
          ...this._defaultConfig,
          testId: this._defaultConfig.testId ?? `debug-${originalKey}`,
        };
        blockToPush = this._wrapperFactory(block, config);
        this._wrappedBlocks.set(originalKey, blockToPush as TestableBlock);

        this._logDebugEvent({
          type: 'block-wrapped',
          timestamp: Date.now(),
          blockKey: originalKey,
          blockType: block.blockType,
          details: {
            wrapperTestId: (blockToPush as TestableBlock).testId,
            config,
          },
        });

        NextBlockLogger.logPushBlockStart(originalKey, this._blocks.length);
      }
    }

    this.tracker.startSpan(block, parentSpanId);

    if (block.compiledMetrics) {
      this.tracker.recordLegacyMetric(block.key.toString(), block.compiledMetrics);
    } else if (block.blockType === 'Effort' && block.label) {
      const label = block.label;
      const match = label.match(/^(\d+)\s+(.+)$/);
      if (match) {
        const reps = parseInt(match[1], 10);
        const exerciseName = match[2].trim();
        if (!isNaN(reps)) {
          this.tracker.recordLegacyMetric(block.key.toString(), {
            exerciseId: exerciseName,
            values: [{ type: 'repetitions', value: reps, unit: 'reps' }],
            timeSpans: [],
          });
        }
      } else {
        this.tracker.recordLegacyMetric(block.key.toString(), {
          exerciseId: label,
          values: [],
          timeSpans: [],
        });
      }
    }

    if (typeof (blockToPush as any).setRuntime === 'function') {
      (blockToPush as any).setRuntime(this.runtime);
    }

    const depthBefore = this._blocks.length;
    this._blocks.push(blockToPush);
    const depthAfter = this._blocks.length;

    NextBlockLogger.logStackPush(originalKey, depthBefore, depthAfter);

    this._logDebugEvent({
      type: 'stack-push',
      timestamp: Date.now(),
      blockKey: originalKey,
      blockType: block.blockType,
      details: {
        stackDepth: this._blocks.length,
        isWrapped: this.isDebugMode && !(block instanceof TestableBlock),
      },
    });
  }

  public pop(): IRuntimeBlock | undefined {
    if (this._blocks.length === 0) {
      return undefined;
    }

    const popped = this._blocks.pop();

    if (popped) {
      this.tracker.endSpan(popped.key.toString());

      this._logDebugEvent({
        type: 'stack-pop',
        timestamp: Date.now(),
        blockKey: popped.key.toString(),
        blockType: popped.blockType,
        details: {
          stackDepth: this._blocks.length,
          wasWrapped: this._wrappedBlocks.has(popped.key.toString()),
        },
      });
    }

    return popped;
  }

  /**
   * Pops the current block and performs full lifecycle cleanup:
   * unmount -> pop (ends span) -> dispose -> context.release -> unregister handlers -> parent.next
   */
  popWithLifecycle(): void {
    const currentBlock = this.current;
    if (!currentBlock) {
      return;
    }

    let unmountActions: IRuntimeAction[] = [];
    try {
      unmountActions = currentBlock.unmount(this.runtime);
    } catch (error) {
      console.error('Error during block unmount', error);
    }

    const popped = this.pop();

    if (popped) {
      const ownerKey = popped instanceof TestableBlock ? popped.wrapped.key.toString() : popped.key.toString();

      try {
        popped.dispose(this.runtime);
      } catch (error) {
        console.error('Error disposing block', error);
      }

      try {
        if (popped.context && typeof popped.context.release === 'function') {
          popped.context.release();
        }
      } catch (error) {
        console.error('Error releasing block context', error);
      }

      try {
        this.runtime.eventBus?.unregisterByOwner?.(ownerKey);
      } catch (error) {
        console.error('Error unregistering event handlers for block', error);
      }

      this.cleanupWrappedBlock(ownerKey);
      this.cleanupWrappedBlock(popped.key.toString());
    }

    for (const action of unmountActions) {
      try {
        action.do(this.runtime);
      } catch (error) {
        console.error('Error running unmount action', error);
      }
    }

    const parent = this.current;
    if (parent) {
      const nextActions = parent.next(this.runtime);
      for (const action of nextActions) {
        try {
          action.do(this.runtime);
        } catch (error) {
          console.error('Error running parent next action', error);
        }
      }
    }
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
