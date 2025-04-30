import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent } from "@/core/timer.types";
import { Subject } from "rxjs";


export class CompleteTimerAction implements IRuntimeAction {
  constructor(private recurcive: boolean = false) { }
  name: string = "complete";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    
    runtime.trace.pop();
    while(this.recurcive && runtime.trace.current() !== undefined) {
      runtime.trace.pop();
    }
  }
}
