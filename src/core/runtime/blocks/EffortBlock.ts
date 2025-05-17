import { IRuntimeAction, ITimerRuntime, PrecompiledNode, RuntimeMetric, MetricValue } from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { CompleteHandler } from "../inputs/CompleteEvent"; 
import { MetricsContext, MetricsRelationshipType } from "@/core/metrics"; 
import { StopEvent } from "../inputs/StopEvent"; 
import { WriteResultAction } from "../outputs/WriteResultAction";
import { EventHandler } from "../EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { StartEvent } from "../inputs/StartEvent";
import { completeButton } from "@/components/buttons/timerButtons"; 

export class EffortBlock extends RuntimeBlock {
  // logger is inherited from AbstractBlockLifecycle

  constructor(
    sources: PrecompiledNode[],
    parentMetricsContext: MetricsContext | undefined,
    parentBlock?: RuntimeBlock 
  ) {
    const handlers: EventHandler[] = [new CompleteHandler()];
    super(sources, parentMetricsContext, MetricsRelationshipType.INHERIT, handlers, parentBlock);
    this.logger.info(`EffortBlock created for ${this.blockKey}`);
  }

  /**
   * Extract effort descriptions from the metrics for display purposes
   * @returns Array of effort descriptions
   */
  private getEffortDescriptions(): string[] {
    const metrics = this.metricsContext.getAllMetrics();
    const effortDescriptions: string[] = [];
    
    // For each metric, create a human-readable description
    for (const metric of metrics) {
      let description = metric.effort;
      
      // Add repetitions if available
      const reps = metric.values.find(v => v.type === 'repetitions');
      if (reps) {
        description = `${reps.value} ${description}`;
      }
      
      // Add resistance if available
      const resistance = metric.values.find(v => v.type === 'resistance');
      if (resistance) {
        description += ` ${resistance.value}${resistance.unit}`;
      }
      
      // Add distance if available
      const distance = metric.values.find(v => v.type === 'distance');
      if (distance) {
        description += ` ${distance.value}${distance.unit}`;
      }
      
      effortDescriptions.push(description);
    }
    
    return effortDescriptions;
  }

  protected doEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`EffortBlock: ${this.blockKey} doEnter`);

    // --- Logic moved from former enhanceResultSpan & createResultSpan context ---
    const currentSpan = this.ctx.getCurrentResultSpan();
    if (currentSpan) {
      // 1. Update label (previously part of enhanceResultSpan)
      const efforts = this.getEffortDescriptions();
      if (efforts && efforts.length > 0) {
        currentSpan.label = this.generateBlockLabel("Effort", efforts.join(", "));
      } else {
        // Fallback if no effort descriptions are available yet (similar to createResultSpan's default)
        currentSpan.label = this.generateBlockLabel("Effort");
      }

      // 2. Add "Last Updated" timestamp metric (previously part of enhanceResultSpan)
      const timestampMetric: RuntimeMetric = {
        sourceId: this.blockId,
        effort: 'Last Updated',
        values: [{
          type: 'timestamp',
          value: new Date().getTime(),
          unit: 'ms'
        }]
      };
      this.ctx.pushMetricsToCurrentResult([timestampMetric]);
    } else {
      this.logger.warn(`EffortBlock: ${this.blockKey} doEnter called without an initialized ResultSpan. This implies an issue with AbstractBlockLifecycle.enter().`);
    }
    // --- End of moved logic ---

    return [
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonsAction([completeButton], "runtime"),
      // SetClockAction removed
    ];
  }

  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`EffortBlock: ${this.blockKey} doNext`);
    // EffortBlocks typically complete in one step unless they have specific event handling.
    // The 'CompleteHandler' passed to the constructor should handle the 'complete' event.

    // If an EffortBlock is 'nexted' without a specific event that an event handler catches,
    // it implies it might be done or waiting for an external event (like 'complete' or 'skip').
    // For now, let's assume it does nothing by default on a simple 'next' call.
    // If it needs to auto-complete, that logic would go here or in a specific handler.
    return [
      new PopBlockAction()
    ]; 
  }

  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`EffortBlock: ${this.blockKey} doLeave`);
    const currentSpan = this.ctx.getCurrentResultSpan();
    if (currentSpan) {
      const calculatedMetrics = this.calculateMetrics();
      this.ctx.pushMetricsToCurrentResult(calculatedMetrics);
      return [
        new StopTimerAction(new StopEvent(new Date()), this.ctx), // Corrected constructor call
        new SetButtonsAction([], "runtime"),
        new WriteResultAction(currentSpan)
      ]; 
    } else {
      this.logger.warn(`EffortBlock: ${this.blockKey} doLeave called without an active ResultSpan.`);
      return [];
    }
  }

  private calculateMetrics(): RuntimeMetric[] {
    const metrics: RuntimeMetric[] = [];
    if (!this.sources || this.sources.length === 0) {
      return metrics;
    }
    const sourceNode = this.sources[0]; // Assuming one primary source for EffortBlock metrics

    const durationValue = sourceNode.duration();
    const resistanceFrags = sourceNode.resistance();
    const repetitionFrags = sourceNode.repetitions();
    const distanceFrags = sourceNode.distance();

    if (durationValue && durationValue.original !== undefined && durationValue.original !== 0) {
      metrics.push({
        sourceId: this.blockId,
        effort: 'duration',
        values: [{ type: 'timestamp', value: durationValue.original, unit: 'ms' }]
      });
    }
    if (resistanceFrags.length > 0) {
      metrics.push({
        sourceId: this.blockId,
        effort: 'resistance',
        values: resistanceFrags.map(r => ({
          type: 'resistance',
          value: typeof r.value === 'string' ? parseFloat(r.value) : (r.value || 0), 
          unit: r.units || 'kg' // Corrected: Use r.units
        } as MetricValue))
      });
    }
    if (repetitionFrags.length > 0) {
      metrics.push({
        sourceId: this.blockId,
        effort: 'repetitions',
        values: repetitionFrags.map(r => ({
          type: 'repetitions',
          value: r.reps || 0, // Corrected: Use r.reps
          unit: 'reps' // Corrected: Default unit for repetitions
        } as MetricValue))
      });
    }
    if (distanceFrags.length > 0) {
      metrics.push({
        sourceId: this.blockId,
        effort: 'distance',
        values: distanceFrags.map(d => ({
          type: 'distance',
          value: typeof d.value === 'string' ? parseFloat(d.value) : (d.value || 0), 
          unit: d.units || 'm' // Corrected: Use d.units
        } as MetricValue))
      });
    }
    return metrics;
  }

  /**
   * Override to add any effort-specific metric logic
   */
  public metrics(includeChildren: boolean = true, inheritFromParent: boolean = true): RuntimeMetric[] {
    // Get the base metrics from AbstractBlockLifecycle
    const metrics = super.metrics(includeChildren, inheritFromParent);
    
    // We could enhance metrics here if needed for effort blocks
    // For now, EffortBlock primarily contributes its own calculated metrics directly 
    // via calculateMetrics() which are pushed to the ResultSpan in doLeave().
    // The metrics from super.metrics() already include the inherited/aggregated context.
    return metrics;
  }
}
