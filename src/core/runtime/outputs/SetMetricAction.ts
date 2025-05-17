import { IRuntimeAction, IRuntimeEvent, ITimerRuntime, OutputEvent, RuntimeMetric } from "@/core/timer.types";
import { Subject } from "rxjs";

/**
 * Action to notify the UI about metric updates
 * This action is emitted when a block's metrics are updated at runtime
 */
export class SetMetricAction implements IRuntimeAction {
  // Required by IRuntimeAction interface
  public readonly name = "set-metric";
  /**
   * Create a new SetMetricAction
   * @param blockKey Block key that the metrics are associated with
   * @param metrics Updated metrics
   */
  constructor(
    private blockKey: string,
    private metrics: RuntimeMetric[]
  ) {}

  /**
   * Execute the action - legacy method
   * @param _runtime Runtime to execute the action on (unused in this implementation)
   * @returns Empty array as this is a terminal action
   */
  execute(_runtime: ITimerRuntime): IRuntimeAction[] {
    // No follow-up actions
    return [];
  }

  /**
   * Apply the action (required by IRuntimeAction interface)
   * @param _runtime Runtime to apply the action to (unused in this implementation)
   * @param _input Input event stream (unused in this implementation)
   * @param output Output event stream
   */
  apply(
    _runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    output: Subject<OutputEvent>
  ): void {
    // Create a metric event as an OutputEvent
    const event: OutputEvent = {
      eventType: 'SYSTEM', // Use SYSTEM event type for metric updates
      timestamp: new Date(),
      bag: {
        name: 'metric',
        blockKey: this.blockKey,
        value: JSON.stringify(this.metrics)
      }
    };
    
    // Emit the event to the output stream
    output.next(event);
  }
}