import { IRuntimeAction, IRuntimeEvent, ITimerRuntime, ResultSpan } from "@/core/timer.types";
import { OutputEvent } from "@/cast/types/chromecast-events";
import { DisplayEvent } from "../timer.events";
import { Subject } from "rxjs/internal/Subject";

export class StartTimerAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent
    ) {        
    }
    name: string = 'start';
    apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>) {        
            if (!runtime.current) {
                return;
            }
            
            console.log('StartTimerAction: Adding event to runtime.current.events', this.event);
            runtime.events.push({ ...this.event, 
                blockId: runtime.current.blockId, 
                blockKey: runtime.current.blockKey 
            });                        
    
            const currentLap = runtime.current.laps.length > 0
             ? runtime.current.laps[runtime.current.laps.length - 1]
             : undefined;
            
            if (!currentLap || currentLap.stop) {
                runtime.current.laps.push({
                    blockKey: runtime.current.blockKey,
                    start: this.event,
                    stop: undefined,
                    metrics: [],                                        
                } as unknown as ResultSpan);

                // TOTO : create the correc ttype of coutput event.
                input.next(new DisplayEvent());
            }
        }
}
