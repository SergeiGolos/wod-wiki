import { TimerDisplay, ButtonConfig, WodResultBlock } from "@/types/timer.types";
import { EventAction } from "../EventAction";
import { TimerRuntime } from "../timer.runtime";
import { RuntimeEvent } from "../types";

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
        runtime: TimerRuntime,
        setDisplay: (display: TimerDisplay) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void {        
    }
}
