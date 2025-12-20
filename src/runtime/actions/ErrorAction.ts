import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';

/**
 * Runtime error information.
 * Captured errors are stored in the runtime's error list for centralized handling.
 */
export interface RuntimeError {
  /** The error that occurred */
  error: Error;
  /** Where the error occurred (block ID, handler ID, etc.) */
  source: string;
  /** When the error occurred */
  timestamp: Date;
  /** Additional context about the error */
  context?: any;

  blockKey?: string;
}

/**
 * Action for pushing errors to the runtime error list.
 * 
 * This action provides centralized error handling by collecting errors
 * in the runtime instead of using EventHandlerResponse.abort flags.
 * 
 * Actions can check `runtime.errors.length > 0` to abort processing.
 * 
 * @example
 * ```typescript
 * // Push an error during event handling
 * try {
 *   // ... some operation
 * } catch (error) {
 *   return [new ErrorAction(error as Error, 'TimerBehavior')];
 * }
 * 
 * // Check for errors before proceeding
 * if (runtime.errors && runtime.errors.length > 0) {
 *   return []; // Abort further processing
 * }
 * ```
 */
export class ErrorAction implements IRuntimeAction {
  readonly type = 'error';

  constructor(
    /** The error that occurred */
    public readonly error: Error,
    /** Source of the error (block ID, handler ID, etc.) */
    public readonly source: string,
    /** Additional context about the error */
    public readonly context?: any
  ) { }

  do(runtime: IScriptRuntime): void {
    // Initialize errors array if it doesn't exist
    if (!(runtime as any).errors) {
      (runtime as any).errors = [];
    }

    const runtimeError: RuntimeError = {
      error: this.error,
      source: this.source,
      timestamp: new Date(),
      context: this.context
    };

    (runtime as any).errors.push(runtimeError);

    console.error(`❌ Runtime Error from ${this.source}:`, this.error.message);
    if (this.context) {
      console.error(`   Context:`, this.context);
    }
  }
}
