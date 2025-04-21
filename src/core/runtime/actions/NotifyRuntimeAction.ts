import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";

/**
 * Action to handle block stopped events
 */

export class NotifyRuntimeAction implements IRuntimeAction {
    constructor(
        public event: IRuntimeEvent
    ) { }
    apply(_runtime: ITimerRuntime, input: (event: IRuntimeEvent) => void, _output: (event: ChromecastEvent) => void): void {
        input(this.event);        
    }
}
