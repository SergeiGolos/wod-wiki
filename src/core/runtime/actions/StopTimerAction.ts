import { IRuntimeAction, IRuntimeEvent, ITimerRuntime, OutputEvent, TimeSpanDuration } from "@/core/timer.types";
import { DisplayEvent } from "../inputs/DisplayEvent";
import { Subject } from "rxjs/internal/Subject";

export class StopTimerAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent
    ) {        
    }
    name: string = 'stop';
    apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>) {        
        if (!runtime.current) {
            return;
        }
        
        console.log('StopTimerAction: Adding event to runtime.current.events', this.event);                               
        const currentLap = runtime.current.laps.length > 0
         ? runtime.current.laps[runtime.current.laps.length - 1]
         : undefined;
        
        if (currentLap && !currentLap.stop) {
            currentLap.stop = this.event;
            
            input.next(new DisplayEvent("primary", new TimeSpanDuration(runtime.current.duration.original!,
                runtime.current.laps
            )));
        }
    }
}
