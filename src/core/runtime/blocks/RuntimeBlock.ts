import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { JitStatement } from "@/core/JitStatement";
import { LapFragment } from "@/core/fragments/LapFragment";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { BlockKey } from "@/core/BlockKey";
import { IncrementFragment } from "@/core/fragments/IncrementFragment";

/**
 * Legacy base class for runtime blocks, now extends AbstractBlockLifecycle
 * to leverage the template method pattern while maintaining backward compatibility
 */
export abstract class RuntimeBlock implements IRuntimeBlock {  
  constructor(public sources: JitStatement[]) {    
    this.blockId = Math.random().toString(36).substring(2, 15);
    this.blockKey = new BlockKey();
    this.blockKey.push(this.sources, 0);
  }
  public blockId: string;
  public blockKey: BlockKey;
  public parent?: IRuntimeBlock | undefined;
  
  public spans: RuntimeSpan[] = [];
  public handlers: EventHandler[] = [];
  
  public selectMany<T>(fn: (node: JitStatement) => T[]): T[] {
    let results: T[] = [];
    for (const source of this.sources) {
      results = results.concat(fn(source));
    }
    return results;
  }

  // Renamed original abstract methods to be protected hooks
  protected abstract onEnter(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract onLeave(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract onNext(runtime: ITimerRuntime): IRuntimeAction[];

  // New public wrapper methods providing space for common logic
  public enter(runtime: ITimerRuntime): IRuntimeAction[] {
    // Space for common code to run before the specific block's onEnter logic
    this.blockKey = BlockKey.create(this);
    console.log(`>>>>> doEnter >>>>>: ${this.blockKey} -- ${this.constructor.name}`);
    const actions = this.onEnter(runtime);
    // Space for common code to run after the specific block's onEnter logic
    return actions;
  }

  public leave(runtime: ITimerRuntime): IRuntimeAction[] {
    // Space for common code to run before the specific block's onLeave logic    
    const actions = this.onLeave(runtime);
    console.log(`<<<<< doLeave <<<<<: ${this.blockKey} -- ${this.constructor.name}`);
    // Space for common code to run after the specific block's onLeave logic
    return actions;
  }

  public next(runtime: ITimerRuntime): IRuntimeAction[] {
    // Space for common code toonsole.log(`⚡ Action: ${action.name} run before the specific block's onNext logic
    this.blockKey.index += 1;
    console.log(`----- doNext -----: ${this.blockKey} -- ${this.constructor.name}`);
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
      console.log(`🔔 Event ${event.name} received by block: ${this.constructor.name} [${this.blockKey}]`);
    }
    
    for (const handler of [...system, ...this.handlers]) {
      const actions = handler.apply(event, runtime);
      
      // Only log non-tick handlers that actually generated actions
      if (event.name !== "tick" && actions.length > 0) {
        console.log(`🧩 Handler ${handler.constructor.name} triggered by ${event.name} in ${this.constructor.name}`);
      }
      
      for (const action of actions) {
        result.push(action);
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
   */
  public nextChildStatements(runtime: ITimerRuntime, startIndex: number): JitStatement[] {
    const groupStatements: JitStatement[] = [];
    const sources = this.sources.flatMap(s => s.children);
    if (startIndex < 0 || startIndex >= this.sources.length) {
      // Return empty if startIndex is out of bounds
      return groupStatements;
    }
    let current: JitStatement | undefined;
    let increment: IncrementFragment | undefined;
    do {
      current = runtime.script.getId(sources[startIndex])[0];
      groupStatements.push(current);
      
      increment = current.increment(startIndex);
      startIndex++;      
    } while (startIndex < sources.length && increment && increment.image === "+");    
    
    return groupStatements;
  }
}
