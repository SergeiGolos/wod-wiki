import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/types/JitStatement";
import { IdleStatementNode } from "@/core/IdleStatementNode";
import { ZeroIndexMeta } from "@/core/ZeroIndexMeta";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonAction } from "../outputs/SetButtonAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons"; 
import { ResetHandler } from "../inputs/ResetEvent";

export class DoneRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */    constructor(sources: JitStatement[] = [new IdleStatementNode({
    id: -1,
    children: [],
    meta: new ZeroIndexMeta(),
    fragments: []
  })]) {
    // TODO: During migration, pass empty metrics and use sources as legacy sources
    // In Phase 4, this will be updated to receive pre-compiled metrics from JIT
    super([], sources);
    
    this.handlers = [
      new SaveHandler(),
      new ResetHandler()
    ];
  }

  /**
   * Implementation of the onEnter hook method from the template pattern
   */  protected onEnter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    return [  
      new SetButtonAction("system", [resetButton, saveButton]),
      new SetButtonAction("runtime", []),      
    ];
  }

  /**
   * Implementation of the onLeave hook method from the template pattern
   */
  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
      return [];
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