import { IOutputStatement } from '../models/OutputStatement';

/**
 * An individual analytics process that can intercept and enrich the output stream.
 */
export interface IAnalyticsProcess {
    /** Unique identifier for the process */
    readonly id: string;

    /**
     * Process an output statement as it is emitted from the runtime.
     * Can return a modified version of the statement (e.g., with added fragments).
     */
    process(output: IOutputStatement): IOutputStatement;

    /**
     * Called when execution finishes to produce final summary statements.
     */
    finalize(): IOutputStatement[];
}

/**
 * Engine that orchestrates multiple analytics processes.
 */
export interface IAnalyticsEngine {
    /** Register a new process */
    addProcess(process: IAnalyticsProcess): void;

    /** Run all processes on an output statement */
    run(output: IOutputStatement): IOutputStatement;

    /** Collect final statements from all processes */
    finalize(): IOutputStatement[];
}
