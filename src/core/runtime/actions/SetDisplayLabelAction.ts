import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { Subject } from "rxjs/internal/Subject";


export class SetDisplayLabelAction implements IRuntimeAction {    
    constructor(private event: IRuntimeEvent, label: string) {                
    }
    name: string = 'setDisplayLabel';

    apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<ChromecastEvent>) {
        
    }
}
