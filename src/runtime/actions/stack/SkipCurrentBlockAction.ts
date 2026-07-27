import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import type { IRuntimeContext } from '../../contracts/IRuntimeContext';

/**
 * Action that skips the current segment (leaf block).
 * Only marks as complete if the current block is NOT the specified block (usually the root).
 */
export class SkipCurrentBlockAction implements IRuntimeAction {
    readonly type = 'skip-current-block';

    constructor(private readonly rootBlockId: string) { }

    do(runtime: IRuntimeContext): void {
        const current = runtime.stack.current;
        if (current && current.key.toString() !== this.rootBlockId) {
            // Mark current block as complete - stack will pop it during sweep
            current.markComplete('skipped');
        }
    }
}
