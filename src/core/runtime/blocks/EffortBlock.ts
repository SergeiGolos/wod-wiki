import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { RuntimeBlock } from "./RuntimeBlock";
import { StopEvent } from "../inputs/StopEvent"; 
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonAction } from "../outputs/SetButtonAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { StartEvent } from "../inputs/StartEvent";
import { completeButton } from "@/components/buttons/timerButtons"; 
import { CompleteHandler } from "../inputs/CompleteEvent";
import { SetSpanAction } from "../outputs/SetSpanAction";

export class EffortBlock extends RuntimeBlock {
  // logger is inherited from AbstractBlockLifecycle
  constructor(
    compiledMetrics: RuntimeMetric[],
    sources?: JitStatement[],        
  ) {
    // Pass compiled metrics to base class with optional legacy sources
    super(compiledMetrics, sources);
    this.handlers.push(new CompleteHandler());
    this.leaf = true; // mark as leaf-level block
  }

  /**
   * Extract effort descriptions from the metrics for display purposes
   * @returns Array of effort descriptions
   */  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    // Determine if this effort block has a specific duration
    
    // Get effort information from metrics to display in timer
    const metrics = this.metrics(runtime);
    
    // Format all metrics with their values
    const effortTexts: string[] = [];
    
    if (metrics.length > 0) {
      for (const metric of metrics) {
        let effortText = metric.effort;
        
        // Add metric values to the display text if available
        const reps = metric.values.find(v => v.type === "repetitions");
        const resistance = metric.values.find(v => v.type === "resistance");
        const distance = metric.values.find(v => v.type === "distance");
        
        if (reps || resistance || distance) {
          const valueStrings: string[] = [];
          
          if (reps) valueStrings.push(`${reps.value}${reps.unit}`);
          if (resistance) valueStrings.push(`${resistance.value}${resistance.unit}`);
          if (distance) valueStrings.push(`${distance.value}${distance.unit}`);
          
          effortText += ` (${valueStrings.join(", ")})`;
        }
        
        effortTexts.push(effortText);
      }
    } else {
      effortTexts.push("Exercise");
    }
    
    // Join all efforts with line breaks for multi-line display    
    const actions = [
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonAction("runtime", [completeButton]),
      new SetSpanAction("primary", this.getSpanBuilder().Current()),
    ];
    
    return actions;
  }

  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return this.blockKey.index >= 1 
    ? [new PopBlockAction()] 
    : [];
  }  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonAction("runtime", []),      
    ];
  }

  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}
