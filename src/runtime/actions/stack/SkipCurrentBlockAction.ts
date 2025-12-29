import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { PopBlockAction } from './PopBlockAction';

/**
 * Action that skips the current segment (leaf block).
 * Only pops if the current block is NOT the specified block (usually the root).
 */
export class SkipCurrentBlockAction implements IRuntimeAction {
    readonly type = 'skip-current-block';

    constructor(private readonly rootBlockId: string) { }

    do(runtime: IScriptRuntime): void {
        const current = runtime.stack.current;
        if (current && current.key.toString() !== this.rootBlockId) {
            new PopBlockAction().do(runtime);
        }
    }
}
