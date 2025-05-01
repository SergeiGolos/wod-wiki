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
import { RunHandler } from "./inputs/RunEvent";
import { NextStatementHandler } from "./inputs/NextStatementEvent";

export class RuntimeJit {
    
  idle(_runtime: ITimerRuntime): IRuntimeBlock {
    return new IdleRuntimeBlock();
  }
  end(_runtime: ITimerRuntime): IRuntimeBlock {
    return new DoneRuntimeBlock();
  }

  root(runtime : ITimerRuntime) : IRuntimeBlock {
    return new RootBlock(runtime.script.nodes);

  }

  handlers: EventHandler[] = [
    new RunHandler(),
    new TickHandler(),
    new NextStatementHandler(),    
    new StartHandler(),
    new StopHandler(),
    new ResetHandler(),
    new EndHandler(),
  ];

  compile(_runtime: ITimerRuntime, node: StatementNode): IRuntimeBlock {
    

    
    const block = new SingleBlock(node.id, "", node, this.handlers);
    
    return block;
  }
}
