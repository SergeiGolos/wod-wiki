import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IdleStatementNode } from "@/core/IdleStatementNode";
import { ZeroIndexMeta } from "@/core/ZeroIndexMeta";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons"; 
import { ResetHandler } from "../inputs/ResetEvent";
import { WriteResultAction } from "../outputs/WriteResultAction";

export class DoneRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */  
  constructor(sources: JitStatement[] = [new IdleStatementNode({
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
   * Implementation of the onEnter hook method from the template pattern
   */
  protected onEnter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    return [  
      new SetButtonsAction([resetButton, saveButton], "system"),
      new SetButtonsAction([], "runtime"),      
    ];
  }

  /**
   * Implementation of the onLeave hook method from the template pattern
   */
  protected onLeave(runtime: ITimerRuntime): IRuntimeAction[] {
    const block = runtime.trace.current();    
    if (block && block.spans && block.spans.length > 0) {
      return [new WriteResultAction(block.spans)];
    } else {
      return [];
    }
  }

  /**
   * Implementation of the onNext hook method from the template pattern
   */
  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    // No action needed for next in done block
    return [];
  }

  /**
   * Implementation of the onBlockStart hook method from the template pattern
   */
  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  /**
   * Implementation of the onBlockStop hook method from the template pattern
   */
  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}