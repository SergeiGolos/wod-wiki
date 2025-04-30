import {
  StatementNode,
  IRuntimeBlock,
  ITimerRuntime,
} from "../timer.types";
import { SingleBlock } from "./blocks/SingleBlock";
import { EventHandler } from "./EventHandler";

import { TickHandler } from "./inputs/TickHandler";
import { IdleRuntimeBlock } from "./blocks/IdleRuntimeBlock";
import { DoneRuntimeBlock } from "./blocks/DoneRuntimeBlock";
import { StartHandler } from "./inputs/StartEvent";
import { StopHandler } from "./inputs/StopEvent";
import { CompleteHandler } from "./inputs/CompleteEvent";
import { ResetHandler } from "./inputs/ResetEvent";
import { EndHandler } from "./inputs/EndEvent";
import { RootBlock } from "./blocks/RootBlock";

export class RuntimeJit {
    
  idle(_runtime: ITimerRuntime): IRuntimeBlock {
    return new IdleRuntimeBlock();
  }
  end(_runtime: ITimerRuntime): IRuntimeBlock {
    return new DoneRuntimeBlock();
  }

  root(runtime : ITimerRuntime) : IRuntimeBlock {
    return new RootBlock(runtime.script.top().map(n=>n.id));

  }

  handlers: EventHandler[] = [
    new TickHandler(),
    new StartHandler(),
    new StopHandler(),
    new CompleteHandler(),
    new ResetHandler(),
    new EndHandler(),
  ];

  compile(runtime: ITimerRuntime, nodes: StatementNode[]): IRuntimeBlock {
  
    // decisions about what type of node this is.
    const block = new SingleBlock(runtime.trace.push(nodes), nodes, this.handlers, runtime, undefined);
    
    return block;
  }
}
