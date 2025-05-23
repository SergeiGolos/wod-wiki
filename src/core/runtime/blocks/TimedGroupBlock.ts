import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { TimeSpanDuration } from "@/core/TimeSpanDuration";
import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { ResultSpanBuilder } from "@/core/metrics";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { SetClockAction } from "../outputs/SetClockAction"; // Added import
import { LapFragment } from "@/core/fragments/LapFragment";
import { getLap } from "./readers/getLap";
import { getDuration } from "./readers/getDuration";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetDurationAction } from "../outputs/SetDurationAction";

export class TimedGroupBlock extends RuntimeBlock {
  // Local registry for child spans
  private childSpanRegistry = new ResultSpanBuilder();
  private childIndex: number;
  private lastLap: string;
  
  constructor(source: JitStatement /*, parentMetricsContext?: MetricsContext - Removed */) {
    // Use the ADD relationship type for timed group blocks to aggregate metrics
    super([source]); // Base RuntimeBlock constructor only takes sources
    
    // Initialize state directly on the instance
    this.childIndex = 0; 
    this.lastLap = "";
  }
  
  private _updateSpanWithAggregatedChildMetrics(span: RuntimeSpan | undefined): void {
    if (!span) return;

    // Aggregate metrics from child spans
    const childSpans = this.childSpanRegistry.getAllSpans();
    if (childSpans.length > 0) {
      const aggregatedMetrics = this.childSpanRegistry.aggregateMetrics(childSpans);
      if (!span.metrics) span.metrics = [];
      
      // Add aggregated metrics to the span
      aggregatedMetrics.forEach((metric: RuntimeMetric) => {
        const existingIndex = span.metrics.findIndex(m => 
          m.sourceId === metric.sourceId && 
          m.effort === metric.effort
        );
        
        if (existingIndex >= 0) {
          span.metrics[existingIndex] = metric;
        } else {
          span.metrics.push(metric);
        }
      });
      
      // Update child references (span.children is initialized in RuntimeSpan class)
      childSpans.forEach((childSpan: RuntimeSpan) => {
        if (childSpan.blockKey && !span.children.includes(childSpan.blockKey.toString())) {
          span.children.push(childSpan.blockKey.toString());
        }
      });
    }
  }

  /**
   * Called when the block is entered. For TimedGroupBlock, core setup is in onBlockStart.
   */
  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`TimedGroupBlock: ${this.blockKey} onEnter`);
    // Specific setup logic moved to onBlockStart.
    return [];
  }

  /**
   * Called when the block's specific timing/activity truly starts.
   */
  protected onBlockStart(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`TimedGroupBlock: ${this.blockKey} onBlockStart`);
    this.childIndex = 0; // Reset child index for this run
    this.lastLap = "";   // Reset last lap status

    const currentSpan = this.spans[this.spans.length - 1];

    if (currentSpan) {
      currentSpan.label = this.sources[0]?.name ?? `TimedGroup: ${this.blockId}`;
      const duration = this.selectMany(getDuration)[0];
      if (duration?.original) {
        const durationMetric: RuntimeMetric = {
          sourceId: this.blockId,
          effort: 'Group Duration',
          values: [{
            type: 'duration', 
            value: duration.original,
            unit: 'ms'
          }]
        };
        if (!currentSpan.metrics) currentSpan.metrics = [];
        currentSpan.metrics.push(durationMetric);
      }
    } else {
      console.warn(`TimedGroupBlock: ${this.blockKey} onBlockStart called but currentSpan is undefined.`);
    }
    
    const actions: IRuntimeAction[] = [
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime"),
    ];

    actions.push(...this.onNext(runtime)); // Push the first child/set of children
    
    return actions;
  }
  
  /**
   * Called to process the next child or determine if the block should pop.
   */
  protected onNext(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      const currentSpan = this.spans[this.spans.length - 1];
      if (currentSpan) {
        this._updateSpanWithAggregatedChildMetrics(currentSpan);
      }
      return [new PopBlockAction()];
    }
    
    if (this.childIndex !== undefined && 
        this.sources[0] && 
        (this.childIndex >= this.sources[0].children.length || this.lastLap === "-")) {
      this.childIndex = 0;   
      // this.index += 1; // Cannot use this.index from base like this
    }          

    const duration = this.selectMany(getDuration)[0];
    const currentBlockSpan = this.spans[this.spans.length - 1];
    const remaining = new TimeSpanDuration(
      duration?.original ?? 0,
      duration?.sign ?? '+',
      currentBlockSpan?.timeSpans ?? []
    ).remaining();

    if ((remaining?.original != undefined) && (remaining.original <= 0)) {
      return [new PopBlockAction()];
    }

    const statements: JitStatement[] = [];
    let statement: JitStatement | undefined;
    let laps: LapFragment | undefined;
    
    while (true) {      
      if (this.childIndex !== undefined) {
        this.childIndex += 1;
      } else {
        this.childIndex = 1; 
      }
      
      const sourceNode = this.sources[0];
      const currentChildIndex = this.childIndex - 1;
      const childId = sourceNode?.children ? sourceNode.children[currentChildIndex] : undefined;
      statement = childId !== undefined ? runtime.script.getId(childId)?.[0] : undefined;
      
      if (!statement) {
        break;
      }      

      laps = getLap(statement)?.[0];
      statements.push(statement);

      if (laps?.image !=="+") {        
        break;
      }            
    }

    this.lastLap = laps?.image ?? "";
    const actionsToPush: IRuntimeAction[] = [];
    if (statements.length > 0) {
      actionsToPush.push(new PushStatementAction(statements));
      // StartTimerAction removed as child block timing is handled by their own onStart/onStop lifecycle methods,
      // and the TimedGroupBlock's main span is managed by its own onBlockStart/onBlockStop.
      // If specific timing for children within this group's span was needed, 
      // it would require a different mechanism, not the now-simplified StartTimerAction.
      actionsToPush.push(new SetDurationAction(duration?.original ?? 0, duration?.sign ?? '+', "primary"));
    }
    return actionsToPush;
  }

  /**
   * Register a child block's result spans with this group
   */
  public registerChildBlock(childBlock: IRuntimeBlock): void {
    if (!childBlock) return;
    
    this.childSpanRegistry.registerBlockSpans(childBlock);
    
    const currentSpan = this.spans[this.spans.length - 1];
    if (currentSpan) {
      // currentSpan.children is initialized in RuntimeSpan class
      if (childBlock.blockKey && !currentSpan.children.includes(childBlock.blockKey.toString())) {
        currentSpan.children.push(childBlock.blockKey.toString());
      }
      this._updateSpanWithAggregatedChildMetrics(currentSpan);
    }
  }
  
  /**
   * Called when the block is left. For TimedGroupBlock, core teardown is in onBlockStop.
   */
  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`TimedGroupBlock: ${this.blockKey} onLeave`);
    // Specific teardown logic moved to onBlockStop.
    return [];
  }

  /**
   * Called when the block's specific timing/activity truly stops.
   */
  protected onBlockStop(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`TimedGroupBlock: ${this.blockKey} onBlockStop`);
    const currentSpan = this.spans[this.spans.length - 1]; 

    if (currentSpan) {
      this._updateSpanWithAggregatedChildMetrics(currentSpan);
    } else {
      console.warn(`TimedGroupBlock: ${this.blockKey} onBlockStop called but currentSpan is undefined.`);
    }
    
    const actions: IRuntimeAction[] = [
      new SetButtonsAction([], "system"),
      new SetButtonsAction([], "runtime"),
    ];

    const duration = this.selectMany(getDuration)[0];
    if (duration !== undefined) { 
        actions.push(new SetClockAction("primary"));
    }
    
    return actions;
  }
}
