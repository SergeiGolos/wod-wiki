import {
  IRuntimeAction,
  IRuntimeEvent,
  ITimerRuntime,
  OutputEvent,
} from "@/core/timer.types";
import { Subject } from "rxjs/internal/Subject";
import { getDuration } from "../blocks/readers/getDuration";
import { SetClockAction } from "../outputs/SetClockAction";
import { PushActionEvent } from "../inputs/PushActionEvent";

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
    // block.walk()
    console.log(
      "StopTimerAction: Adding event to runtime.current.events",
      this.event
    );
    const currentLap =
      block.spans.length > 0 ? block.spans[block.spans.length - 1] : undefined;

    if (currentLap && !currentLap.stop) {
      currentLap.stop = this.event;
    }

    const duration = block.get(getDuration);
    if (duration != undefined) {
      input.next(
        new PushActionEvent(new SetClockAction("primary"))
      );
    }
  }
}
