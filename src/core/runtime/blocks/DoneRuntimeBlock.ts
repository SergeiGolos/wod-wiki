import { IRuntimeAction, IRuntimeBlock, ITimerRuntime, IdleStatementNode, PrecompiledNode, RuntimeMetric, ZeroIndexMeta } from "@/core/timer.types";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons"; 
import { ResetHandler } from "../inputs/ResetEvent";
import { WriteResultAction } from "../outputs/WriteResultAction";
import { MetricsRelationshipType } from "@/core/metrics";

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  constructor(sources: PrecompiledNode[] = [new IdleStatementNode({
    id: -1,
    children: [],
    meta: new ZeroIndexMeta(),
    fragments: []
  })]) {
    super(sources, undefined, MetricsRelationshipType.INHERIT);
    
    this.handlers = [
      new SaveHandler(),
      new ResetHandler()
    ];
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`DoneRuntimeBlock: ${this.blockKey} doEnter`);
    // this.ctx.spans = [...] removed, AbstractBlockLifecycle.enter() initializes currentResultSpan
    
    const currentSpan = this.ctx.getCurrentResultSpan();
    if (currentSpan && runtime.history && runtime.history.length > 0) {
      const firstEvent = runtime.history[0];
      const lastEvent = runtime.history[runtime.history.length - 1];
      const totalDuration = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();

      const durationMetric: RuntimeMetric = {
        sourceId: this.blockId,
        effort: 'Total Session Duration',
        values: [{ type: 'timestamp', value: totalDuration, unit: 'ms' }]
      };
      this.ctx.pushMetricsToCurrentResult([durationMetric]);
      
      // Update label for clarity
      currentSpan.label = this.generateBlockLabel("Done", `Session: ${this.formatDuration(totalDuration)}`);
      
      // SetTimeSpanAction was using this.ctx.spans, which is removed.
      // If specific time spans need to be displayed beyond the main result span's timing,
      // that logic needs reconsideration. For now, we'll focus on the total duration metric.
      // The SetTimeSpanAction might be redundant if the UI primarily uses ResultSpan data.
      // To keep things simple for now, and given this.ctx.spans was removed, we will remove these SetTimeSpanActions.
      // If specific behavior is lost, we can re-evaluate how to provide that data.
    } else {
      this.logger.warn(`DoneRuntimeBlock: ${this.blockKey} doEnter called without currentSpan or runtime history.`);
    }
      
    return [  
      new SetButtonsAction([resetButton, saveButton], "system"),
      new SetButtonsAction([], "runtime"),      
      // new SetTimeSpanAction(this.ctx.spans, "total"), // Removed, as this.ctx.spans is gone
      // new SetTimeSpanAction(this.ctx.spans, "primary") // Removed
    ];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.logger.debug(`DoneRuntimeBlock: ${this.blockKey} doLeave`);
    // const resultSpan = ResultSpan.fromBlock(this); // Removed
    const currentSpan = this.ctx.getCurrentResultSpan();
    
    if (currentSpan) {
      this.logger.info(`DoneRuntimeBlock: ${this.blockKey} writing final result span.`);
      return [new WriteResultAction(currentSpan)];
    } else {
      this.logger.warn(`DoneRuntimeBlock: ${this.blockKey} doLeave called without a currentResultSpan to write.`);
      return [];
    }
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    // No action needed for next in done block
    return [];
  }
}