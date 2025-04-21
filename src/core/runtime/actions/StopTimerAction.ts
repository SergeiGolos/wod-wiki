import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { DisplayEvent } from "../timer.events";

export class StopTimerAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent
    ) {        
    }
    
    apply(runtime: ITimerRuntime, _input: (event: IRuntimeEvent) => void, _output: (event: ChromecastEvent) => void) {        
        if (!runtime.current) {
            return;
        }
        
        console.log('StopTimerAction: Adding event to runtime.current.events', this.event);                               
        const currentLap = runtime.current.laps.length > 0
         ? runtime.current.laps[runtime.current.laps.length - 1]
         : undefined;
        
        if (currentLap && !currentLap.stop) {
            currentLap.stop = this.event;            
            _input(new DisplayEvent());
        }
    }
}
