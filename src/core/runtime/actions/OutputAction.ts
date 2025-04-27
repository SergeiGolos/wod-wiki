import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent, IRuntimeLog, OutputEventType, ISpanDuration } from "@/core/timer.types";
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

export class WriteLogAction extends OutputAction {
    constructor(log: IRuntimeLog) {
        super('WRITE_LOG', { log });        
    }    
}

export class SetClockAction extends OutputAction {    
    constructor(duration: ISpanDuration, target: string) {
        super('SET_CLOCK', { duration, target });        
    }    
}
export class SetTextAction extends OutputAction {    
    constructor(text: string, target: string) {
        super('SET_TEXT', { text, target });        
    }    
}
