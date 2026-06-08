import { OutputEmitter } from './OutputEmitter';
import { StackEventBridge } from './pipeline/StackEventBridge';
import { TrackerBridge } from './pipeline/TrackerBridge';
import { PushBlockStage } from './pipeline/PushBlockStage';
import { PopBlockStage } from './pipeline/PopBlockStage';
import type { IRuntimePipeline, PushBlockResult, PopBlockResult } from './contracts/IRuntimePipeline';
import type { IRuntimeBlock, BlockLifecycleOptions } from './contracts/IRuntimeBlock';
import type { StackEvent, StackObserver, StackSnapshot, Unsubscribe } from './contracts/IRuntimeStack';
import type { IRuntimeStack } from './contracts/IRuntimeStack';
import type { IRuntimeClock } from './contracts/IRuntimeClock';
import type { TrackerListener } from './contracts/IScriptRuntime';
import type { RuntimeStackTracker, RuntimeStackWrapper, RuntimeStackLogger, RuntimeStackHooks } from './contracts/IRuntimeOptions';

export interface RuntimePipelineConfig {
  output: OutputEmitter;
  stack: IRuntimeStack;
  clock: IRuntimeClock;
  tracker?: RuntimeStackTracker;
  wrapper?: RuntimeStackWrapper;
  logger?: RuntimeStackLogger;
  hooks?: RuntimeStackHooks;
}

export class RuntimePipeline implements IRuntimePipeline {
  private readonly _stack: IRuntimeStack;
  private readonly _clock: IRuntimeClock;
  private readonly _stackObservers = new Set<StackObserver>();
  private readonly _stackEventBridge: StackEventBridge;
  private readonly _trackerBridge: TrackerBridge;
  private readonly _pushStage: PushBlockStage;
  private readonly _popStage: PopBlockStage;
  private readonly _stackSubscriptionUnsub: (() => void) | null = null;

  constructor(config: RuntimePipelineConfig) {
    this._stack = config.stack;
    this._clock = config.clock;

    this._stackEventBridge = new StackEventBridge(
      config.output,
      this._stackObservers,
      config.clock
    );

    this._trackerBridge = new TrackerBridge(config.tracker);

    this._pushStage = new PushBlockStage(
      config.output,
      config.tracker,
      config.wrapper,
      config.logger,
      config.hooks,
      config.clock
    );

    this._popStage = new PopBlockStage(
      config.tracker,
      config.wrapper,
      config.logger,
      config.hooks
    );

    this._stackSubscriptionUnsub = config.stack.subscribe((event) => {
      this._stackEventBridge.relay(event);
    });
  }

  preparePush(block: IRuntimeBlock, lifecycle?: BlockLifecycleOptions): PushBlockResult {
    const parentBlock = this._stack.current;
    return this._pushStage.prepare(block, parentBlock, this._stack.count, lifecycle);
  }

  preparePop(lifecycle?: BlockLifecycleOptions): PopBlockResult | undefined {
    const currentBlock = this._stack.current;
    if (!currentBlock) {
      return undefined;
    }
    return this._popStage.prepare(currentBlock, () => this._stack.count, lifecycle);
  }

  relayStackEvent(event: StackEvent): void {
    this._stackEventBridge.relay(event);
  }

  notifySettled(): void {
    this._stackEventBridge.notifySettled(this._stack.blocks);
  }

  subscribeToStack(observer: StackObserver): Unsubscribe {
    this._stackObservers.add(observer);

    const initialSnapshot: StackSnapshot = {
      type: 'initial',
      blocks: this._stack.blocks,
      depth: this._stack.count,
      clockTime: this._clock.currentDate,
    };

    setTimeout(() => {
      if (this._stackObservers.has(observer)) {
        observer(initialSnapshot);
      }
    }, 0);

    return () => {
      this._stackObservers.delete(observer);
    };
  }

  subscribeToTracker(listener: TrackerListener): Unsubscribe {
    return this._trackerBridge.subscribe(listener);
  }

  dispose(): void {
    this._stackSubscriptionUnsub?.();
    this._trackerBridge.dispose();
  }
}
