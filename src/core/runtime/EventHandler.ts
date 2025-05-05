import { IRuntimeEvent, ITimerRuntime, IRuntimeAction} from "../timer.types";
import { WriteLogAction } from "./outputs/WriteLogAction";

export abstract class EventHandler {
  protected abstract eventType: string;

  // Renamed from 'apply' to 'handleEvent'
  protected abstract handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[];

  // New public apply method that filters events by type
  public apply(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    if (event.name === this.eventType) {
      const log = [];
    
      const block = runtime.trace.current();          
      if (block) {
        if (event.name !== "tick") {        
          log.push(new WriteLogAction({ blockId: block!.blockId, blockKey: block.blockKey, ...event }));
        }
      
        return [ 
          ...log,
          ...this.handleEvent(event, runtime)];
      }
    }
    return [];
  }
}