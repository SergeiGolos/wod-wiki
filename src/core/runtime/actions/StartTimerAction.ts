import {
  IRuntimeAction,
  IRuntimeEvent,
  ITimerRuntime,
  OutputEvent,
  ResultSpan,
  TimeSpanDuration,
} from "@/core/timer.types";
import { Subject } from "rxjs/internal/Subject";
import { DisplayEvent } from "../inputs/DisplayEvent";
import { getDuration } from "../blocks/readers/getDuration";

export class StartTimerAction implements IRuntimeAction {
  constructor(private event: IRuntimeEvent) {}
  name: string = "start";
  apply(
    runtime: ITimerRuntime,
    input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ) {
    const block = runtime.trace.current();
    if (!block) {
      return;
    }

    const currentLap =
      block.laps.length > 0 ? block.laps[block.laps.length - 1] : undefined;

    if (!currentLap || currentLap.stop) {
      block.laps.push({
        blockKey: block.blockKey,
        start: this.event,
        stop: undefined,
        metrics: [],
      } as unknown as ResultSpan);
    }
    const duration = runtime.trace.fromStack(getDuration);
    if (duration != undefined) {
      // TOTO : create the correc ttype of coutput event.
      input.next(
        new DisplayEvent(
          "primary",
          new TimeSpanDuration(duration.original!, block.laps)
        )
      );
    }
  }
}
