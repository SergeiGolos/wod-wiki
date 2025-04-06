import { IRuntimeAction, ITimerRuntime, RuntimeEvent, WodResultBlock } from "@/core/timer.types";

/**
 * Action to handle block stopped events
 */

export class SetResultAction implements IRuntimeAction {        
    constructor(private result: WodResultBlock) {}

    apply(runtime: ITimerRuntime): RuntimeEvent[] {              
      const updatedResults = [...runtime.results, this.result];
      runtime.setResults(updatedResults); 
      return [];
    }  
  }