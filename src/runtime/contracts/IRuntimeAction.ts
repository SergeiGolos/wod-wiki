import { IScriptRuntime } from "./IScriptRuntime";

/**
 * Interface for actions that can be performed by the runtime in response to events.
 */

export interface IRuntimeAction {
  /** Type of action to perform */
  type: string;
  
  /** Target of the action (optional) */
  target?: string;

  /** Action payload/data */
  payload?: unknown;

  /** Executes the action within the given runtime context */
  do(runtime: IScriptRuntime): void;
}
