import { ITimeSpan, ITimerRuntime, IRuntimeEvent, OutputEvent, TimeSpanDuration } from "@/core/timer.types";
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
