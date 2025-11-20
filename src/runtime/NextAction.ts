import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';
import { NextBlockLogger } from './NextBlockLogger';

export class NextAction implements IRuntimeAction {
  private _type = 'next';

  get type(): string {
    return this._type;
  }

  set type(value: string) {
    throw new Error('Cannot modify readonly property type');
  }

  do(runtime: IScriptRuntime): void {
    // Validate runtime state
    if (!this.validateRuntimeState(runtime)) {
      NextBlockLogger.logValidationFailure('Invalid runtime state', {
        hasStack: !!runtime.stack,
        hasMemory: !!runtime.memory,
        hasErrors: runtime.Errors?.() || false,
      });
      return;
    }

    // Get current block
    const currentBlock = runtime.stack.current;
    if (!currentBlock) {
      NextBlockLogger.logValidationFailure('No current block to advance from', {
        stackDepth: runtime.stack.blocks.length,
      });
      return;
    }

    try {
      // Log start of next action
      NextBlockLogger.logNextActionStart(
        currentBlock.key.toString(),
        runtime.stack.blocks.length
      );

      // Execute block's next logic
      const nextActions = currentBlock.next(runtime);

      // Execute all returned actions
      for (const action of nextActions) {
        action.do(runtime);
      }

      // Log completion
      NextBlockLogger.logNextActionComplete(
        runtime.stack.blocks.length,
        nextActions.length
      );
    } catch (error) {
      NextBlockLogger.logError('next-action', error as Error, {
        blockKey: currentBlock.key.toString(),
        stackDepth: runtime.stack.blocks.length,
      });
      runtime.setError(error);
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
    if (runtime.hasErrors && typeof runtime.hasErrors === 'function' && runtime.hasErrors()) {
      return false;
    }

    // Check for corrupted memory state
    if (runtime.memory.state === 'corrupted') {
      return false;
    }

    return true;
  }
}
