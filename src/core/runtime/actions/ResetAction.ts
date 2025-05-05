import { IRuntimeAction, IRuntimeEvent, ITimerRuntime, OutputEvent } from "@/core/timer.types";
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
