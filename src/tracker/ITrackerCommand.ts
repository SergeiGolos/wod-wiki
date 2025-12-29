import { IRuntimeMemory } from '../runtime/contracts/IRuntimeMemory';
import { RuntimeSpan } from '../runtime/models/RuntimeSpan';

/**
 * Context passed to tracker commands for execution.
 */
export interface TrackerContext {
    memory: IRuntimeMemory;
}

/**
 * Interface for tracker commands following the Command Pattern.
 */
export interface ITrackerCommand {
    write(context: TrackerContext): RuntimeSpan[];
}
