import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IScriptRuntime } from './IScriptRuntime';

/**
 * Action that pushes a compiled block onto the runtime stack.
 * Used by behaviors to add child blocks for execution.
 */
export class PushBlockAction implements IRuntimeAction {
    private _type = 'push-block';

    constructor(public readonly block: IRuntimeBlock) {}

    get type(): string {
        return this._type;
    }

    set type(value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        if (!runtime.stack) {
            console.error('PushBlockAction: No stack available');
            return;
        }

        try {
            console.log(`PushBlockAction: Pushing block ${this.block.key.toString()} onto stack`);
            
            // Push the block onto the stack
            runtime.stack.push(this.block);
            
            // Call the block's push() method to get any initial actions
            const pushActions = this.block.push();
            
            // Execute any returned actions
            for (const action of pushActions) {
                action.do(runtime);
            }
            
            console.log(`PushBlockAction: Successfully pushed block, new stack depth: ${runtime.stack.blocks.length}`);
        } catch (error) {
            console.error('PushBlockAction: Error pushing block', error);
            runtime.setError?.(error);
        }
    }
}
