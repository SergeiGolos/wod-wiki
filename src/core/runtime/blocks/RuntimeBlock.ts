import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import type { RuntimeMetric } from "@/core/RuntimeMetric";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { JitStatement } from "@/core/JitStatement";
import { BlockKey } from "@/core/BlockKey";
import { ResultSpanBuilder } from "@/core/metrics/ResultSpanBuilder";
import { WriteResultAction } from "../outputs/WriteResultAction";
import { WriteLogAction } from "../outputs/WriteLogAction";
import { RuntimeSpan } from "@/core/RuntimeSpan";

/**
 * Legacy base class for runtime blocks, now extends AbstractBlockLifecycle
 * to leverage the template method pattern while maintaining backward compatibility
 */
export abstract class RuntimeBlock implements IRuntimeBlock {  
  constructor(public compiledMetrics: RuntimeMetric[], legacySources?: JitStatement[]) {    
    this.blockId = Math.random().toString(36).substring(2, 15);
    this.blockKey = new BlockKey();
    
    // For backward compatibility, we still need to handle sources for some operations
    // TODO: This will be removed in future phases as we eliminate all fragment dependencies
    if (legacySources && legacySources.length > 0) {
      this.blockKey.push(legacySources, 0);    
      this.duration = legacySources[0].duration(this.blockKey).original;
      this._legacySources = legacySources;
    } else {
      // Use compiled metrics to determine duration (if available)
      this.duration = undefined; // Will be calculated from metrics in future implementation
    }
  }  public duration?: number | undefined; // Duration of the block, if applicable
  public blockId: string;
  public blockKey: BlockKey;
  public parent?: IRuntimeBlock | undefined;
  
  public leaf: boolean = false; // indicates leaf-level block  
  private spanBuilder: ResultSpanBuilder = new ResultSpanBuilder();  
  public handlers: EventHandler[] = [];
    // Temporary property for backward compatibility during migration
  // TODO: Remove this once all fragment-dependent operations are updated
  protected _legacySources?: JitStatement[];
      
  /**
   * Get the ResultSpanBuilder to create and manage spans for this block
   * @returns The ResultSpanBuilder instance for this block
   */
  public getSpanBuilder(): ResultSpanBuilder {
    return this.spanBuilder;
  }
  
  /**
   * Temporary method to access spans for testing compatibility
   * @returns Array of RuntimeSpan objects from the span builder without auto-closing
   */
  public spans(): RuntimeSpan[] {
    // Access the private spans array directly without calling Build() to avoid auto-closing
    return [...(this.spanBuilder as any).spans];
  }
    public selectMany<T>(fn: (node: JitStatement) => T[]): T[] {
    let results: T[] = [];
    // TODO: During migration, use legacy sources if available
    // In future implementation, this method may need to be redesigned or removed
    if (this._legacySources) {
      for (const source of this._legacySources) {
        results = results.concat(fn(source));
      }
    }
    return results;
  }

  // Renamed original abstract methods to be protected hooks
  protected abstract onEnter(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract onLeave(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract onNext(runtime: ITimerRuntime): IRuntimeAction[];
  // New protected abstract lifecycle methods
  protected abstract onBlockStart(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract onBlockStop(runtime: ITimerRuntime): IRuntimeAction[];

  // New public wrapper methods providing space for common logic
  public enter(runtime: ITimerRuntime): IRuntimeAction[] {    
    console.log(`>>>>> doEnter >>>>>: ${this.blockKey} -- ${this.constructor.name}`);    
    this.spanBuilder.Create(this, this.metrics(runtime) ?? []);
    const actions = this.onEnter(runtime);
    // Space for common code to run after the specific block's onEnter logic
    return actions;
  }

  public leave(runtime: ITimerRuntime): IRuntimeAction[] {
    // Space for common code to run before the specific block's onLeave logic    
    console.log(`<<<<< doLeave <<<<<: ${this.blockKey} -- ${this.constructor.name}`);
    const actions = this.onLeave(runtime);    
    // Space for common code to run after the specific block's onLeave logic
    return [...actions, new WriteResultAction(this.spanBuilder.Build())];
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
      // Check if this handler handles this event type
      if (event.name === handler.eventType) {
        const log = [];
        
        // Log event handling (except for tick events to reduce noise)
        if (event.name !== "tick") {
          log.push(new WriteLogAction({ blockId: this.blockId, blockKey: this.blockKey.toString(), ...event }));
          console.log(`🔍 ${handler.constructor.name} handling ${event.name} event in block: ${this.constructor.name} [${this.blockKey}]`);
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

  // Lifecycle methods implementation 
  public onStart(runtime: ITimerRuntime): IRuntimeAction[] {
    // Ensure a span is created if none exists (for backward compatibility with tests)
    try {
      this.getSpanBuilder().Start();
    } catch (error) {
      // If Start() fails because no span exists, create one and try again
      this.getSpanBuilder().Create(this, this.metrics(runtime) ?? []);
      this.getSpanBuilder().Start();
    }
    
    return this.onBlockStart(runtime);      
  }

  // Lifecycle methods implementation 
  public onStop(runtime: ITimerRuntime): IRuntimeAction[] {
    // Ensure we have a span to stop (defensive programming)
    try {
      this.getSpanBuilder().Stop();
    } catch (error) {
      // If we don't have a span, that's ok for stop operations
      console.warn("onStop called but no active span to stop");
    }
    
    return this.onBlockStop(runtime);      
  }
     /**
   * Returns the pre-compiled metrics for this runtime block.
   * These metrics were compiled from fragments during JIT compilation.
   * 
   * @param runtime The timer runtime instance (kept for compatibility)
   * @returns An array of RuntimeMetric objects containing effort, repetitions, distance, and resistance
   */
  public metrics(runtime: ITimerRuntime): RuntimeMetric[] {    
    // Return the pre-compiled metrics that were set during JIT compilation
    return this.compiledMetrics;
  }
}
