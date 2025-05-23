import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { OutputAction } from "../OutputAction";
import { Subject } from "rxjs";

/**
 * Action to write a result to the output stream.
 * Used by blocks to report their metrics and completion.
 * 
 * Can handle either a single ResultSpan or an array of ResultSpan objects,
 * allowing blocks to emit multiple result spans when they complete.
 */
export class WriteResultAction extends OutputAction {
    private results: RuntimeSpan[];

    constructor(result: RuntimeSpan | RuntimeSpan[]) {
        super('WRITE_RESULT');
        // Convert single result to array for uniform handling
        this.results = Array.isArray(result) ? result : [result];
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        // DEBUG: structured log of outgoing result spans
        console.log("[WriteResultAction] emitting", this.results.map(r => ({
            key: r.blockKey?.toString?.() ?? "",
            index: r.index,
            leaf: r.leaf,
            metrics: r.metrics
        })));
        // Create an output event for each result span
        return this.results.map(result => {
            console.log(`$$=== write_result : ${result.blockKey} (index: ${result?.index})`);
            return {
                eventType: this.eventType,
                bag: { result },
                timestamp: new Date()
            } as OutputEvent;
        });
    }
}
