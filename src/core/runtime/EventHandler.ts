import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode} from "../timer.types";

export abstract class EventHandler {
  protected abstract eventType: string;

  // Renamed from 'apply' to 'handleEvent'
  protected abstract handleEvent(event: IRuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[];

  // New public apply method that filters events by type
  public apply(event: IRuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    if (event.name === this.eventType) {
      if (event.name !== "tick") {
        console.log('EventHandler apply triggered for event:', event, stack);
      }else{
        if (runtime.current) {
          runtime.events.push({ ...event, 
            blockId: runtime.current.blockId, 
            blockKey: runtime.current.blockKey 
          }); 
        }
      }

      return this.handleEvent(event, stack, runtime);
    }
    return [];
  }
}
