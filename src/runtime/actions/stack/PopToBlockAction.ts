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

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        const MAX_ITERATIONS = 100; // Safety limit
        let iterations = 0;
        const allActions: IRuntimeAction[] = [];

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
            
            // Pop without triggering parent.next() or event emissions
            const actions = this.popSilently(runtime);
            allActions.push(...actions);
            
            iterations++;
        }

        if (iterations >= MAX_ITERATIONS) {
            console.error(`[PopToBlockAction] Max iterations reached, possible infinite loop`);
        }

        return allActions;
    }

    /**
     * Pop the current block silently - no parent.next(), no event emissions.
     * Only returns safe unmount actions (display cleanup, etc).
     * This prevents intermediate blocks from pushing new children or triggering
     * cascading events during force-complete.
     */
    private popSilently(runtime: IScriptRuntime): IRuntimeAction[] {
        const current = runtime.stack.current;
        if (!current) return [];

        // Get unmount actions but filter out event emissions to prevent cascades
        const unmountActions = current.unmount(runtime, {}) ?? [];
        const safeActions = unmountActions.filter(action => 
            action.type !== 'emit-event'
        );

        // Pop from stack
        const popped = runtime.stack.pop();
        if (!popped) return [];

        // Dispose and cleanup
        popped.dispose(runtime);
        popped.context?.release?.();

        // NOTE: We intentionally do NOT call parent.next() here
        // and we filter out emit-event actions to prevent cascades
        return safeActions;
    }
}
