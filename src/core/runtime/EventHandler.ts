import { IRuntimeAction } from "../IRuntimeAction";
import { ITimerRuntime } from "../ITimerRuntime";
import { IRuntimeEvent } from "../IRuntimeEvent";
import { WriteLogAction } from "./outputs/WriteLogAction";

export abstract class EventHandler {
  protected abstract eventType: string;

  // Renamed from 'apply' to 'handleEvent'
  protected abstract handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[];

  // Public apply method that filters events by type
  public apply(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    if (event.name === this.eventType) {
      const log = [];
    
      const block = runtime.trace.current();          
      if (block) {
        // Log event handling (except for tick events to reduce noise)
        if (event.name !== "tick") {
          log.push(new WriteLogAction({ blockId: block!.blockId, blockKey: block.blockKey.toString(), ...event }));
          console.log(`🔍 ${this.constructor.name} handling ${event.name} event in block: ${block.constructor.name} [${block.blockKey}]`);
        }
        
        // Get actions from the handler
        const actions = this.handleEvent(event, runtime);
        
        // Log actions being returned (except for tick events)
        if (event.name !== "tick" && actions.length > 0) {
          console.log(`📃 ${this.constructor.name} returning ${actions.length} actions: ${actions.map(a => a.name).join(', ')}`);
        }
      
        return [ 
          ...log,
          ...actions
        ];
      }
    }
    return [];
  }
}