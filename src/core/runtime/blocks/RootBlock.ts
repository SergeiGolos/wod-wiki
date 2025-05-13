import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  IdleStatementNode,
  PrecompiledNode,
  ResultSpan,
  RuntimeMetric,
  ZeroIndexMeta,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import {
  PushIdleBlockAction,
  PushEndBlockAction,
  PushStatementAction,
} from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { WriteResultAction } from "../outputs/WriteResultAction";

/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor() {
    super([new IdleStatementNode({
      id: -1,
      children: [],
      meta: new ZeroIndexMeta(),
      fragments: []
    })]);
  }

  enter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    console.log(`+=== enter : ${this.blockKey}`);
    const children = this.sources
      .filter((s) => s.parent === undefined)
      .map((s) => s.id);
    this.sources[0].children = [...children];

    return [new PushIdleBlockAction()];
  }

  next(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.index += 1;
    if (this.index > this.sources.length) {
      return [new PopBlockAction()];
    }

    const statement = this.sources[this.index-1];
    return [new PushStatementAction([statement])];
  }

  leave(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    
    // Create a result span to report completion of the entire workout
    const resultSpan = new ResultSpan();
    resultSpan.blockKey = this.blockKey;
    resultSpan.index = this.index;
    resultSpan.stack = [];
    resultSpan.start = runtime.history[0] ?? { name: "start", timestamp: new Date() };
    resultSpan.stop = { timestamp: new Date(), name: "root_complete" };
    resultSpan.label = "Workout Complete";    
    resultSpan.metrics = this.sources[0].metrics();
    
    return [
      new WriteResultAction(resultSpan),
      new PushEndBlockAction()
    ];
  }
}
