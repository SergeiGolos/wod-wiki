import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/types/JitStatement";
// import { ZeroIndexMeta } from "@/core/ZeroIndexMeta"; // Removed unused import
import { RuntimeBlock } from "./RuntimeBlock";
import {
  PushStatementAction,
} from "../actions/PushStatementAction";
import { PushEndBlockAction } from "../actions/PushEndBlockAction";
import { PushIdleBlockAction } from "../actions/PushIdleBlockAction";
import { ResetHandler } from "../inputs/ResetEvent";
import { EndHandler } from "../inputs/EndEvent";
import { PopBlockAction } from "../actions/PopBlockAction";
import { ZeroIndexMeta } from "@/core/ZeroIndexMeta";
import { RunHandler } from "../inputs/RunEvent";
import { SetButtonAction } from "../outputs/SetButtonAction";
import { startButton } from "@/components/buttons/timerButtons";

/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock {
  _sourceIndex: number = -1;
  constructor(private children: JitStatement[]) {
    const childrenIds = children      
      .map((s) => s.id);
    super([
      new JitStatement({
        id: -1,      
        children: [...childrenIds],
        fragments: [],
        parent: undefined,
        meta: new ZeroIndexMeta(),    
      })]);
      
      this.handlers.push(new RunHandler());
      this.handlers.push(new EndHandler());
      this.handlers.push(new ResetHandler());      
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {        
    this._sourceIndex = 0    
    this.getSpanBuilder().Create(this, []);
    return [
      new SetButtonAction("system",[startButton]),
      new PushIdleBlockAction()];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */  protected onNext(runtime: ITimerRuntime): IRuntimeAction[] {    
    const builder = this.getSpanBuilder();    
    if (this._sourceIndex >=  this.children.length) {
      builder.Stop();
      return [              
        //new SetSpanAction("total", builder.Current()),
        new PushEndBlockAction()];
    }  
    const groupStatements = this.nextChildStatements(runtime, this._sourceIndex);    
    if (groupStatements.length == 0) {              
      builder.Stop();
      return [
        //new SetSpanAction("total", builder.Current()),
        new PopBlockAction()];
    }
    
    if (builder.Spans.length == 0) {
        builder.Start();
    }
    this._sourceIndex += groupStatements.length;
    return [
      //new SetSpanAction("total", builder.Current()),
      new PushStatementAction(groupStatements)];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result span to report the completion of this block using ResultBuilder        
   
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
