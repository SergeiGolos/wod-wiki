import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { Subject } from "rxjs";

/**
 * Action to handle block stopped events
 */

export class NotifyRuntimeAction implements IRuntimeAction {
    constructor(
        public event: IRuntimeEvent
    ) { }
    apply(_runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, _output: Subject<ChromecastEvent>): void {
        input?.next(this.event);        
    }
}
