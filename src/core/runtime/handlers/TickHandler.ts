import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode, TimerDisplayBag, TimerFromSeconds } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { SetDisplayAction } from "../actions/SetDisplayAction";
import { fragmentsTo } from "@/core/utils";
import { TimerFragment } from "@/core/fragments/TimerFragment";
import { RaiseEventAction } from "../actions/RaiseEventAction";
import { IncrementFragment } from "@/core/fragments/IncrementFragment";
import { EventSpanAggregator } from "../EventSpanAggregator";

export class TickHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Use canonical state for running check
    const isRunning = runtime.current?.getState() === 'running';
    let elapsed = 0;

    // Use EventSpanAggregator for event span/duration logic
    if (runtime.current) {
      const aggregator = new EventSpanAggregator(runtime.current.events, runtime.current.stack!);
      if (isRunning) {
        // Elapsed time is total of closed spans plus current active span
        elapsed = aggregator.getTotalDuration() + aggregator.getCurrentDuration(event.timestamp);
      } else {
        // If not running, just sum closed spans
        elapsed = aggregator.getTotalDuration();
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