import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { Subject } from "rxjs";
import { ITimeSpan } from "@/core/ITimeSpan";

export class StartTimerAction implements IRuntimeAction {
  constructor(private event: IRuntimeEvent) {}
  name: string = "start";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ) {
    const block = runtime.trace.current();
    if (!block) {
      return;
    }

    const timestampEvent = this.event;
    let currentRuntimeSpan: RuntimeSpan | undefined = block.spans.length > 0 ? block.spans[block.spans.length - 1] : undefined;

    if (!currentRuntimeSpan || currentRuntimeSpan.timeSpans.length === 0) {
      // Case 1: No RuntimeSpan exists, or the last one has no ITimeSpans.
      // Create a new RuntimeSpan, add a new ITimeSpan to it, and add the RuntimeSpan to the block.
      currentRuntimeSpan = new RuntimeSpan();
      currentRuntimeSpan.blockKey = block.blockKey;
      
      const newITimeSpan: ITimeSpan = { start: timestampEvent };
      currentRuntimeSpan.timeSpans.push(newITimeSpan);
      block.spans.push(currentRuntimeSpan);
    } else {
      // Case 2: A RuntimeSpan exists and has ITimeSpans.
      let lastITimeSpan: ITimeSpan = currentRuntimeSpan.timeSpans[currentRuntimeSpan.timeSpans.length - 1];

      if (lastITimeSpan.stop) {
        // Subcase 2a: The last ITimeSpan is already stopped. Start a new one.
        const newITimeSpan: ITimeSpan = { start: timestampEvent };
        currentRuntimeSpan.timeSpans.push(newITimeSpan);
      } else {
        // Subcase 2b: The last ITimeSpan is running. Stop it and start a new one.
        lastITimeSpan.stop = timestampEvent;
        const newITimeSpan: ITimeSpan = { start: timestampEvent };
        currentRuntimeSpan.timeSpans.push(newITimeSpan);
      }
    }
    // If advancing the runtime is also intended after starting a timer,
    // a line like _input.next(new PushNextAction(this.event)); might be needed here.
  }
}
