import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { ZeroIndexMeta } from "@/core/ZeroIndexMeta";
import { RuntimeBlock } from "./RuntimeBlock";
import {
  PushStatementAction,
} from "../actions/PushStatementAction";
import { PushEndBlockAction } from "../actions/PushEndBlockAction";
import { PushIdleBlockAction } from "../actions/PushIdleBlockAction";
import { WriteResultAction } from "../outputs/WriteResultAction";
import { PopBlockAction } from "../actions/PopBlockAction";

/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock {
  index: number = -1;
  constructor(private nodes: JitStatement[]) {
    const children = nodes
      .filter((s) => s.parent === undefined)
      .map((s) => s.id);
    super([
      new JitStatement({
        id: -1,      
        children: [...children],
        fragments: [],
        parent: undefined,
        meta: new ZeroIndexMeta(),    
      })]);
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected onEnter(_runtime: ITimerRuntime): IRuntimeAction[] {                    
    return [new PushIdleBlockAction()];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.index++;    
    if (this.index >= this.nodes.length) {
      return [new PopBlockAction()];
    }

    return [ new PushStatementAction([this.nodes[this.index]])];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result span to report the completion of this block using ResultBuilder        
    return [
      new WriteResultAction(this.spans),
      new PushEndBlockAction()
    ];
  }
}
