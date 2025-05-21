import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeLog } from "@/core/IRuntimeLog";
import { OutputAction } from "../OutputAction";
import { Subject } from "rxjs";


export class WriteLogAction extends OutputAction {
    constructor(private log: IRuntimeLog) {
        super('WRITE_LOG');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        return [{
            eventType: this.eventType,
            bag: { log: this.log },
            timestamp: new Date()
        }];
    }
}
