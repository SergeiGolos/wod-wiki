import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventAction } from "../EventAction";


/**
 * Action to handle block stopped events
 */
export class RaiseEventAction implements IRuntimeAction {
    constructor(
        public event: RuntimeEvent
    ) { }
    apply(runtime: ITimerRuntime): RuntimeEvent[] {
        return [this.event];
    }
}

export class StopTimerAction extends EventAction {
    constructor(
        event: RuntimeEvent
    ) {
        super(event);
    }

    apply(runtime: ITimerRuntime): RuntimeEvent[] {        
        if (runtime.current) {
            runtime.current.events.push(this.event);    

        }
        return [];
    }
}
