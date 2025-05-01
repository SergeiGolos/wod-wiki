import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent } from "@/core/timer.types";
import { Subject } from "rxjs";


export class GotoEndAction implements IRuntimeAction {
  name: string = "End";
  apply(runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>): IRuntimeEvent[] {    
    runtime.next(runtime.jit.end(runtime));    
    return [];
  }
}
