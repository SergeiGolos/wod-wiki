import {
  IRuntimeAction,
  ITimerRuntime,
  IdleStatementNode,
  PrecompiledNode,
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
import { ResultBuilder } from "../results/ResultBuilder";

/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock {
  constructor() {
    super([new IdleStatementNode({
      id: -1,
      children: [],
      meta: new ZeroIndexMeta(),
      fragments: []
    })]);
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    const children = this.sources
      .filter((s) => s.parent === undefined)
      .map((s) => s.id);
    this.sources[0].children = [...children];

    return [new PushIdleBlockAction()];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.ctx.index += 1;
    if (this.ctx.index > this.sources.length) {
      return [new PopBlockAction()];
    }

    const statement = this.sources[this.ctx.index-1];
    return [new PushStatementAction([statement])];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result span to report the completion of this block using ResultBuilder
    const resultSpan = ResultBuilder
      .forBlock(this)
      // For root block, use first and last events in history
      .withEvents(
        runtime.history[0] ?? { name: "start", timestamp: new Date() },
        runtime.history[runtime.history.length - 1] ?? { timestamp: new Date(), name: "stop" }
      )
      .build();
    
    return [
      new WriteResultAction(resultSpan),
      new PushEndBlockAction()
    ];
  }
}
