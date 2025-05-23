import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";
import { OutputAction } from "../OutputAction";
import { ResultSpan } from "@/core/ResultSpan";
import { TimeSpanDuration } from "@/core/TimeSpanDuration";

/**
 * Action to update a named clock with a ResultSpan
 * This enables more direct integration between ResultSpan tracking and UI components
 */
export class SetResultSpanAction extends OutputAction {
    constructor(private resultSpan: ResultSpan, private target: string) {
        super('SET_CLOCK');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        // Extract the timeSpans from the ResultSpan to create a TimeSpanDuration
        return [{
            eventType: this.eventType,
            bag: { 
                duration: new TimeSpanDuration(0, '+', this.resultSpan.timeSpans), 
                target: this.target,
                // Include the resultSpan for additional context if needed by consumers
                resultSpan: this.resultSpan
            },
            timestamp: new Date()
        }];
    }
}