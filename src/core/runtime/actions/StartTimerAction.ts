import { IRuntimeAction, IRuntimeEvent, ITimerRuntime, ResultSpan } from "@/core/timer.types";
import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { DisplayEvent } from "../timer.events";

export class StartTimerAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent
    ) {        
    }

    apply(runtime: ITimerRuntime, _input: (event: IRuntimeEvent) => void, _output: (event: ChromecastEvent) => void) {        
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
                _input(new DisplayEvent());
            }
        }
}
