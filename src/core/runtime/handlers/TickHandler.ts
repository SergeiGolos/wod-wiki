import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode, TimerDisplayBag } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { SetDisplayAction } from "../actions/SetDisplayAction";
import { fragmentsTo } from "@/core/utils";
import { TimerFragment } from "@/core/fragments/TimerFragment";
import { RaiseEventAction, StopTimerAction } from "../actions/StopTimerAction";
import { NextStatementAction } from "../actions/NextStatementAction";

export class TickHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    let running = false;
    let elapsed = 0;
    let currentTime: Date| undefined;
    let initialTime: Date| undefined = runtime.results?.[0]?.startDateTime;
    
    for (const evnt  of runtime.current?.events || []) {      
      if (evnt.name === 'start') {
        running = true;
        currentTime = evnt.timestamp;
        if (!initialTime) {
            initialTime = evnt.timestamp;
        }
      }

      if (evnt.name === 'stop') {
        elapsed += (evnt.timestamp.getTime() - currentTime!.getTime()) / 1000;
        currentTime = undefined;
        running = false;
      }
    }

    if (!initialTime) {
      initialTime = event.timestamp;
    }

    if (currentTime != undefined) {
      elapsed += (event.timestamp.getTime() - currentTime.getTime()) / 1000;
    }
  
    const duration = fragmentsTo<TimerFragment>(runtime.current!.stack!, 'duration')?.duration ?? 0;
    const display: TimerDisplayBag = {
      elapsed: elapsed,
      remaining: (runtime.results?.[0]?.stopDateTime?.getTime() ?? 0) - event.timestamp.getTime(),
      label:runtime.current?.blockKey?? "",
      bag: {
        totalTime: (event.timestamp.getTime() - initialTime.getTime()) / 1000
      }
    };    
    const actions : IRuntimeAction[] = [new SetDisplayAction(event, display)];
    if (duration > 0 && elapsed >= duration) {
      actions.push(new RaiseEventAction({ name: 'complete', timestamp: event.timestamp }));
    }
    return actions;
  }
}