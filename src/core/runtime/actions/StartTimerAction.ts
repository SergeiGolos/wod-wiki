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

    apply(runtime: ITimerRuntime): void {        
        if (!runtime.current) {
            const first = runtime.script.leafs[0];
        runtime.gotoBlock(first);
        }

        runtime.current?.events.push(this.event);
    }
}
