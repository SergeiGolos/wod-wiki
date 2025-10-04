import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';

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
      console.error('NextAction: Invalid runtime state');
      return;
    }

    // Get current block
    const currentBlock = runtime.stack.current;
    if (!currentBlock) {
      console.log('NextAction: No current block to advance from');
      return;
    }

    try {
      // Execute block's next logic
      console.log(`NextAction: Advancing from block ${currentBlock.key.toString()}`);
      const nextActions = currentBlock.next();

      // Execute all returned actions
      for (const action of nextActions) {
        action.do(runtime);
      }

      console.log(`NextAction: Completed, new stack depth: ${runtime.stack.blocks.length}`);
    } catch (error) {
      console.error('NextAction: Error during execution advancement', error);
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