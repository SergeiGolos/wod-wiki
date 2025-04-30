import { IRuntimeAction, IRuntimeEvent, ITimerRuntime, OutputEvent } from "@/core/timer.types";
import { Subject } from "rxjs";

/**
 * Action to notify the runtime of a stopped event
 */

export class NotifyRuntimeAction implements IRuntimeAction {
    constructor(
        public event: IRuntimeEvent
    ) { }
    name: string = 'notify';
    apply(_runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>): void {        
        input?.next(this.event);        
    }
}
