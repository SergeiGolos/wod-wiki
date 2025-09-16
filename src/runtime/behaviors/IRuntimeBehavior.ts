import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeEvent, HandlerResponse } from "../EventHandler";
import { IRuntimeMemory } from "../memory/IRuntimeMemory";

/**
 * Behavior contract for composition over inheritance.
 * Blocks can declare a list of behaviors; behaviors can react to lifecycle and runtime events.
 */
export interface IRuntimeBehavior {
  /** Called once when the behavior is attached to a block and runtime is set */
  onAttach(runtime: IScriptRuntime, blockKey: string): void;
  /** Called when the owning block is pushed */
  onPush(memory: IRuntimeMemory): void;
  /** Called when the owning block is popped */
  onPop(memory: IRuntimeMemory): void;
  /** Generic event hook; return a handler response if the behavior handles it */
  onEvent(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse | undefined;
}
