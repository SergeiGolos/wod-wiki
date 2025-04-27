import { OutputEvent } from "@/cast/types/chromecast-events";
import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
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
        console.log('NotifyRuntimeAction: Adding event to runtime.current.events', this.event);
        input?.next(this.event);        
    }
}
