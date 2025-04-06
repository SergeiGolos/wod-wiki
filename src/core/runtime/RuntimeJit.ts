import { StatementNode, IRuntimeBlock, RuntimeTrace } from "../timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { EventHandler } from "./EventHandler";
import { StartHandler } from "./handlers/StartHandler";
import { TickHandler, TotalTimeHandler } from "./handlers/TickHandler";
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

export class RuntimeJit {
  handlers: EventHandler[] | undefined = [
    new StartHandler(),
    new TickHandler(),
    new TotalTimeHandler(),
    new StopHandler(),
    new ResetHandler(),
    new CompleteHandler(),
    new EndHandler() 
  ]
  
  compile(trace: RuntimeTrace, nodes: StatementNode[]): IRuntimeBlock {        
    let key = trace.set(nodes);
    console.log("Compiling block:", key.toString());  
    return new RuntimeBlock(key.toString(), nodes, this.handlers);
  }
}
