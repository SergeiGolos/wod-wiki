import { IRuntimeAction } from "@/core/IRuntimeAction";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { OutputEvent } from "@/core/OutputEvent";
import { Subject } from "rxjs";


export class PushNextAction implements IRuntimeAction {
  name: string = "next";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    const block = runtime.trace.current();
    const next = block?.next(runtime) ?? [];
    runtime.apply(next, block!.blockKey);
  }
}
