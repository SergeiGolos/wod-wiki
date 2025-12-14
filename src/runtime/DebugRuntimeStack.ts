import { RuntimeStack, RuntimeStackOptions } from './RuntimeStack';
import { ExecutionTracker } from '../tracker/ExecutionTracker';
import { IScriptRuntime } from './IScriptRuntime';

/**
 * @deprecated DebugRuntimeStack now delegates to the unified RuntimeStack with debugMode enabled.
 */
export class DebugRuntimeStack extends RuntimeStack {
    constructor(runtime: IScriptRuntime, tracker: ExecutionTracker, options: RuntimeStackOptions = {}) {
        super(runtime, tracker, { ...options, debugMode: true });
    }
}
