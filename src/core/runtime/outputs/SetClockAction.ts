import { IDuration, IRuntimeBlock, IRuntimeEvent, ITimerRuntime, ITimeSpan, OutputEvent, TimeSpanDuration } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";
import { Subject } from "rxjs";
import { getDuration } from "../blocks/readers/getDuration";

export class SetTimeSpanAction extends OutputAction {                             
    constructor(private spans: ITimeSpan[], private target: string) {
        super('SET_CLOCK');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        
        return [{
            eventType: this.eventType,
            bag: { duration: new TimeSpanDuration(0, this.spans), target: this.target },
            timestamp: new Date()
        }];
    }
}


export class SetClockAction extends OutputAction {
    constructor(private target: string) {
        super('SET_CLOCK');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        const block = _runtime.trace.current();
        const duration = _runtime.trace.fromStack(getDuration);
        return [{
            eventType: this.eventType,
            bag: { duration: new TimeSpanDuration(duration?.original ?? 0, block?.laps ?? []), target: this.target },
            timestamp: new Date()
        }];
    }
}
