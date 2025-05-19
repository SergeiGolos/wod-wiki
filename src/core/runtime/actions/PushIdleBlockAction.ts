import { IRuntimeAction } from "@/core/IRuntimeAction";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { OutputEvent } from "@/core/OutputEvent";
import { Subject } from "rxjs";


export class PushIdleBlockAction implements IRuntimeAction {
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    runtime.push(runtime.jit.idle(runtime));
  }
}
