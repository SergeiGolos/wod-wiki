import {
  IRuntimeAction,
  IRuntimeEvent,
  ITimerRuntime,
  OutputEvent,
  ResultSpan,
  TimeSpanDuration,
} from "@/core/timer.types";
import { Subject } from "rxjs/internal/Subject";
import { DisplayEvent } from "../events/DisplayEvent";

export class StartTimerAction implements IRuntimeAction {
  constructor(private event: IRuntimeEvent) {}
  name: string = "start";
  apply(
    runtime: ITimerRuntime,
    input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ) {
    if (!runtime.current) {
      return;
    }

    console.log(
      "StartTimerAction: Adding event to runtime.current.events",
      this.event
    );

    const currentLap =
      runtime.current.laps.length > 0
        ? runtime.current.laps[runtime.current.laps.length - 1]
        : undefined;

    if (!currentLap || currentLap.stop) {
      runtime.current.laps.push({
        blockKey: runtime.current.blockKey,
        start: this.event,
        stop: undefined,
        metrics: [],
      } as unknown as ResultSpan);

      // TOTO : create the correc ttype of coutput event.
      input.next(
        new DisplayEvent(
          "primary",
          new TimeSpanDuration(
            runtime.current.duration.original!,
            runtime.current.laps
          )
        )
      );
    }
  }
}
