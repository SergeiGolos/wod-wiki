
import { TrackedSpan } from '../runtime/models/ExecutionSpan';
import { IRuntimeMemory } from '../runtime/IRuntimeMemory';

export interface TrackerContext {
    memory: IRuntimeMemory;
}

export interface ITrackerCommand {
    /**
     * Executes the command and returns the resulting TrackedSpans.
     * The command is responsible for updating the memory directly.
     */
    write(context: TrackerContext): TrackedSpan[];
}
