import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import type { RuntimeMetric } from "@/core/types/RuntimeMetric";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { JitStatement } from "@/core/types/JitStatement";
import { BlockKey } from "@/core/types/BlockKey";
import { ResultSpanBuilder } from "@/core/metrics/ResultSpanBuilder";
import { WriteLogAction } from "../outputs/WriteLogAction";

/**
 * Legacy base class for runtime blocks, now extends AbstractBlockLifecycle
 * to leverage the template method pattern while maintaining backward compatibility
 */
export abstract class RuntimeBlock implements IRuntimeBlock {  
  constructor(    
    public key: BlockKey, 
    public metrics: RuntimeMetric[],
    public spans: ResultSpanBuilder = new ResultSpanBuilder(),
    public parent?: IRuntimeBlock | undefined
  ) {    
    this.duration = undefined;
  }
  
  public duration?: number | undefined; // Duration of the block, if applicable
  public handlers: EventHandler[] = [];
      
  // Renamed original abstract methods to be protected hooks
  protected abstract onNext(runtime: ITimerRuntime): IRuntimeAction[];
        
  public next(runtime: ITimerRuntime): IRuntimeAction[] {
    // Space for common code toonsole.log(`⚡ Action: ${action.name} run before the specific block's onNext logic
    this.key.index += 1;
    console.log(`----- doNext -----: ${this.key} -- ${this.constructor.name}`);
    const actions = this.onNext(runtime);
    // Space for common code to run after the specific block's onNext logic
    return actions;
  }

  public handle(
    runtime: ITimerRuntime,
    event: IRuntimeEvent,
    system: EventHandler[]
  ): IRuntimeAction[] {
    const result: IRuntimeAction[] = [];
    
    // Don't log tick events to reduce noise
    if (event.name !== "tick") {
      console.log(`🔔 Event ${event.name} received by block: ${this.constructor.name} [${this.key}]`);
    }
    
    for (const handler of [...system, ...this.handlers]) {
      // Check if this handler handles this event type
      if (event.name === handler.eventType) {
        const log = [];
        
        // Log event handling (except for tick events to reduce noise)
        if (event.name !== "tick") {
          log.push(new WriteLogAction({ blockId: this.key.toString(), blockKey: this.key.toString(), ...event }));
          console.log(`🔍 ${handler.constructor.name} handling ${event.name} event in block: ${this.constructor.name} [${this.key}]`);
        }
        
        // Get actions from the handler
        const actions = handler.apply(event, runtime, this);
        
        // Log actions being returned (except for tick events)
        if (event.name !== "tick" && actions.length > 0) {
          console.log(`📃 ${handler.constructor.name} returning ${actions.length} actions: ${actions.map(a => a.name).join(', ')}`);
        }
        
        result.push(...log, ...actions);
      }
    }

    return result;
  }

  /**
   * Retrieves a sequence of consecutive child JitStatements that are part of a 'compose' group.
   * Iteration starts from the given startIndex and continues as long as subsequent statements
   * have a LapFragment with group type 'compose'.
   * 
   * @param startIndex The index in `this.sources` to start looking for the compose group.
   * @returns An array of JitStatement objects belonging to the consecutive compose group.
   */  public nextChildStatements(runtime: ITimerRuntime, startIndex: number): JitStatement[] {
    const groupStatements: JitStatement[] = [];
    
    // TODO: During migration, use legacy sources if available
    if (!this._legacySources) {
      return groupStatements; // Return empty if no legacy sources available
    }
    
    const sources = this._legacySources.flatMap((s: JitStatement) => s.children);
    if (startIndex < 0 || startIndex >= sources.length) {
      // Return empty if startIndex is out of bounds
      return groupStatements;
    }
    
    // Get the first item and check its lap value
    let current = runtime.script.getId(sources[startIndex])[0];
    let increment = current.lap(startIndex);
    
    // Add the first item
    groupStatements.push(current);
    
    // Only continue if increment is + and more items exist
    let currentIndex = startIndex;
    while (increment && increment.image === "+" && ++currentIndex < sources.length) {
      // Get the next item
      current = runtime.script.getId(sources[currentIndex])[0];
      increment = current.lap(currentIndex);
      
      // Only add it if it has a + lap value
      if (increment && increment.image === "+") {
        groupStatements.push(current);
      } else {
        // If not +, stop the loop without incrementing or including
        break;
      }
    }
    
    return groupStatements;
  }
}
