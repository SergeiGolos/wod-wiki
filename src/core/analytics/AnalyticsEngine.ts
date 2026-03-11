import { IAnalyticsEngine, IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement } from '../models/OutputStatement';

/**
 * AnalyticsEngine - Chains multiple enrichment processes on the runtime output stream.
 *
 * Each process is purely stateless and segment-local: it reads the current
 * statement's metrics (including those added by earlier processes) and pushes
 * additional derived metrics back onto `output.metrics`.
 *
 * Aggregation processes can also be added here, which accumulate state
 * across multiple segments and emit summary statements when finalize() is called.
 */
export class AnalyticsEngine implements IAnalyticsEngine {
    private processes: IAnalyticsProcess[] = [];

    addProcess(process: IAnalyticsProcess): void {
        this.processes.push(process);
    }

    /**
     * Run all registered processes on an output statement in order.
     * Each process sees metrics added by its predecessors.
     */
    run(output: IOutputStatement): IOutputStatement {
        let currentOutput = output;
        for (const process of this.processes) {
            try {
                currentOutput = process.process(currentOutput);
            } catch (err) {
                console.error(`[AnalyticsEngine] Error in process '${process.id}':`, err);
            }
        }
        return currentOutput;
    }

    /**
     * Finalize all processes and collect any summary output statements.
     */
    finalize(): IOutputStatement[] {
        const results: IOutputStatement[] = [];
        for (const process of this.processes) {
            try {
                results.push(...process.finalize());
            } catch (err) {
                console.error(`[AnalyticsEngine] Error finalizing process '${process.id}':`, err);
            }
        }
        return results;
    }
}
