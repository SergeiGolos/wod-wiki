
import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "../timer.types";

/**
 * Base class for action-event based state changes
 */
export abstract class EventAction implements IRuntimeAction {
    constructor(protected event: RuntimeEvent) {}

    abstract apply(runtime: ITimerRuntime): RuntimeEvent[];
}
