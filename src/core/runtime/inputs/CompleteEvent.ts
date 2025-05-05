import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { StopTimerAction } from "../actions/StopTimerAction";
import { EventHandler } from "../EventHandler";
import { StopEvent } from "./StopEvent";
import { NextStatementAction } from "../actions/PopBlockAction";
import { StartTimerAction } from "../actions/StartTimerAction";
import { StartEvent } from "./StartEvent";

export class CompleteEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'complete';
}

export class CompleteLapHandler extends EventHandler {
    protected eventType: string = 'complete';
  
    protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {       
      return [
        new StopTimerAction(new StopEvent(event.timestamp)),        
        new NextStatementAction(),
        
        new StartTimerAction(new StartEvent(event.timestamp)),
      ];
    }
  }

export class CompleteHandler extends EventHandler {
    protected eventType: string = 'complete';
  
    protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {       
      return [
        new StopTimerAction(new StopEvent(event.timestamp)),        
        new NextStatementAction(),
        
        new StartTimerAction(new StartEvent(event.timestamp)),
      ];
    }
  }
