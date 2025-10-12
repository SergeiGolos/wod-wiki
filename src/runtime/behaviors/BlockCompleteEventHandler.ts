import { IEventHandler } from '../IEventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { PopBlockAction } from '../PopBlockAction';
import { IRuntimeAction } from '../IRuntimeAction';

/**
 * BlockCompleteEventHandler listens for block:complete events
 * and triggers PopBlockAction to remove completed blocks from the stack.
 * 
 * This enables the automatic advancement through child blocks:
 * 1. Child block completes and emits block:complete
 * 2. This handler catches the event
 * 3. PopBlockAction is triggered
 * 4. Parent's next() is called, compiling the next child
 * 
 * Usage:
 * Register this handler in memory when blocks with children are created.
 */
export class BlockCompleteEventHandler implements IEventHandler {
    private _id: string;
    private _name: string;

    constructor(id: string) {
        this._id = id;
        this._name = 'block-complete-handler';
    }

    get id(): string {
        return this._id;
    }

    set id(value: string) {
        throw new Error('Cannot modify readonly property id');
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        throw new Error('Cannot modify readonly property name');
    }

    handler(event: any, runtime: IScriptRuntime): IRuntimeAction[] {
        // Only handle block:complete events
        if (event.name !== 'block:complete') {
            return [];
        }

        // Check if there's a current block on the stack
        const currentBlock = runtime.stack?.current;
        if (!currentBlock) {
            return [];
        }

        // Only pop if the event is for the current block (the child that completed)
        const completedBlockId = event.data?.blockId;
        const currentBlockId = currentBlock.key.toString();

        if (completedBlockId === currentBlockId) {
            // The current child block has completed, pop it
            console.log(`🔔 BlockCompleteEventHandler: Detected completion of ${completedBlockId}, triggering pop`);
            return [new PopBlockAction()];
        }

        return [];
    }
}
