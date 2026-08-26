import { IEvent } from '../contracts/events/IEvent';
import { IEventHandler } from '../contracts/events/IEventHandler';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { AbortSessionAction } from '../actions/stack/AbortSessionAction';

/**
 * Handles the 'abort' event by initiating an emergency session termination.
 *
 * When dispatched, this handler returns an AbortSessionAction that drains the
 * entire runtime stack — calling proper lifecycle methods on each block so that
 * all open segments receive matching completion outputs.
 *
 * Registered globally in ScriptRuntime (scope: 'global') so it fires regardless
 * of which block is currently active on the stack.
 *
 * @example
 * // Trigger an abort from UI or test code:
 * runtime.handle({ name: 'abort', timestamp: new Date(), data: {} });
 */
export class AbortEventHandler implements IEventHandler {
    private readonly _id: string;

    constructor(id: string) {
        this._id = id;
    }

    get id(): string {
        return this._id;
    }

    set id(_value: string) {
        throw new Error('Cannot modify readonly property id');
    }

    get name(): string {
        return 'abort-handler';
    }

    set name(_value: string) {
        throw new Error('Cannot modify readonly property name');
    }

    handler(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[] {
        if (event.name !== 'abort') {
            return [];
        }

        if (!runtime || !runtime.stack) {
            return [];
        }

        // Nothing to abort if the stack is already empty
        if (runtime.stack.count === 0) {
            return [];
        }

        return [new AbortSessionAction()];
    }
}
