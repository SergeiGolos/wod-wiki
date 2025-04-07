import { IClock, RuntimeEvent } from "@/core/timer.types";
import { EventAction } from "../EventAction";
import { ITimerRuntime } from "@/core/timer.types";

/**
 * Action to update the timer display
 */
export class SetDisplayAction extends EventAction {
    private display: IClock 
    private name: string;

    /**
     * Creates a new SetDisplayAction
     * @param event The runtime event that triggered this action
     * @param display The display information to set
     */
    constructor(
        event: RuntimeEvent,        
        display: IClock,
        name?: string    
    ) {
        super(event);
        this.display = display;
        this.name = name ?? "";
    }

    /**
     * Applies the display update to the runtime
     */
    apply(runtime: ITimerRuntime): RuntimeEvent[] {                
        // Update the display        
        if (this.name === "") {
            runtime.display.primary = this.display;
        } else {
            runtime.display.bag[this.name] = this.display;
        }               
        
        return [];
    }
}
