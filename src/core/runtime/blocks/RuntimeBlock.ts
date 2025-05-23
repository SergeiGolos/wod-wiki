import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import type { RuntimeMetric } from "@/core/RuntimeMetric";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { BlockKey } from "@/core/BlockKey";
import { ResultSpanBuilder } from "@/core/metrics/ResultSpanBuilder";
import { RuntimeBlockMetrics } from "@/core/metrics/RuntimeBlockMetrics";
import { IMetricCompositionStrategy } from "@/core/metrics/IMetricCompositionStrategy";
import { ITimeSpan } from "@/core/ITimeSpan";

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
  
  public leaf: boolean = false; // indicates leaf-level block
  
  private spanBuilder: ResultSpanBuilder = new ResultSpanBuilder();
  private _spans: RuntimeSpan[] = [];
  public handlers: EventHandler[] = [];
  public metricCompositionStrategy?: IMetricCompositionStrategy;
  
  // Updated to implement the spans() method from the interface
  public spans(): RuntimeSpan[] {
    return this._spans;
  }
  
  // Added to implement addSpan method
  public addSpan(span: RuntimeSpan): void {
    this._spans.push(span);
  }
  
  /**
   * Get the ResultSpanBuilder to create and manage spans for this block
   * @returns The ResultSpanBuilder instance for this block
   */
  public getSpanBuilder(): ResultSpanBuilder {
    return this.spanBuilder.ForBlock(this);
  }
  
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
  // New protected abstract lifecycle methods
  protected abstract onBlockStart(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract onBlockStop(runtime: ITimerRuntime): IRuntimeAction[];

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
    // Use the new metrics method instead of the deprecated composeMetrics
    const metrics = this.metrics(runtime);
    
    // Check if we have an active span that hasn't been stopped
    const currentSpan = this._spans.length > 0 ? this._spans[this._spans.length - 1] : null;
    let span: RuntimeSpan;
    
    if (currentSpan && currentSpan.timeSpans.length > 0 && 
        !currentSpan.timeSpans[currentSpan.timeSpans.length - 1].stop) {
      // Last span has an active timespan - add a new timespan to it
      span = currentSpan;
      const newTimeSpan: ITimeSpan = {
        start: { name: 'block_started', timestamp: new Date(), blockKey: this.blockKey.toString() },
        blockKey: this.blockKey.toString()
      };
      span.timeSpans.push(newTimeSpan);
    } else {
      // Create a completely new span using a fresh builder
      const builder = new ResultSpanBuilder();
      
      // Create, start, and get the new span
      span = builder.Create(metrics).Start().Current();
        
      // Ensure blockKey is set on the span and its timespan start
      span.blockKey = this.blockKey.toString();
      
      if (span.timeSpans.length > 0 && span.timeSpans[0].start) {
        span.timeSpans[0].start.blockKey = this.blockKey.toString();
      }
      
      // Store the span
      this._spans.push(span);
    }

    // Call the abstract method for block-specific actions
    const actions = this.onBlockStart(runtime);
    return actions;
  }  public onStop(runtime: ITimerRuntime): IRuntimeAction[] {
    const currentSpan = this._spans.length > 0 ? this._spans[this._spans.length - 1] : undefined;
    
    if (currentSpan && currentSpan.timeSpans.length > 0) {
      // Get the last timespan
      const lastTimeSpan = currentSpan.timeSpans[currentSpan.timeSpans.length - 1];
      
      // If it doesn't have a stop time yet, add one
      if (!lastTimeSpan.stop) {
        lastTimeSpan.stop = { 
          name: 'block_stopped', 
          timestamp: new Date(), 
          blockKey: this.blockKey.toString() 
        };
      }
    } else {
      // If there's no current span or it has no timespans, this is an error condition
      console.warn(`RuntimeBlock ${this.blockKey}: onStop called but no active timespan exists`);
    }

    // Call the abstract method for block-specific actions
    const actions = this.onBlockStop(runtime);
    return actions;
  }

  /**
   * Generates a complete set of metrics for this runtime block using the RuntimeMetricBuilder.
   * This method provides a simplified way to collect metrics from fragments by type.
   * 
   * @param runtime The timer runtime instance
   * @returns An array of RuntimeMetric objects containing effort, repetitions, distance, and resistance
   */
  public metrics(runtime: ITimerRuntime): RuntimeMetric[] {
    // If a composition strategy is defined, use it
    if (this.metricCompositionStrategy) {
      return this.metricCompositionStrategy.composeMetrics(this, runtime);
    }
    
    // Otherwise use the utility class to build metrics from all sources
    return RuntimeBlockMetrics.buildMetrics(runtime, this.sources);
  }
}
