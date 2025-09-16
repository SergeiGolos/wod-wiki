import { RuntimeBlockWithMemoryBase } from "./RuntimeBlockWithMemoryBase";
import { IRuntimeBehavior } from "./behaviors/IRuntimeBehavior";
import { IRuntimeEvent, EventHandler, HandlerResponse } from "./EventHandler";
import { IResultSpanBuilder } from "./ResultSpanBuilder";
import { RuntimeMetric } from "./RuntimeMetric";
import { BlockKey } from "../BlockKey";
import { IScriptRuntimeWithMemory } from "./IScriptRuntimeWithMemory";

/**
 * A runtime block that composes behaviors rather than implementing logic directly.
 * It adapts behavior onEvent responses to the runtime's action pipeline.
 */
export class BehavioralRuntimeBlock extends RuntimeBlockWithMemoryBase {
  constructor(key: BlockKey, metrics: RuntimeMetric[], private readonly behaviors: IRuntimeBehavior[]) {
    super(key, metrics);
  }

  // Ensure behaviors are attached when runtime is available
  setRuntime(runtime: IScriptRuntimeWithMemory): void {
    super.setRuntime(runtime);
    for (const b of this.behaviors) {
      b.onAttach(runtime, this.key.toString());
    }
  }

  protected initializeMemory(): void {
    // Behaviors may set up memory when attached/pushed
  }

  protected createSpansBuilder(): IResultSpanBuilder {
    // Reuse base minimal spans builder
    return {
      create: (_blockKey: string, _metrics: RuntimeMetric[]) => ({
        blockKey: this.key.toString(),
        timeSpan: {},
        metrics: this.getMetrics(),
        duration: 0,
      }),
      getSpans: () => [],
      close: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  protected createInitialHandlers(): EventHandler[] {
    // Bridge: wrap behaviors to EventHandlers so ScriptRuntimeWithMemory can dispatch.
    const self = this;
    return [
      {
        id: `BehaviorBridge:${this.key.toString()}`,
        name: `BehaviorBridge`,
        handleEvent(event: IRuntimeEvent, runtime: IScriptRuntimeWithMemory): HandlerResponse {
          // Fan-out to behaviors; collect first decisive response or merge actions
          const allActions: HandlerResponse["actions"] = [];
          for (const b of self.behaviors) {
            const resp = b.onEvent(event, runtime);
            if (resp?.handled) {
              allActions.push(...resp.actions);
              if (!resp.shouldContinue) {
                return { handled: true, shouldContinue: false, actions: allActions };
              }
            }
          }
          return allActions.length
            ? { handled: true, shouldContinue: true, actions: allActions }
            : { handled: false, shouldContinue: true, actions: [] };
        },
      } as EventHandler,
    ];
  }

  protected onPush(): IRuntimeEvent[] {
    for (const b of this.behaviors) {
      if (this.memory) b.onPush(this.memory);
    }
    return [];
  }

  protected onNext() {
    return undefined;
  }

  protected onPop(): void {
    for (const b of this.behaviors) {
      if (this.memory) b.onPop(this.memory);
    }
  }
}
