import { IRuntimeEvent, ITimerRuntime, IRuntimeAction} from "../timer.types";

export abstract class EventHandler {
  protected abstract eventType: string;

  // Renamed from 'apply' to 'handleEvent'
  protected abstract handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[];

  // New public apply method that filters events by type
  public apply(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    if (event.name === this.eventType) {
      if (event.name !== "tick") {
        console.log('EventHandler apply triggered for event:', event);      
        if (runtime.current && runtime.current.type == 'active') {
          
          // TODO: pipe from here to output instead of runtime block 
          // (runtime block doesn't need these later) but the events are important
          // to analytics.
          
          runtime.events.push({ ...event, 
            blockId: runtime.current.blockId, 
            blockKey: runtime.current.blockKey 
          });         
        }
      }

      return this.handleEvent(event, runtime);
    }
    return [];
  }
}
