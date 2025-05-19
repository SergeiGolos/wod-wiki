import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";

export class ResetAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent
    ) {
    }
    name: string = 'reset';
    apply(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>): void {
        _runtime.reset(); 
    }
}
