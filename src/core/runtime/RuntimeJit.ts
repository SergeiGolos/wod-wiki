import {
  StatementNode,
  IRuntimeBlock,
  ITimerRuntime,
  StatementFragment,
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
import { RepeatingBlock } from "./blocks/RepeatingBlock";
import { CompoundBlock } from "./blocks/CompoundBlock";
import { DisplayHandler } from "./inputs/DisplayHandler";

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
    new DisplayHandler(),
  ];

  /**
   * Get lap operator type from statement fragments
   * @param fragments Array of statement fragments
   * @returns Lap operator type: '+' for Compose, '-' for Round-Robin, or undefined for standard repetition
   */
  private getLapOperator(fragments: StatementFragment[]): string | undefined {
    const lapFragment = fragments.find(f => f.type === 'lap');
    if (!lapFragment) return undefined;
    
    // The lap fragment should contain the operator in its content
    return (lapFragment as any).operator;
  }

  /**
   * Compile a statement node into an appropriate runtime block based on its type
   * @param runtime Timer runtime context
   * @param node Statement node to compile
   * @returns Appropriate runtime block implementation
   */
  compile(runtime: ITimerRuntime, node: StatementNode): IRuntimeBlock {
    // Handle undefined node
    if (!node) {
      return runtime.trace.history.length === 0 
        ? new IdleRuntimeBlock() 
        : new DoneRuntimeBlock();
    }
    
    // First check if this is a rounds segment
    if (node?.fragments?.some(s => s.type === 'rounds')) {
      // For rounds segments, always create a RepeatingBlock
      // The block itself will handle the grouping logic
      return new RepeatingBlock(node);
    }
    
    // For non-rounds nodes with children, create a compound block
    if (node?.children && node.children.length > 0) {
      return new CompoundBlock(node);
    }
    
    // For leaf nodes (no children), use a SingleBlock
    return new SingleBlock(node.id, "", node, this.handlers);
  }
}
