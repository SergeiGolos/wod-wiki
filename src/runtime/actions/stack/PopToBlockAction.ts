import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';

/**
 * Action that pops all blocks from the stack until reaching the target block.
 * The target block is NOT popped.
 * 
 * Used for force-completing a workout where nested blocks need to be unwound.
 */
export class PopToBlockAction implements IRuntimeAction {
    readonly type = 'pop-to-block';

    constructor(private readonly targetBlockId: string) { }

    do(runtime: IScriptRuntime): void {
        const MAX_ITERATIONS = 100; // Safety limit
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
            const current = runtime.stack.current;
            if (!current) {
                console.log(`[PopToBlockAction] Stack empty, stopping`);
                break;
            }

            if (current.key.toString() === this.targetBlockId) {
                console.log(`[PopToBlockAction] Reached target block: ${current.label}`);
                break;
            }

            console.log(`[PopToBlockAction] Popping: ${current.label}`);
            
            // Pop without triggering parent.next() by using a special flag
            // We need to bypass the normal popBlock flow to avoid re-pushing children
            this.popWithoutNexting(runtime);
            
            iterations++;
        }

        if (iterations >= MAX_ITERATIONS) {
            console.error(`[PopToBlockAction] Max iterations reached, possible infinite loop`);
        }
    }

    /**
     * Pop the current block without calling parent.next().
     * This prevents intermediate blocks from pushing new children during force-complete.
     */
    private popWithoutNexting(runtime: IScriptRuntime): void {
        const current = runtime.stack.current;
        if (!current) return;

        // Get unmount actions
        const unmountActions = current.unmount(runtime, {}) ?? [];

        // Pop from stack
        const popped = runtime.stack.pop();
        if (!popped) return;

        // Execute unmount actions immediately
        for (const action of unmountActions) {
            action.do(runtime);
        }

        // Dispose and cleanup
        popped.dispose(runtime);
        popped.context?.release?.();

        // NOTE: We intentionally do NOT call parent.next() here
        // This is the key difference from normal popBlock
    }
}
