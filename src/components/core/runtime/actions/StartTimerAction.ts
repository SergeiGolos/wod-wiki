import { TimerDisplay, ButtonConfig, WodResultBlock } from "../../timer.types";
import { EventAction } from "../EventAction";
import { RuntimeEvent, TimerRuntime } from "../timer.runtime";


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
