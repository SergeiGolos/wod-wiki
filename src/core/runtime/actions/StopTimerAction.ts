import { RuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventAction } from "../EventAction";


/**
 * Action to handle block stopped events
 */

export class StopTimerAction extends EventAction {
    constructor(
        event: RuntimeEvent
    ) {
        super(event);
    }

    apply(runtime: ITimerRuntime): void {        
        if (!runtime.current) {
            return;
        }

        runtime.current?.events.push(this.event);
    }
}
