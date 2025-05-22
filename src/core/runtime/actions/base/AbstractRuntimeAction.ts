import { IRuntimeAction } from "@/core/IRuntimeAction";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { OutputEvent } from "@/core/OutputEvent";
import { Subject } from "rxjs";

/**
 * Abstract base class for runtime actions that provides a templated implementation
 * of the IRuntimeAction interface.
 * 
 * Subclasses should implement the applyBlock method which defines how the action
 * is applied to a specific runtime block.
 */
export abstract class AbstractRuntimeAction implements IRuntimeAction {
  /**
   * The name of the action
   */
  abstract name: string;

  /**
   * Implementation of the IRuntimeAction interface
   * This template method delegates to the abstract applyBlock method
   */
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    // Subclasses will determine which block(s) to act on and how
    this.applyImplementation(runtime);
  }

  /**
   * Abstract method that defines how the action should be applied to a specific block
   * @param runtime The runtime environment
   * @param block The block to apply the action to
   */
  protected abstract applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void;

  /**
   * Protected implementation method that subclasses will override to define
   * their specific behavior regarding which blocks to apply the action to
   * @param runtime The runtime environment
   */
  protected abstract applyImplementation(runtime: ITimerRuntime): void;
}