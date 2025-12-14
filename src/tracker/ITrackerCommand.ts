
import { ExecutionSpan } from '../runtime/models/ExecutionSpan';
import { IRuntimeMemory } from '../runtime/IRuntimeMemory';

export interface TrackerContext {
    memory: IRuntimeMemory;
}

export interface ITrackerCommand {
    /**
     * Executes the command and returns the resulting ExecutionSpans.
     * The command is responsible for updating the memory directly.
     */
    write(context: TrackerContext): ExecutionSpan[];
}
