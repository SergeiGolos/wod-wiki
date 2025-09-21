import { BlockKey } from "../../BlockKey";
import { IRuntimeLog } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";
import { IBehavior } from "../IBehavior";
import { runOnNext, runOnPop, runOnPush } from "../runBehaviorHooks";
import { IEventHandler } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeMetric } from "../RuntimeMetric";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";

/**
 * Base runtime block with memory that composes behaviors.
 * Provides defaults for spans/handlers and delegates lifecycle to IBehavior[].
 */
export class BehavioralMemoryBlockBase extends RuntimeBlockWithMemoryBase {
  constructor(key: BlockKey, initialMetrics: RuntimeMetric[] = [], public readonly behaviors: IBehavior[] = []) {
    super(key, initialMetrics);
  }

  /** Optional accessor used by helpers to discover behaviors */
  getBehaviors(): IBehavior[] { return this.behaviors; }

  // Subclasses may override to add extra allocations; default no-op
  protected initializeMemory(): void {}

  // Default spans builder – behaviors may also allocate their own span-root references
  protected createSpansBuilder(): IResultSpanBuilder {
    return {
      create: () => ({ blockKey: this.key.toString(), timeSpan: { blockKey: this.key.toString() }, metrics: [], duration: 0 }),
      getSpans: () => [],
      close: () => void 0,
      start: () => void 0,
      stop: () => void 0,
    };
  }

  // Default: no built-in handlers; subclasses can override
  protected createInitialHandlers(): IEventHandler[] { return []; }

  protected onPush(runtime: IScriptRuntime): IRuntimeLog[] { return runOnPush(runtime, this); }
  protected onNext(runtime: IScriptRuntime): IRuntimeLog[] { return runOnNext(runtime, this); }
  protected onPop(runtime: IScriptRuntime): IRuntimeLog[] { return runOnPop(runtime, this); }
}
