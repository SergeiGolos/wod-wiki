import { TimerDisplay, ButtonConfig,  TimerEventType, TimerEvent } from "../../timer.types";
import { IRuntimeAction } from "../EventAction";
import { TimerRuntime } from "../timer.runtime";

/**
 * Action to handle block stopped events
 */

export abstract class SetResultAction implements IRuntimeAction {
    protected abstract type: TimerEventType;
    
    apply(
      runtime: TimerRuntime,
      setDisplay: (display: TimerDisplay) => void,
      setButtons: (buttons: ButtonConfig[]) => void,
      setResults: (results:   []) => void
    ): void {        
      const currentIndex = runtime.currentBlockIndex;
      const block = currentIndex !== undefined ? runtime.current?.[currentIndex] : undefined;
      
      if (block) {
        const newEvent: TimerEvent = { 
          index: currentIndex as number, 
          blockId: block.stack[0].id, 
          timestamp: new Date(), 
          type: this.type 
        };
        
        // Add the event to the runtime results
        runtime.results = [...runtime.results, newEvent];
        
        // Also add the event to the block's events array
        block.events = [...(block.events || []), newEvent];
        console.log("Added timer event to block", this.type, block.events);
      }            
      console.log(runtime.results);
    }  
  }