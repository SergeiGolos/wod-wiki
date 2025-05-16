import { IRuntimeAction, IRuntimeBlock, ITimerRuntime, IdleStatementNode, PrecompiledNode, ResultSpan, ZeroIndexMeta } from "@/core/timer.types";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons";
import { SetTimeSpanAction } from "../outputs/SetTimeSpanAction";
import { ResetHandler } from "../inputs/ResetEvent";
import { WriteResultAction } from "../outputs/WriteResultAction";
// BlockContext is already imported and used via the parent class

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  constructor(sources: PrecompiledNode[] = [new IdleStatementNode({
    id: -1,
    children: [],
    meta: new ZeroIndexMeta(),
    fragments: []
  })]) {
    super(sources);
    
    this.handlers = [
      new SaveHandler(),
      new ResetHandler()
    ];
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    // Set up spans - runtime is already set in the parent class
    this.ctx.spans = [{
      start: runtime.history[0] ?? { name: "start", timestamp: new Date() },
      stop: runtime.history[runtime.history.length - 1] ?? { timestamp: new Date() , name: "stop" },
    }];
      
    return [  
      new SetButtonsAction([resetButton, saveButton], "system"),
      new SetButtonsAction([], "runtime"),      
      new SetTimeSpanAction(this.ctx.spans, "total"),
      new SetTimeSpanAction(this.ctx.spans, "primary")
    ];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result span to report the completion of this block using ResultBuilder
    // Use the enhanced BlockContext-based approach for events and metrics
    const resultSpan = ResultSpan.fromBlock(this);
    
    return [
      new WriteResultAction(resultSpan)
    ];
  }


  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    // No action needed for next in done block
    return [];
  }
}