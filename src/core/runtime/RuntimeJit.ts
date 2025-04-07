import { StatementNode, IRuntimeBlock, RuntimeTrace, ResultSpan, RuntimeEvent } from "../timer.types";
import { IRuntimeWriter, RuntimeBlock } from "./RuntimeBlock";
import { EventHandler } from "./EventHandler";
import { StartHandler } from "./handlers/StartHandler";
import { TickHandler } from "./handlers/TickHandler";
import { LabelCurrentEffortHandler, TotalTimeHandler } from "./handlers/TotalTimeHandler";
import { StopHandler } from "./handlers/StopHandler";
import { ResetHandler } from "./handlers/ResetHandler";
import { CompleteHandler } from "./handlers/CompleteHandler";
import { EndHandler } from "./handlers/EndHandler";

/**
 * Compiled runtime that manages workout statement nodes and their handlers
 *
 * This class is responsible for:
 * - Storing and indexing statement nodes
 * - Managing runtime handlers for each node
 * - Processing timer events and delegating to appropriate handlers
 */

export class DefaultResultWriter implements IRuntimeWriter {
  write(runtimeBlock: IRuntimeBlock): ResultSpan[] {    
      const timerEventTypes: string[] = ["start", "lap", "done", "complete", "stop"];
  
      const resultSpans: ResultSpan[] = [];
      let previousRelevantEvent: RuntimeEvent | null = null;
  
      for (let i = 0; i < runtimeBlock.events.length; i++) {
        const currentEvent: RuntimeEvent = runtimeBlock.events[i];
        const isRelevant = timerEventTypes.includes(currentEvent.name);
  
        if (isRelevant) {
          if (previousRelevantEvent) {          
            const span = new ResultSpan();
            span.start = previousRelevantEvent;
            span.stop = currentEvent;
            span.label = `Describe interval between ${previousRelevantEvent.name} at ${previousRelevantEvent.timestamp} and ${currentEvent.name} at ${currentEvent.timestamp}`;
            resultSpans.push(span);
          }
          previousRelevantEvent = currentEvent;
      }        
    }
    return resultSpans;
  }
}


export class EmptyResultWriter implements IRuntimeWriter {
  write(runtimeBlock: IRuntimeBlock): ResultSpan[] {          
    return [];
  }
}

export class RuntimeJit {
  handlers: EventHandler[] = [
    
    new TickHandler(),
    new TotalTimeHandler(),
    new LabelCurrentEffortHandler(),
  
    new StartHandler(),    
    new StopHandler(),
  
    
    new CompleteHandler(),    
    new ResetHandler(),
    new EndHandler()     
  ]
  

  
  compile(trace: RuntimeTrace, nodes: StatementNode[]): IRuntimeBlock {        
    let key = trace.set(nodes);
    console.log("Compiling block:", key.toString());
    


    return new RuntimeBlock(key.toString(), nodes, new DefaultResultWriter(), this.handlers);
  }
}
