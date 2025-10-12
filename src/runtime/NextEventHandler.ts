import { IEventHandler } from './IEventHandler';
import { IScriptRuntime } from './IScriptRuntime';
import { NextAction } from './NextAction';
import { IRuntimeAction } from './IRuntimeAction';
import { ErrorAction } from './actions/ErrorAction';

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

  set id(_value: string) {
    throw new Error('Cannot modify readonly property id');
  }

  get name(): string {
    return this._name;
  }

  set name(_value: string) {
    throw new Error('Cannot modify readonly property name');
  }

  handler(event: any, runtime: IScriptRuntime): IRuntimeAction[] {
    // Event filtering
    if (event.name !== 'next') {
      return [];
    }

    // Runtime state validation
    const validation = this.validateRuntimeState(runtime);
    if (!validation.isValid) {
      // If should abort, push an error
      if (validation.shouldAbort && validation.error) {
        return [new ErrorAction(validation.error, 'NextEventHandler')];
      }
      return [];
    }

    // Generate next action
    const action = new NextAction();
    return [action];
  }

  private validateRuntimeState(runtime: IScriptRuntime): { 
    isValid: boolean; 
    shouldAbort: boolean;
    error?: Error;
  } {
    // Check for null/undefined stack
    if (!runtime.stack) {
      return { 
        isValid: false, 
        shouldAbort: true,
        error: new Error('Runtime stack is not available')
      };
    }

    // Check for runtime errors
    if (runtime.errors && runtime.errors.length > 0) {
      return { 
        isValid: false, 
        shouldAbort: true,
        error: new Error(`Runtime has ${runtime.errors.length} error(s)`)
      };
    }

    // Check for missing current block (not an error condition)
    if (!runtime.stack.current) {
      return { isValid: false, shouldAbort: false };
    }

    return { isValid: true, shouldAbort: false };
  }
}