import { IRuntimeAction, RuntimeEvent, ITimerRuntime } from "@/core/timer.types";

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
