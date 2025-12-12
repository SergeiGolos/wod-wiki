import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';

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
      // Execute block's next logic
      const nextActions = currentBlock.next(runtime);

      // Execute all returned actions
      for (const action of nextActions) {
        action.do(runtime);
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

    // Check for undefined/null memory
    if (!runtime.memory) {
      return false;
    }

    // Check for runtime errors
    if (runtime.errors && runtime.errors.length > 0) {
      return false;
    }

    // Check for corrupted memory state
    if ((runtime.memory as any).state === 'corrupted') {
      return false;
    }

    return true;
  }
}
