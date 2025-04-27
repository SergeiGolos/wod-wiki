import { IRuntimeEvent, ITimerRuntime, IRuntimeAction} from "../timer.types";
import { WriteLogAction } from "./actions/OutputAction";

export abstract class EventHandler {
  protected abstract eventType: string;

  // Renamed from 'apply' to 'handleEvent'
  protected abstract handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[];

  // New public apply method that filters events by type
  public apply(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    if (event.name === this.eventType) {
      const log = [];
      if (event.name !== "tick") {        
        if (runtime.current && runtime.current.type == 'active') {
          log.push(new WriteLogAction({ ...event, 
            blockId: runtime.current.blockId, 
            blockKey: runtime.current.blockKey 
          }));
        }
      }
      return [ 
        ...log,
        ...this.handleEvent(event, runtime)];
    }
    return [];
  }
}