import { RuntimeStack, RuntimeStackOptions } from './RuntimeStack';
import { ExecutionTracker } from '../tracker/ExecutionTracker';
import { IScriptRuntime } from './IScriptRuntime';

/**
 * @deprecated Use RuntimeStack directly. This class now delegates to the unified RuntimeStack implementation.
 */
export class MemoryAwareRuntimeStack extends RuntimeStack {
  constructor(runtime: IScriptRuntime, tracker: ExecutionTracker, options: RuntimeStackOptions = {}) {
    super(runtime, tracker, options);
  }
}
