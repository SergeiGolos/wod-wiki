import { IRuntimeEvent, ITimerRuntime, OutputEvent, ResultSpan } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";
import { Subject } from "rxjs";

/**
 * Action to write a result to the output stream.
 * Used by blocks to report their metrics and completion.
 */
export class WriteResultAction extends OutputAction {
    constructor(private result: ResultSpan) {
        super('WRITE_RESULT');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        return [{
            eventType: this.eventType,
            bag: { result: this.result },
            timestamp: new Date()
        }];
    }
}
