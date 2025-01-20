import { DurationHandler } from "./DurationHandler";
import { RuntimeBlock } from "./RuntimeBlock";
import { ElapsedState } from "./ElapsedState";
import { IDurationHandler } from "./IDurationHandler";
import { TimerEvent } from "./timer.runtime";

export class TotalDurationHandler extends DurationHandler implements IDurationHandler {
  elapsed(timestamp: Date, block: RuntimeBlock, events: TimerEvent[]): ElapsedState {    
    const totals = this.getTotal(events, timestamp);
    const duration = block && this.getDuration(block);
    
    const outcome: ElapsedState = {
      state: totals[1],
      duration: duration,
      elapsed: totals[0],
      spans: totals[2],
    };
    return outcome;  
  }
}

export class StopwatchDurationHandler extends DurationHandler implements IDurationHandler {
  elapsed(timestamp: Date, block: RuntimeBlock,events: TimerEvent[]): ElapsedState {
    const totals = this.getTotal(events, timestamp);
    const duration = block && this.getDuration(block);
    const outcome: ElapsedState = {
      state: totals[1],
      duration: duration,
      elapsed: totals[0],
      spans: totals[2],
    };

    if (duration > 0) {
      outcome.remaining = duration - totals[0];
    }

    return outcome;
  }
}
