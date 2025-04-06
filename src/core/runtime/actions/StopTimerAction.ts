import { RuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventAction } from "../EventAction";


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
