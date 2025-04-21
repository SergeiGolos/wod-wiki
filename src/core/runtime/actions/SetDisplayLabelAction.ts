import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { ChromecastEvent } from "@/cast/types/chromecast-events";


export class SetDisplayLabelAction implements IRuntimeAction {    
    constructor(private event: IRuntimeEvent, label: string) {                
    }

    apply(_runtime: ITimerRuntime, _input: (event: IRuntimeEvent) => void, _output: (event: ChromecastEvent) => void) {
        
    }
}
