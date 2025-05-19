import { ITimeSpan } from "@/core/ITimeSpan";
import { TimeSpanDuration } from "@/core/TimeSpanDuration";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";
import { OutputAction } from "../OutputAction";


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
