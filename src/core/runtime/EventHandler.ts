import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode} from "../timer.types";

export abstract class EventHandler {
  protected abstract eventType: string;

  // Renamed from 'apply' to 'handleEvent'
  protected abstract handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[];

  // New public apply method that filters events by type
  public apply(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    if (event.name === this.eventType) {
      return this.handleEvent(event, stack, runtime);
    }
    return [];
  }
}
