import { IEventHandler, EventHandlerResponse } from './IEventHandler';
import { IScriptRuntime } from './IScriptRuntime';
import { NextAction } from './NextAction';

export class NextEventHandler implements IEventHandler {
  private _id: string;
  private _name: string;

  constructor(id: string) {
    this._id = id;
    this._name = 'next-handler';
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    throw new Error('Cannot modify readonly property id');
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    throw new Error('Cannot modify readonly property name');
  }

  handler(event: any, runtime: IScriptRuntime): EventHandlerResponse {
    // Event filtering
    if (event.name !== 'next') {
      return { handled: false, abort: false, actions: [] };
    }

    // Runtime state validation
    const validation = this.validateRuntimeState(runtime);
    if (!validation.isValid) {
      return {
        handled: true,
        abort: validation.shouldAbort,
        actions: []
      };
    }

    // Generate next action
    const action = new NextAction();
    return {
      handled: true,
      abort: false,
      actions: [action]
    };
  }

  private validateRuntimeState(runtime: IScriptRuntime): { isValid: boolean; shouldAbort: boolean } {
    // Check for null/undefined stack
    if (!runtime.stack) {
      return { isValid: false, shouldAbort: true };
    }

    // Check for runtime errors
    if (runtime.hasErrors && runtime.hasErrors()) {
      return { isValid: false, shouldAbort: true };
    }

    // Check for corrupted memory state
    if (runtime.memory && runtime.memory.state === 'corrupted') {
      return { isValid: false, shouldAbort: true };
    }

    // Check for missing current block (not an error condition)
    if (!runtime.stack.current) {
      return { isValid: false, shouldAbort: false };
    }

    return { isValid: true, shouldAbort: false };
  }
}