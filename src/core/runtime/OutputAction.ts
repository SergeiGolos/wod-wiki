import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent, OutputEventType, ISpanDuration } from "@/core/timer.types";
import { Subject } from "rxjs";

export abstract class OutputAction implements IRuntimeAction {
    constructor(public eventType: OutputEventType, public bag: { [key: string]: any }) {
        this.name = `out:${eventType}`;        
    }
    name: string;    
    apply(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>) {
        output.next({
            eventType: this.eventType,
            bag: this.bag,
            timestamp: new Date()
        });
    }
}


