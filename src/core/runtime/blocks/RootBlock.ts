import {
  IRuntimeAction,
  ITimerRuntime,
  PrecompiledNode,
  ResultSpan,
  StatementNode,
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
import { StartTimerAction } from "../actions/StartTimerAction";
import { StartEvent } from "../inputs/StartEvent";

/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock {
  constructor(private nodes: PrecompiledNode[]) {
    super([new PrecompiledNode({
      id: -1,      
      children: [],
      fragments: [],
      parent: undefined,
      meta: new ZeroIndexMeta(),    
    })]);
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    const children = this.nodes
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
    if (this.ctx.index > this.nodes.length) {
      return [new PopBlockAction()];
    }

    const statement = this.nodes[this.ctx.index-1];
    return [ new PushStatementAction([statement], false)]
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result span to report the completion of this block using ResultBuilder
    const resultSpan = ResultSpan.fromBlock(this);      
    
    return [
      new WriteResultAction(resultSpan),
      new PushEndBlockAction()
    ];
  }
}
