import { StatementNode, IRuntimeBlock } from "../timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { EventHandler } from "./EventHandler";
import { StartHandler } from "./handlers/StartHandler";
import { TickHandler } from "./handlers/TickHandler";

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
    new TickHandler()
  ]
  
  
  compile(key: string, nodes: StatementNode[]): IRuntimeBlock {    
    const blockId = nodes[0].id;    
    return new RuntimeBlock(blockId, key, nodes, this.handlers);
  }
}
