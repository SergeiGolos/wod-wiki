import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs/internal/Subject";
import { getDuration } from "../blocks/readers/getDuration";
import { SetClockAction } from "../outputs/SetClockAction";
import { PushActionEvent } from "../inputs/PushActionEvent";

export class StopTimerAction implements IRuntimeAction {

  constructor(private event: IRuntimeEvent) {    
  }

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
    console.log(`+=== stop_timer : ${block.blockKey}`);
   
    // Check if we need to update the clock
    const duration = block.selectMany(getDuration)[0];
    if (duration !== undefined) {
      input.next(
        new PushActionEvent(new SetClockAction("primary"))
      );
    }
  }
}
