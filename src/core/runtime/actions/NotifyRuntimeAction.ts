import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
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
