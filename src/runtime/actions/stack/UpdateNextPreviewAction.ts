import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeFragment } from '../../../core/models/CodeFragment';
import { MemoryLocation } from '../../memory/MemoryLocation';

/**
 * UpdateNextPreviewAction resolves the next child statement(s) and stores
 * their fragments in the block's `fragment:next` memory location.
 *
 * ## Purpose
 *
 * Behaviors (ChildRunnerBehavior) cannot access `runtime.script` directly —
 * it's only available in `IRuntimeAction.do(runtime)`. This action bridges
 * the gap: the behavior returns this action with statement IDs, and the
 * action looks up the fragments and pushes them into block memory.
 *
 * ## Memory Contract
 *
 * - Tag: `fragment:next`
 * - Value: `ICodeFragment[]` from the next statement(s) to be compiled
 * - When `nextStatementIds` is empty, any existing `fragment:next` memory
 *   is cleared (updated to empty fragments) to signal "no more children".
 *
 * ## Consumed By
 *
 * - `useNextPreview` hook → `LookaheadView` component
 * - The UI walks the stack leaf-to-root and shows the deepest block's
 *   `fragment:next` as the "Up Next" preview.
 */
export class UpdateNextPreviewAction implements IRuntimeAction {
    readonly type = 'update-next-preview';
    readonly target?: string;
    readonly payload?: unknown;

    constructor(
        private readonly blockKey: string,
        private readonly nextStatementIds: number[]
    ) {
        this.target = blockKey;
        this.payload = { nextStatementIds };
    }

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        // Find the block on the stack
        const block = runtime.stack.blocks.find(
            b => b.key.toString() === this.blockKey
        );

        if (!block) return [];

        // Get existing fragment:next locations
        const existingLocs = block.getMemoryByTag('fragment:next');

        if (this.nextStatementIds.length === 0) {
            // Clear: update existing locations to empty, or do nothing if none exist
            for (const loc of existingLocs) {
                loc.update([]);
            }
            return [];
        }

        // Look up statement fragments from the script
        const script = runtime.script;
        if (!script) return [];

        const fragments: ICodeFragment[] = [];
        for (const id of this.nextStatementIds) {
            const statement = script.getId(id);
            if (statement) {
                fragments.push(...statement.fragments);
            }
        }

        if (fragments.length === 0) {
            // No fragments found — clear any existing preview
            for (const loc of existingLocs) {
                loc.update([]);
            }
            return [];
        }

        if (existingLocs.length > 0) {
            // Update the first existing location
            existingLocs[0].update(fragments);
        } else {
            // Push a new memory location
            block.pushMemory(new MemoryLocation('fragment:next', fragments));
        }

        return [];
    }
}
