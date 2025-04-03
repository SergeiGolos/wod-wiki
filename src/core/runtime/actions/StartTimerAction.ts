import { RuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventAction } from "../EventAction";


/**
 * Action to handle block started events
 */

export class StartTimerAction extends EventAction {
    constructor(
        event: RuntimeEvent
    ) {
        super(event);
    }

    apply(runtime: ITimerRuntime): RuntimeEvent[] {        
        runtime.current?.events.push(this.event);
        return [];
    }
}
