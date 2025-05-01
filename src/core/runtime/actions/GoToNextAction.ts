import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent } from "@/core/timer.types";
import { Subject } from "rxjs";

export class GoToChildAction implements IRuntimeAction {
  constructor() { }
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    runtime.next(undefined, false);
  }
}


export class GoToNextAction implements IRuntimeAction {
  constructor() { }
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    runtime.next();
  }
}
