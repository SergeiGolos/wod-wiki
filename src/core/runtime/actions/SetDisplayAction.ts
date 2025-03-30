import { ButtonConfig, TimerDisplay, WodResultBlock } from "../../timer.types";
import { EventAction } from "../EventAction";
import { RuntimeEvent, TimerRuntime } from "../timer.runtime";

/**
 * Action to update the timer display
 */
export class SetDisplayAction extends EventAction {
    private display: TimerDisplay 

    /**
     * Creates a new SetDisplayAction
     * @param event The runtime event that triggered this action
     * @param display The display information to set
     */
    constructor(
        event: RuntimeEvent,
        display: TimerDisplay
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
        setDisplay: (display: TimerDisplay) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void {
        // Log the display update before applying it
        console.log(`Updating display: elapsed=${this.display.elapsed}ms, state=${this.display.state}, round=${this.display.round || 0}/${this.display.totalRounds || 0}`);
        
        // Update the display        
        setDisplay(this.display);                
    }
}
