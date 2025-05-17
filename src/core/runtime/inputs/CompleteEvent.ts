import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { StopTimerAction } from "../actions/StopTimerAction";
import { EventHandler } from "../EventHandler";
import { StopEvent } from "./StopEvent";
import { NextStatementAction } from "../actions/PopBlockAction";
import { BlockContext } from "../blocks/BlockContext";

export class CompleteEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'complete';
}

export class CompleteHandler extends EventHandler {
    protected eventType: string = 'complete';
  
    protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {       
      const block = runtime.trace.current();
      if (!block) {
        console.warn("CompleteHandler: No current block found.");
        return [];
      }
      const context: BlockContext = block.getContext();
     if (!context) {
        console.warn(`CompleteHandler: No context found for block ${block.blockKey}.`);
        return [];
      }
      return [
        new StopTimerAction(new StopEvent(event.timestamp), context),        
        new NextStatementAction(),      
      ];
    }
  }
