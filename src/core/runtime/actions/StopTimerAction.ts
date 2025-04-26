import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { DisplayEvent } from "../timer.events";
import { Subject } from "rxjs/internal/Subject";

export class StopTimerAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent
    ) {        
    }
    name: string = 'stop';
    apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<ChromecastEvent>) {        
        if (!runtime.current) {
            return;
        }
        
        console.log('StopTimerAction: Adding event to runtime.current.events', this.event);                               
        const currentLap = runtime.current.laps.length > 0
         ? runtime.current.laps[runtime.current.laps.length - 1]
         : undefined;
        
        if (currentLap && !currentLap.stop) {
            currentLap.stop = this.event;            
            input.next(new DisplayEvent());
        }
    }
}
