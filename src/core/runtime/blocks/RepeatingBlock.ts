import {
  IRuntimeAction,
  ITimerRuntime,
  PrecompiledNode,
  ResultSpan,
  RuntimeMetric
} from "@/core/timer.types";
import { MetricsContext, MetricsRelationshipType } from "@/core/metrics";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { getLap } from "./readers/getLap";
import { LapFragment } from "@/core/fragments/LapFragment";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { WriteResultAction } from "../outputs/WriteResultAction";
import { RepFragment } from "@/core/fragments/RepFragment";

export class RepeatingBlock extends RuntimeBlock {
  private childIndex: number = 0;
  private lastLap: string = "";
  private currentRoundIndex: number = 0; // Tracks the current completed round + 1 (for next round)

  constructor(
    source: PrecompiledNode[], 
    parentMetricsContext?: MetricsContext
  ) {
    // Use the MULTIPLY relationship type for repeating blocks
    // This means parent metrics (like rounds) will multiply child metrics (like repetitions)
    super(source, parentMetricsContext, MetricsRelationshipType.MULTIPLY);
    
    // State is now managed by class members: childIndex, lastLap, currentRoundIndex
  }
  
  /**
   * @deprecated Use getMetrics() instead
   */
  public metrics(includeChildren: boolean = true, inheritFromParent: boolean = true): RuntimeMetric[] {
    return this.getMetrics(includeChildren, inheritFromParent);
  }
  
  /**
   * Override to implement repeating block-specific metrics logic
   * For repeating blocks, we use the MULTIPLY relationship type to multiply
   * child repetitions by the number of rounds in the parent
   */
  public getMetrics(includeChildren: boolean = true, inheritFromParent: boolean = true): RuntimeMetric[] {
    // Get the base metrics from AbstractBlockLifecycle
    const metrics = super.metrics(includeChildren, inheritFromParent);
    
    // We could enhance metrics here if needed for repeating blocks
    // For example, adding round count information
    
    return metrics;
  }

  private _updateSpanWithRoundInfo(span: ResultSpan | undefined): void {
    if (!span) return;

    const sourceNode = this.sources?.[0];
    const rounds = sourceNode?.rounds();
    
    // Update the label with current round information
    if (rounds && rounds.length > 0) {
      // Use generateBlockLabel from the base class for consistent formatting
      span.label = this.generateBlockLabel("Repeating", `Round ${this.currentRoundIndex + 1}/${rounds.length}`);
    } else {
      // Fallback if no round information is available
      span.label = this.generateBlockLabel("Repeating");
    }
    
    // Add round information as a metric
    if (rounds && rounds.length > 0) {
      const roundMetric: RuntimeMetric = {
        sourceId: this.blockId,
        effort: 'Rounds',
        values: [
          {
            type: 'repetitions',
            value: this.currentRoundIndex + 1, // Current round (1-based)
            unit: `of ${rounds.length}` // Total rounds
          }
        ]
      };
      
      // Add the metric to the span
      // Ensure metrics array exists before pushing
      if (!span.metrics) span.metrics = [];
      // To avoid duplicate 'Rounds' metrics from multiple calls, remove existing before adding.
      span.metrics = span.metrics.filter(m => !(m.sourceId === this.blockId && m.effort === 'Rounds'));
      span.metrics.push(roundMetric);
    }
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`RepeatingBlock: ${this.blockKey} doEnter`);
    // Update span with initial round info
    this._updateSpanWithRoundInfo(this.ctx.getCurrentResultSpan());
        
    // Combine next() actions with additional button setup  
    const actions = this.doNext(runtime);
    
    return [...actions, 
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime")];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }
    const sourceNode = this.sources?.[0];
    const rounds = sourceNode?.rounds();
    
    // Check if we've completed all rounds for the current child        
    if (this.childIndex >= sourceNode?.children.length || this.lastLap === "-") {
      this.childIndex = 0;   
      
      // When incrementing the index (completing a round), create a round completion span
      if (this.currentRoundIndex > 0) { // Skip for the initial state (before first round increment)
        const currentSpan = this.ctx.getCurrentResultSpan();
        if (currentSpan) {
          // Add round completion event to the current span
          const roundMetric: RuntimeMetric = {
            sourceId: this.blockId,
            effort: 'Round Complete',
            values: [
              {
                type: 'repetitions',
                value: this.currentRoundIndex, // This is the round *just* completed
                unit: rounds ? `of ${rounds.length}` : ''
              }
            ]
          };
          
          // Add event and metrics to the result span
          // if (!currentSpan.events) currentSpan.events = []; // ResultSpan has no 'events' property
          // currentSpan.events.push(roundEvent); // ResultSpan has no 'events' property
          
          if (!currentSpan.metrics) currentSpan.metrics = [];
          currentSpan.metrics.push(roundMetric);
          
          // Update all metrics and label
          this._updateSpanWithRoundInfo(currentSpan);
        }
      }
      
      this.currentRoundIndex += 1;             
    }
  
    if (rounds && this.currentRoundIndex >= rounds.length) {
      return [new PopBlockAction()];
    } 

    const statements: PrecompiledNode[] = [];
    let statement: PrecompiledNode | undefined;
    let laps: LapFragment | undefined;
    
    while (true && this.childIndex < sourceNode?.children.length) {      
      this.childIndex += 1;
      statement = runtime.script.getId(
        sourceNode?.children[this.childIndex-1]
      )?.[0];
      
      if (!statement) {
        break;
      }      
      
      laps = getLap(statement)?.[0];
      if (statement.repetitions().length == 0) {
        const reps = modIndex(sourceNode?.repetitions(),this.currentRoundIndex);
        if (reps) {
          statement.addFragment(new RepFragment(reps.reps)); // Corrected: use reps.reps
        }
      }
      
      statements.push(statement);

      if (laps?.image !=="+") {        
        break;
      }         
    }

    this.lastLap = laps?.image ?? "";
   

    
    return statements.length > 0
      ? [new PushStatementAction(statements)]
      : []; 
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Get the current span (created in enter and updated throughout execution)
    const currentSpan = this.ctx.getCurrentResultSpan();
    
    if (currentSpan) {
      // Final enhancement of the span before reporting it
      this._updateSpanWithRoundInfo(currentSpan);
      
      // Add summary information
      const sourceNode = this.sources?.[0];
      const rounds = sourceNode?.rounds();
      
      if (rounds) {
        // Add a label that summarizes the completed rounds
        currentSpan.label = `Completed ${this.currentRoundIndex} of ${rounds.length} rounds - ${this.blockKey}`;
      }
      
      return [
        new WriteResultAction(currentSpan)
      ];
    }
    
    // Fallback to creating a new span if something went wrong with our lifecycle
    const resultSpan = ResultSpan.fromBlock(this);
    return [
      new WriteResultAction(resultSpan)
    ];
  }
}

// Make modIndex generic to handle different array types
function modIndex<T>(items: T[] | undefined, index: number): T | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }
  return items[index % items.length];
}

