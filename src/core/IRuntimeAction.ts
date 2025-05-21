import { Subject } from "rxjs";
import { IRuntimeEvent } from "./IRuntimeEvent";
import { ITimerRuntime } from "./ITimerRuntime";
import { OutputEvent } from "./OutputEvent";


export interface IRuntimeAction {
  name: string;
  apply(
    runtime: ITimerRuntime,
    input: Subject<IRuntimeEvent>,
    output: Subject<OutputEvent>
  ): void;
}
