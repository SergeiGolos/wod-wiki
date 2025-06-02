import { TimeSpanDuration } from "@/core/TimeSpanDuration";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";
import { OutputAction } from "../OutputAction";
import { RuntimeSpan } from "@/core/RuntimeSpan";


export class SetSpanAction extends OutputAction {
    constructor(private target: string,private span: RuntimeSpan) {
        super('SET_SPAN');
    }    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {

        return [{
            eventType: this.eventType,
            bag: { data:this.span,  duration: new TimeSpanDuration(this.span.duration || 0, '+', this.span.timeSpans), target: this.target },
            timestamp: new Date()
        }];
    }
}
