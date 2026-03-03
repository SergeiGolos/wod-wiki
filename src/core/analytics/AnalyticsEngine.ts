import { IAnalyticsEngine, IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement } from '../models/OutputStatement';

/**
 * AnalyticsEngine - Orchestrates multiple analytics processes on the runtime output stream.
 *
 * Each process can intercept and enrich the output (add fragments) or generate new output
 * when finalized (summaries, running sums).
 */
export class AnalyticsEngine implements IAnalyticsEngine {
    private processes: IAnalyticsProcess[] = [];

    /**
     * Register a new analytics process.
     */
    addProcess(process: IAnalyticsProcess): void {
        this.processes.push(process);
    }

    /**
     * Run all registered processes on an output statement.
     * Each process can return a modified version of the statement.
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
     * Collect final summary statements from all processes.
     */
    finalize(): IOutputStatement[] {
        const finalStatements: IOutputStatement[] = [];
        for (const process of this.processes) {
            try {
                finalStatements.push(...process.finalize());
            } catch (err) {
                console.error(`[AnalyticsEngine] Error in finalize process '${process.id}':`, err);
            }
        }
        return finalStatements;
    }
}
