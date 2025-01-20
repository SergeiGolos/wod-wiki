import { WodRuntimeScript } from "./md-timer";
import { RuntimeBlock } from "./RuntimeBlock";
import { RepeatingRuntimeHandler, SourceDisplayBlock, StopwatchRuntimeHandler } from "./SourceDisplayBlock";
import { CountDownDurationHandler } from "./CountDownDurationHandler";
import { StopwatchDurationHandler } from "./StopwatchDurationHandler";
import { TimerRuntime } from "./timer.runtime";
import { IncrementFragment } from "./fragments/IncrementFragment";
import { RoundsFragment } from "./fragments/RoundsFragment";
import { TimerFragment } from "./fragments/TimerFragment";

export class WodCompiler {
  static compileCode(
    value: WodRuntimeScript | undefined
  ): TimerRuntime {
    const steps = [] as RuntimeBlock[];
    if (!value?.outcome || value.outcome.length === 0) {
      return new TimerRuntime(steps);
    }
    
    const handler = new StopwatchRuntimeHandler(); 
    const lookup = {} as { [key: number]: RuntimeBlock };        

    for (const block of value.outcome) {            
      const runtimeBlock = new SourceDisplayBlock(block, handler);      
      const increment = runtimeBlock.getFragment<IncrementFragment>("increment");
      const duration = runtimeBlock.getFragment<TimerFragment>("duration");

      
      if (duration.length > 0 && increment.length == 0) {
          runtimeBlock.durationHandler = new CountDownDurationHandler();          
      } else {
      
          runtimeBlock.durationHandler = new StopwatchDurationHandler(); // Default to stopwatch if no duration specified
      }      
      // runtimeBlock.durationHandler = increment.length > 0 && increment[0].increment > 0
      //   ? new StopwatchDurationHandler()
      //   : new CountDownDurationHandler();

      const rounds = runtimeBlock.getFragment<RoundsFragment>("rounds");      
      runtimeBlock.runtimeHandler = handler;

      if (rounds.length > 0 && rounds[0].count > 0) {
        runtimeBlock.runtimeHandler = new RepeatingRuntimeHandler(0, 0, rounds[0].count);
      }
      
      lookup[block.id] = runtimeBlock;
      steps.push(runtimeBlock);
    }

    return new TimerRuntime(steps);
  }
}
