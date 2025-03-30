import { TimerDisplay, ButtonConfig, WodResultBlock, RuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventAction } from "../EventAction";
import { TimerRuntime } from "@/core/runtime/timer.runtime";


/**
 * Action to handle block started events
 */

export class StartTimerAction extends EventAction {
    constructor(
        event: RuntimeEvent
    ) {
        super(event);
    }

    apply(
        runtime: ITimerRuntime,
        setDisplay: (display: TimerDisplay) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void {        
    }
}
