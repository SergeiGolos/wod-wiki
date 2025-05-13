import {
  IRuntimeAction,
  IRuntimeEvent,
  ITimerRuntime,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { AbstractBlockLifecycle } from "./AbstractBlockLifecycle";

/**
 * Legacy base class for runtime blocks, now extends AbstractBlockLifecycle
 * to leverage the template method pattern while maintaining backward compatibility
 */
export abstract class RuntimeBlock extends AbstractBlockLifecycle {  
  /**
   * Hook method implementation for the enter lifecycle phase
   * Called by the template method in the parent class
   */
  protected abstract doEnter(runtime: ITimerRuntime): IRuntimeAction[];
  
  /**
   * Hook method implementation for the next lifecycle phase
   * Called by the template method in the parent class
   */
  protected abstract doNext(runtime: ITimerRuntime): IRuntimeAction[];
  
  /**
   * Hook method implementation for the leave lifecycle phase
   * Called by the template method in the parent class
   */
  protected abstract doLeave(runtime: ITimerRuntime): IRuntimeAction[];
  

  // The get method is inherited from AbstractBlockLifecycle

  // Override the handle method from AbstractBlockLifecycle
  public handle(
    runtime: ITimerRuntime,
    event: IRuntimeEvent,
    system: EventHandler[]
  ): IRuntimeAction[] {
    const result: IRuntimeAction[] = [];
    for (const handler of [...system, ...this.handlers]) {
      const actions = handler.apply(event, runtime);
      for (const action of actions) {
        result.push(action);
      }
    }

    return result;
  }
}
