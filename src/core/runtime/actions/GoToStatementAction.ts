import {
  IRuntimeAction,
  ITimerRuntime,
  IRuntimeEvent,
  OutputEvent,
} from "@/core/timer.types";
import { Subject } from "rxjs";

export class GoToStatementAction implements IRuntimeAction {
  constructor(public blockId?: number) {}
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    if (!this.blockId) {
      runtime.next(runtime.jit.idle(runtime));
      return;
    } 
    
    const blocks = runtime.script.getId(this.blockId);
    runtime.next(runtime.jit.compile(runtime, blocks));
  }
}
