import { IOutputStatement } from '../models/OutputStatement';

/**
 * An individual analytics process that enriches the output stream.
 *
 * Each process is purely segment-local: it reads metrics already on the
 * statement (including those added by earlier processes in the chain) and
 * pushes additional derived metrics back onto `output.metrics`.
 *
 * No cross-segment state. No summary outputs. Aggregation belongs in the
 * projection pipeline (IProjectionEngine / AnalysisService).
 */
export interface IAnalyticsProcess {
    /** Unique identifier for the process */
    readonly id: string;

    /**
     * Enrich an output statement with derived metrics.
     * Must return the (possibly mutated) statement. Processes chain in
     * registration order — each one sees metrics added by its predecessors.
     */
    process(output: IOutputStatement): IOutputStatement;
}

/**
 * Engine that orchestrates multiple analytics processes.
 */
export interface IAnalyticsEngine {
    /** Register a new process */
    addProcess(process: IAnalyticsProcess): void;

    /** Run all processes on an output statement */
    run(output: IOutputStatement): IOutputStatement;
}
