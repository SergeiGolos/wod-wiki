import { TimeSpanDuration } from "@/core/TimeSpanDuration";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { OutputAction } from "../OutputAction";
import { Subject } from "rxjs";
import { getDuration } from "../blocks/readers/getDuration";

export class SetClockAction extends OutputAction {
    constructor(private target: string) {
        super('SET_CLOCK');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        const block = _runtime.trace.current();
        if (!block) {
            return [];
        }
        
        const duration = block.sources[0].duration(block.blockKey);
        const builder = block.getSpanBuilder();
        const resultSpan = builder.Spans();
        // Get the current RuntimeSpan's timeSpans to ensure the timer shows as running        
        return [{
            eventType: this.eventType,
            bag: { 
                duration: new TimeSpanDuration(duration?.original ?? 0, '+', resultSpan), 
                target: this.target 
            },
            timestamp: new Date()
        }];
    }
}


