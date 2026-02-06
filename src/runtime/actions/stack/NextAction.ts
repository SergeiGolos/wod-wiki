import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { SnapshotClock } from '../../RuntimeClock';

export class NextAction implements IRuntimeAction {
  readonly type = 'next';

  do(runtime: IScriptRuntime): void {
    // Validate runtime state
    if (!this.validateRuntimeState(runtime)) {
      return;
    }

    // Get current block
    const currentBlock = runtime.stack.current;
    if (!currentBlock) {
      return;
    }

    try {
      // Create lifecycle options with snapshot clock if clock is available
      // This ensures any child blocks pushed during next() start at the same time
      const lifecycleOptions = runtime.clock 
        ? { clock: SnapshotClock.now(runtime.clock) } 
        : undefined;

      // Execute block's next logic with the snapshot clock (if available)
      const nextActions = currentBlock.next(runtime, lifecycleOptions);

      // Push actions in reverse order for LIFO processing so the first
      // action in the list executes first
      for (let i = nextActions.length - 1; i >= 0; i--) {
        runtime.do(nextActions[i]);
      }

    } catch (error) {
      // Add error to runtime errors array if available
      if (runtime.errors && Array.isArray(runtime.errors)) {
        runtime.errors.push({
          error: error as Error,
          source: 'NextAction',
          timestamp: new Date(),
          blockKey: currentBlock.key.toString()
        });
      }
    }
  }

  private validateRuntimeState(runtime: IScriptRuntime): boolean {
    // Check for undefined/null stack
    if (!runtime.stack) {
      return false;
    }

    // Check for runtime errors
    if (runtime.errors && runtime.errors.length > 0) {
      return false;
    }

    return true;
  }
}
