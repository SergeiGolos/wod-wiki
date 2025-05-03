import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent, OutputEventType, ISpanDuration } from "@/core/timer.types";
import { Subject } from "rxjs";
export abstract class OutputAction implements IRuntimeAction {
    constructor(public eventType: OutputEventType) {
        this.name = `out:${eventType}`;        
    }
    name: string;    
    abstract write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>) : OutputEvent[] ;
    
    apply(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>) {
        const events = this.write(_runtime, _input);
        events.forEach(event => output.next(event));
    }
}


