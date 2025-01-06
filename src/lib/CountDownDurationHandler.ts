import { DurationHandler } from "./DurationHandler";
import { RuntimeBlock } from "./RuntimeBlock";
import { ElapsedState } from "./ElapsedState";
import { IDurationHandler } from "./IDurationHandler";


export class CountDownDurationHandler extends DurationHandler implements IDurationHandler {

  elapsed(timestamp: Date, block: RuntimeBlock): ElapsedState {
    const totals = this.getTotal(block, timestamp);
    const duration = this.getDuration(block);
    return {
      state: totals[1],
      duration: duration,
      elapsed: totals[0],
      spans: totals[2],
      remaining: duration - totals[0]
    };
  }
}
