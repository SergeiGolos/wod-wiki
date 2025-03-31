import { ButtonConfig, RuntimeEvent, TimerDisplayBag, WodResultBlock } from "@/core/timer.types";
import { EventAction } from "../EventAction";
import { TimerRuntime } from "@/core/runtime/timer.runtime";

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
     * Applies the display update to the UI
     * @param setDisplay Callback to update the display
     * @param setButtons Callback to update the buttons
     * @param setResults Callback to update the results
     */
    apply(
        runtime: TimerRuntime,
        setDisplay: (display: TimerDisplayBag) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void {
        // Log the display update before applying it                
        // Update the display        
        setDisplay(this.display);                
    }
}
