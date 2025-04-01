import { RuntimeEvent, TimerDisplayBag } from "@/core/timer.types";
import { EventAction } from "../EventAction";
import { ITimerRuntime } from "@/core/timer.types";

/**
 * Action to update the timer display
 */
export class SetDisplayAction extends EventAction {
    private display: TimerDisplayBag 

    /**
     * Creates a new SetDisplayAction
     * @param event The runtime event that triggered this action
     * @param display The display information to set
     */
    constructor(
        event: RuntimeEvent,
        display: TimerDisplayBag
    ) {
        super(event);
        this.display = display;
    }

    /**
     * Applies the display update to the runtime
     */
    apply(runtime: ITimerRuntime): void {                
        // Update the display        
        runtime.setDisplay(this.display);                
    }
}
