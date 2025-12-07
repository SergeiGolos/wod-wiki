import { RuntimeStack } from './RuntimeStack';
import { ExecutionTracker } from './ExecutionTracker';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeOptions } from './IRuntimeOptions';

/**
 * @deprecated DebugRuntimeStack now delegates to the unified RuntimeStack with debugMode enabled.
 */
export class DebugRuntimeStack extends RuntimeStack {
    constructor(runtime: IScriptRuntime, tracker: ExecutionTracker, options: IRuntimeOptions = {}) {
        super(runtime, tracker, { ...options, debugMode: true });
    }
}
