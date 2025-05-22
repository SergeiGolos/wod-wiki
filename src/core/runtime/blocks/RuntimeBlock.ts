import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { IMetricCompositionStrategy } from "../metrics/IMetricCompositionStrategy";
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
  public metricCompositionStrategy?: IMetricCompositionStrategy;
  
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
    let currentSpan = this.spans[this.spans.length - 1];
    if (!currentSpan || (currentSpan.timeSpans.length > 0 && currentSpan.timeSpans[currentSpan.timeSpans.length - 1].stop)) {
      currentSpan = new RuntimeSpan();
      currentSpan.blockKey = this.blockKey; // Associate blockKey with the span
      this.spans.push(currentSpan);
    }

    const newTimeSpan: ITimeSpan = { // Explicitly type newTimeSpan
      start: { name: 'block_started', timestamp: new Date(), blockKey: this.blockKey.toString() },
      blockKey: this.blockKey.toString() // Associate blockKey with the timeSpan
    };
    currentSpan.timeSpans.push(newTimeSpan);

    // Call the abstract method for block-specific actions
    const actions = this.onBlockStart(runtime);
    return actions;
  }

  public onStop(runtime: ITimerRuntime): IRuntimeAction[] {
    const currentSpan = this.spans[this.spans.length - 1];
    if (currentSpan && currentSpan.timeSpans.length > 0) {
      const currentTimeSpan = currentSpan.timeSpans[currentSpan.timeSpans.length - 1];
      if (!currentTimeSpan.stop) {
        currentTimeSpan.stop = { name: 'block_stopped', timestamp: new Date(), blockKey: this.blockKey.toString() };
      }
    }

    // Call the abstract method for block-specific actions
    const actions = this.onBlockStop(runtime);
    return actions;
  }

  public composeMetrics(runtime: ITimerRuntime): RuntimeMetric[] {
    if (this.metricCompositionStrategy) {
      return this.metricCompositionStrategy.composeMetrics(this, runtime);
    }

    const metrics: RuntimeMetric[] = [];
    for (const source of this.sources) {
      const metric = new RuntimeMetric();

      // Set sourceId
      metric.sourceId = source.id?.toString() ?? source.toString() ?? "unknown_source_id";

      // Set effort
      let effortValue = "default_effort"; // Default effort
      const effortFragment = source.effort(runtime.blockKey);
      if (effortFragment) {
        effortValue = effortFragment.effort;
      }
      // Fallbacks for source.statement and source.fragment are not directly available on JitStatement.
      // JitStatement wraps an ICodeStatement (node property).
      // The effort() method already checks fragments.
      // If more complex fallback logic is needed for statement/fragment properties not accessed via methods,
      // it would require deeper inspection of 'source.node' or 'source.fragments'.
      // For now, relying on source.effort() and the default.
      metric.effort = effortValue;

      // Set values to an empty array
      metric.values = [];

      metrics.push(metric);
    }
    return metrics;
  }
}
