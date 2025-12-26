import { RuntimeSpan } from '../runtime/models/RuntimeSpan';
import { IRuntimeMemory } from '../runtime/IRuntimeMemory';

export interface TrackerContext {
    memory: IRuntimeMemory;
}

export interface ITrackerCommand {
    /**
     * Executes the command and returns the resulting RuntimeSpans.
     * The command is responsible for updating the memory directly.
     */
    write(context: TrackerContext): RuntimeSpan[];
}
