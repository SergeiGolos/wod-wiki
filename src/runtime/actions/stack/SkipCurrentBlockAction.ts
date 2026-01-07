import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';

/**
 * Action that skips the current segment (leaf block).
 * Only marks as complete if the current block is NOT the specified block (usually the root).
 */
export class SkipCurrentBlockAction implements IRuntimeAction {
    readonly type = 'skip-current-block';

    constructor(private readonly rootBlockId: string) { }

    do(runtime: IScriptRuntime): void {
        const current = runtime.stack.current;
        if (current && current.key.toString() !== this.rootBlockId) {
            // Mark current block as complete - stack will pop it during sweep
            current.markComplete('skipped');
        }
    }
}
