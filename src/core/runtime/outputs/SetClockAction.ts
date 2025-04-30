import { IDuration, IRuntimeBlock, TimeSpanDuration } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";

export class SetDurationAction extends OutputAction {
    constructor(duration: IDuration, target: string) {
        super('SET_CLOCK', { duration, target: target });
    }
}


export class SetClockAction extends OutputAction {
    constructor(block: IRuntimeBlock, target: string) {
        const duration = block.duration();        
        super('SET_CLOCK', { duration : new TimeSpanDuration(
            duration?.original ?? 0, block.laps!)
            , target: target });
    }
}
