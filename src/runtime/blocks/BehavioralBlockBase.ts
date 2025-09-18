import { BlockKey } from "../../BlockKey";
import { IRuntimeLog } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IBehavior } from "../behaviors/IBehavior";
import { runOnNext, runOnPop, runOnPush } from "../behaviors/runBehaviorHooks";

/**
 * Minimal base runtime block that delegates lifecycle hooks to attached behaviors.
 * This aligns with the IRuntimeBlock contract that each method returns IRuntimeLog[].
 */
export class BehavioralBlockBase implements IRuntimeBlock {
  readonly key: BlockKey;
  readonly sourceId: string[];

  constructor(key: BlockKey, sourceId: string[] = [], public readonly behaviors: IBehavior[] = []) {
    this.key = key;
    this.sourceId = sourceId;
  }

  /** Optional accessor used by helpers to discover behaviors */
  getBehaviors(): IBehavior[] { return this.behaviors; }

  push(runtime: IScriptRuntime): IRuntimeLog[] {
    return runOnPush(runtime, this);
  }

  next(runtime: IScriptRuntime): IRuntimeLog[] {
    return runOnNext(runtime, this);
  }

  pop(runtime: IScriptRuntime): IRuntimeLog[] {
    return runOnPop(runtime, this);
  }
}
