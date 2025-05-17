import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { endButton, resumeButton } from "@/components/buttons/timerButtons";
import { BlockContext } from "../blocks/BlockContext";

export class StopEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'stop';
}

export class StopHandler extends EventHandler {
  protected eventType: string = 'stop';

  protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {    
    const block = runtime.trace.current();
    if (!block) {      
      console.warn("StopHandler: No current block found.");
      return [];
    }
    const context: BlockContext = block.getContext(); 
    if (!context) {
      console.warn(`StopHandler: No context found for block ${block.blockKey}.`);
      return [];
    }
    return [
      new StopTimerAction(event, context),      
      new SetButtonsAction([endButton, resumeButton], "system"),
    ];
  }
}