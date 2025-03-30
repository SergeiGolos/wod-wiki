import { TimerDisplay, ButtonConfig,  TimerEventType, TimerEvent, IRuntimeAction } from "@/core/timer.types";
import { TimerRuntime } from "@/core/runtime/timer.runtime";

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
      const block =  runtime.current!;
      const blockId = block.blockId;
      if (block) {
        const newEvent: TimerEvent = { 
          index: blockId, 
          blockId: blockId, 
          timestamp: new Date(), 
          type: this.type 
        };
        
        // Add the event to the runtime results
        setResults([...runtime.results, newEvent]);
        
        // Also add the event to the block's events array
        block.events = [...(block.events || []), newEvent];
        console.log("Added timer event to block", this.type, block.events);
      }            
      console.log(runtime.results);
    }  
  }