import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { TimeSpanDuration } from "@/core/TimeSpanDuration";
import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { MetricsContext, MetricsRelationshipType, ResultSpanRegistry } from "@/core/metrics";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { LapFragment } from "@/core/fragments/LapFragment";
import { getLap } from "./readers/getLap";
import { StartEvent } from "../inputs/StartEvent";
import { getDuration } from "./readers/getDuration";
import { StartTimerAction } from "../actions/StartTimerAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { StopEvent } from "../inputs/StopEvent";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetDurationAction } from "../outputs/SetDurationAction";

export class TimedGroupBlock extends RuntimeBlock {
  // Local registry for child spans
  private childSpanRegistry = new ResultSpanRegistry();
  
  constructor(source: JitStatement, parentMetricsContext?: MetricsContext) {
    // Use the ADD relationship type for timed group blocks to aggregate metrics
    super([source], parentMetricsContext, MetricsRelationshipType.ADD);
    
    // Initialize state in context
    this.ctx.childIndex = 0; // Current round for the current child
    this.ctx.lastLap = "";
  }
  
  private _updateSpanWithAggregatedChildMetrics(span: RuntimeSpan | undefined): void {
    if (!span) return;

    // Aggregate metrics from child spans
    const childSpans = this.childSpanRegistry.getAllSpans();
    if (childSpans.length > 0) {
      const aggregatedMetrics = this.childSpanRegistry.aggregateMetrics(childSpans);
      
      // Add aggregated metrics to the span
      aggregatedMetrics.forEach((metric: RuntimeMetric) => {
        // Check if this metric already exists
        const existingIndex = span.metrics.findIndex(m => 
          m.sourceId === metric.sourceId && 
          m.effort === metric.effort
        );
        
        if (existingIndex >= 0) {
          // Update existing metric
          span.metrics[existingIndex] = metric;
        } else {
          // Add new metric
          span.metrics.push(metric);
        }
      });
      
      // Update child references
      childSpans.forEach((childSpan: RuntimeSpan) => {
        if (childSpan.blockKey && !span.children.includes(childSpan.blockKey)) {
          span.children.push(childSpan.blockKey);
        }
      });
    }
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  public enter(runtime: ITimerRuntime): IRuntimeAction[] {
   console.debug(`TimedGroupBlock: ${this.blockKey} doEnter`);
    const currentSpan = this.ctx.getCurrentResultSpan();

    if (currentSpan) {
      // Set default label (similar to what createResultSpan did)
      currentSpan.label = this.generateBlockLabel("TimedGroup");

      // Add duration information if available (moved from createResultSpan)
      const duration = this.selectMany(getDuration)[0];
      if (duration?.original) {
        const durationMetric: RuntimeMetric = {
          sourceId: this.blockId,
          effort: 'Group Duration',
          values: [{
            type: 'repetitions', // Note: This was 'repetitions', perhaps should be 'timestamp' or specific duration type
            value: duration.original,
            unit: 'ms'
          }]
        };
        this.ctx.pushMetricsToCurrentResult([durationMetric]);
      }
    } else {
     console.warn(`TimedGroupBlock: ${this.blockKey} doEnter called without an initialized ResultSpan.`);
    }

    return [      
      new StartTimerAction(new StartEvent(new Date())),
      ...this.next(runtime),
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime"),
    ];
  }
  /**
   * Implementation of the doNext hook method from the template pattern
   */
  public next(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      // Before popping, grab the current result span and enhance it
      const currentSpan = this.ctx.getCurrentResultSpan();
      if (currentSpan) {
        this._updateSpanWithAggregatedChildMetrics(currentSpan);
      }
      
      return [new PopBlockAction()];
    }
    
    // Safe access to childIndex from context
    if (this.ctx.childIndex !== undefined && 
        this.sources[0] && 
        (this.ctx.childIndex >= this.sources[0].children.length || this.ctx.lastLap === "-")) {
      this.ctx.childIndex = 0;   
      this.ctx.index += 1;             
    }          

    const duration = this.selectMany(getDuration)[0];
    const spanDuration = new TimeSpanDuration(
      duration?.original ?? 0, 
      this.ctx.getCurrentResultSpan()?.timeSpans ?? [] // Corrected: Use timeSpans from currentResultSpan
    );
    
    const remaining = spanDuration.remaining();
    if ((remaining?.original != undefined) && (remaining.original == 0 || remaining.original < 0)) {
      return [new PopBlockAction()];
    }

    const statements: JitStatement[] = [];
    let statement: JitStatement | undefined;
    let laps: LapFragment | undefined;
    
    while (true) {      
      if (this.ctx.childIndex !== undefined) {
        this.ctx.childIndex += 1;
      } else {
        this.ctx.childIndex = 1; // Initialize if undefined
      }
      
      const sourceNode = this.sources[0];
      const childIndex = this.ctx.childIndex - 1;
      const childId = sourceNode?.children ? sourceNode.children[childIndex] : undefined;
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

    this.ctx.lastLap = laps?.image ?? "";
    return statements.length > 0
      ? [new PushStatementAction(statements), 
        new StartTimerAction(new StartEvent(new Date())),
        new SetDurationAction(spanDuration, "primary")]
      : [];
  }

  /**
   * Register a child block's result spans with this group
   * This should be called when child blocks are pushed to the stack
   * @param childBlock The child block to register
   */
  public registerChildBlock(childBlock: IRuntimeBlock): void {
    if (!childBlock) return;
    
    // Register the child's spans with our local registry
    this.childSpanRegistry.registerBlockSpans(childBlock);
    
    // Update our span to include the child as a reference
    const currentSpan = this.ctx.getCurrentResultSpan();
    if (currentSpan) {
      if (childBlock.blockKey && !currentSpan.children.includes(childBlock.blockKey)) {
        currentSpan.children.push(childBlock.blockKey);
      }
      this._updateSpanWithAggregatedChildMetrics(currentSpan);
    }
  }
  
  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  public leave(_runtime: ITimerRuntime): IRuntimeAction[] {
   console.debug(`TimedGroupBlock: ${this.blockKey} doLeave`);
    const currentSpan = this.ctx.getCurrentResultSpan();

    if (currentSpan) {
      this._updateSpanWithAggregatedChildMetrics(currentSpan);
    } else {
     console.warn(`TimedGroupBlock: ${this.blockKey} doLeave called without an initialized ResultSpan.`);
    }
    
    // Ensure timer is stopped and final actions are dispatched
    // The WriteResultAction will be handled by AbstractBlockLifecycle.leave()
    return [
      new StopTimerAction(new StopEvent(new Date()), this.ctx), // Corrected constructor call
      new SetButtonsAction([], "system"),
      new SetButtonsAction([], "runtime"),
    ];
  }
}
