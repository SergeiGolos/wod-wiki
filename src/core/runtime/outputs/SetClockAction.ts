import { IRuntimeEvent, ITimerRuntime, OutputEvent, TimeSpanDuration } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";
import { Subject } from "rxjs";
import { getDuration } from "../blocks/readers/getDuration";

export class SetClockAction extends OutputAction {
    constructor(private target: string) {
        super('SET_CLOCK');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        const block = _runtime.trace.current();
        const context = block?.getContext();
        const duration = block?.get(getDuration)[0];
        return [{
            eventType: this.eventType,
            bag: { duration: new TimeSpanDuration(duration?.original ?? 0, context?.spans ?? []), target: this.target },
            timestamp: new Date()
        }];
    }
}


