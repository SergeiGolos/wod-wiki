import { IRuntimeAction } from "../IRuntimeAction";
import { OutputEvent } from "../OutputEvent";
import { OutputEventType } from "../OutputEventType";
import { ITimerRuntime } from "../ITimerRuntime";
import { IRuntimeEvent } from "../IRuntimeEvent";
import { Subject } from "rxjs";
export abstract class OutputAction implements IRuntimeAction {
    constructor(public eventType: OutputEventType) {
        this.name = `out:${eventType}`;        
    }
    name: string;    
    abstract write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>) : OutputEvent[] ;
      apply(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>) {
        const events = this.write(_runtime, _input);
        console.log(`🚀 OutputAction.apply() - ${this.name} emitting ${events.length} events`);
        events.forEach((event, index) => {
            console.log(`   Event ${index + 1}: ${event.eventType}`, event.bag);
            output.next(event);
        });
    }
}


