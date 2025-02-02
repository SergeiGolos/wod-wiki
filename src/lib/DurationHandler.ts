import { TimerFragment } from "./fragments/TimerFragment";
import { RuntimeBlock } from "./RuntimeBlock";
import { TimerEvent } from "./timer.runtime";
import { ResultSpan } from "./Timespan";


export class DurationHandler {
  getTotal(events: TimerEvent[], timestamp: Date): [number, string, ResultSpan[]] {
    const spans = [] as ResultSpan[];
    let state = "stopped";
    let timerSum = 0;    
    for (let ts of events || []) {
      if (ts.type === "start" && (spans.length === 0 || spans[spans.length - 1].stop !== undefined)) {
        state = "running";
        const span = new ResultSpan();
        span.start = ts;
        spans.push(span);
      } else if (ts.type === "stop") {
        if (spans.length > 0 && !spans[spans.length - 1].stop) {
          state = "stopped";
          spans[spans.length - 1].stop = ts;
          timerSum += spans[spans.length - 1].duration();
        }
      }
    }

    if (state == "running") {
      timerSum += spans[spans.length - 1].duration(timestamp);
    }

    return [timerSum/1000, state, spans];
  }

  getDuration(block: RuntimeBlock): number {
    const timers = block.getFragment<TimerFragment>("duration");
    return timers.length > 0 ? timers[0].duration : 0;
  }
}
