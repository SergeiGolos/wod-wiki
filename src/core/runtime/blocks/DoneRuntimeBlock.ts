import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { IdleStatementNode } from "@/core/IdleStatementNode";
import { ZeroIndexMeta } from "@/core/ZeroIndexMeta";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons"; 
import { ResetHandler } from "../inputs/ResetEvent";
import { WriteResultAction } from "../outputs/WriteResultAction";

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
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
   * Implementation of the doEnter hook method from the template pattern
   */
  public enter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    return [  
      new SetButtonsAction([resetButton, saveButton], "system"),
      new SetButtonsAction([], "runtime"),      
    ];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  public leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    const block = _runtime.trace.current();    
    if (block && block.spans && block.spans.length > 0) {
      return [new WriteResultAction(block.spans)];
    } else {
      return [];
    }
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  public next(_runtime: ITimerRuntime): IRuntimeAction[] {
    // No action needed for next in done block
    return [];
  }
}