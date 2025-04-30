import {
  IRuntimeAction,
  IRuntimeEvent,
  ITimerRuntime,
  OutputEvent,
  TimeSpanDuration,
} from "@/core/timer.types";
import { DisplayEvent } from "../inputs/DisplayEvent";
import { Subject } from "rxjs/internal/Subject";

export class PopTimerAction implements IRuntimeAction {
  name: string = "pop";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    runtime.trace.pop();
  }
}

export class StopTimerAction implements IRuntimeAction {
  constructor(private event: IRuntimeEvent) {}
  name: string = "stop";
  apply(
    runtime: ITimerRuntime,
    input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ) {
    const block = runtime.trace.current();
    if (!block) {
      return;
    }

    console.log(
      "StopTimerAction: Adding event to runtime.current.events",
      this.event
    );
    const currentLap =
      block.laps.length > 0 ? block.laps[block.laps.length - 1] : undefined;

    if (currentLap && !currentLap.stop) {
      currentLap.stop = this.event;

      input.next(
        new DisplayEvent(
          "primary",
          new TimeSpanDuration(block.duration().original!, block.laps)
        )
      );
    }
  }
}
