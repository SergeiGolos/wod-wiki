import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode, TimerDisplayBag, TimerFromSeconds } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { SetDisplayAction } from "../actions/SetDisplayAction";
import { fragmentsTo } from "@/core/utils";
import { TimerFragment } from "@/core/fragments/TimerFragment";
import { RaiseEventAction } from "../actions/RaiseEventAction";
import { IncrementFragment } from "@/core/fragments/IncrementFragment";

export class TickHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Use canonical state for running check
    const isRunning = runtime.current?.getState() === 'running';
    let elapsed = 0;
    let currentTime: Date | undefined;
    let initialTime: Date | undefined = runtime.results?.[0]?.start?.timestamp;

    // Only calculate elapsed if running
    if (isRunning) {
      for (const evnt of runtime.current?.events || []) {
        if (evnt.name === 'start') {
          currentTime = evnt.timestamp;
          if (!initialTime) {
            initialTime = evnt.timestamp;
          }
        }
        if (evnt.name === 'stop') {
          if (currentTime) {
            elapsed += (evnt.timestamp.getTime() - currentTime.getTime()) / 1000;
          }
          currentTime = undefined;
        }
      }
      if (!initialTime) {
        initialTime = event.timestamp;
      }
      if (currentTime != undefined) {
        elapsed += (event.timestamp.getTime() - currentTime.getTime()) / 1000;
      }
    }

    const duration = fragmentsTo<TimerFragment>(runtime.current!.stack!, 'duration')?.duration ?? 0;
    const increment = fragmentsTo<IncrementFragment>(runtime.current!.stack!, 'increment')?.increment ?? 0;

    const clock = new TimerFromSeconds(
      increment < 0
        ? duration - elapsed
        : elapsed);

    const actions: IRuntimeAction[] = [
      new SetDisplayAction(event, clock),
      new SetDisplayAction(event, new TimerFromSeconds(duration), "duration")
    ];

    if (duration > 0 && elapsed >= duration) {
      actions.push(new RaiseEventAction({ name: 'complete', timestamp: event.timestamp }));
    }
    return actions;
  }
}