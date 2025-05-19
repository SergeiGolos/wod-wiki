import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { MetricValue } from "@/core/MetricValue";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { RuntimeBlock } from "./RuntimeBlock"; 
import { StopEvent } from "../inputs/StopEvent"; 
import { WriteResultAction } from "../outputs/WriteResultAction";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { StartEvent } from "../inputs/StartEvent";
import { completeButton } from "@/components/buttons/timerButtons"; 
import { CompleteHandler } from "../inputs/CompleteEvent";
import { SetClockAction } from "../outputs/SetClockAction";

export class EffortBlock extends RuntimeBlock {
  // logger is inherited from AbstractBlockLifecycle

  constructor(
    sources: JitStatement[],        
  ) {
    super(sources);
    console.log(`EffortBlock created for ${this.blockKey}`);
    this.handlers.push(new CompleteHandler());
  }

  /**
   * Extract effort descriptions from the metrics for display purposes
   * @returns Array of effort descriptions
   */  
  protected onEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
   console.debug(`EffortBlock: ${this.blockKey} doEnter`);
    
    return [
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonsAction([completeButton], "runtime"),
      new SetClockAction("runtime")
    ];
  }

  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
   console.debug(`EffortBlock: ${this.blockKey} doNext (index: ${this.blockKey?.index})`);   
    return this.blockKey.index > 1 
    ? [new PopBlockAction()] 
    : [];
  }

  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
   console.debug(`EffortBlock: ${this.blockKey} doLeave`);
    const currentSpan = this.spans;
    if (currentSpan) {
      const calculatedMetrics = this.calculateMetrics();
      currentSpan[currentSpan.length - 1].metrics.push(...calculatedMetrics);

      return [
        new StopTimerAction(new StopEvent(new Date())),
        new SetButtonsAction([], "runtime"),
        new WriteResultAction(currentSpan)
      ]; 
    } else {
     console.warn(`EffortBlock: ${this.blockKey} doLeave called without an active ResultSpan.`);
      return [];
    }
  }

  private calculateMetrics(): RuntimeMetric[] {
    const metrics: RuntimeMetric[] = [];
    if (!this.sources || this.sources.length === 0) {
      return metrics;
    }
    const sourceNode = this.sources[0]; // Assuming one primary source for EffortBlock metrics

    const durationValue = sourceNode.duration(0);
    const resistanceFrags = sourceNode.resistance(0);
    const repetitionFrags = sourceNode.repetition(0);
    const distanceFrags = sourceNode.distance(0);

    if (durationValue && durationValue.original !== undefined && durationValue.original !== 0) {
      metrics.push({
        sourceId: this.blockId,
        effort: 'duration',
        values: [{ type: 'timestamp', value: durationValue.original, unit: 'ms' }]
      });
    }
    if (resistanceFrags) {
      metrics.push({
        sourceId: this.blockId,
        effort: 'resistance',
        values: [{
          type: 'resistance',
          value: typeof resistanceFrags.value === 'string' ? parseFloat(resistanceFrags.value) : (resistanceFrags.value || 0), 
          unit: resistanceFrags.units || 'kg' // Corrected: Use r.units
        } as MetricValue]
      });
    }
    if (repetitionFrags) {
      metrics.push({
        sourceId: this.blockId,
        effort: 'repetitions',
        values: [{
          type: 'repetitions',
          value: repetitionFrags.reps || 0, // Corrected: Use r.reps
          unit: 'reps' // Corrected: Default unit for repetitions
        } as MetricValue] 
      });
    }
    if (distanceFrags) {
      metrics.push({
        sourceId: this.blockId,
        effort: 'distance',
        values: [{
          type: 'distance',
          value: typeof distanceFrags.value === 'string' ? parseFloat(distanceFrags.value) : (distanceFrags.value || 0), 
          unit: distanceFrags.units || 'm' // Corrected: Use d.units
        } as MetricValue] 
      });
    }
    return metrics;
  }
}
