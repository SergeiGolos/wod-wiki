import { ChromecastEvent } from "@/cast/types/chromecast-events";
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
    apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, _output: Subject<ChromecastEvent>): void {
        input?.next(this.event);        
    }
}
