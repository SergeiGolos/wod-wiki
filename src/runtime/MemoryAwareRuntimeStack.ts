import { RuntimeStack } from './RuntimeStack';
import { ExecutionTracker } from './ExecutionTracker';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeOptions } from './IRuntimeOptions';

/**
 * @deprecated Use RuntimeStack directly. This class now delegates to the unified RuntimeStack implementation.
 */
export class MemoryAwareRuntimeStack extends RuntimeStack {
  constructor(runtime: IScriptRuntime, tracker: ExecutionTracker, options: IRuntimeOptions = {}) {
    super(runtime, tracker, options);
  }
}
