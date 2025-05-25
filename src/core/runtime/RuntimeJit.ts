import { ITimerRuntime } from "../ITimerRuntime";
import { JitStatement } from "../JitStatement";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { EventHandler } from "./EventHandler";

import { TickHandler } from "./inputs/TickHandler";
import { IdleRuntimeBlock } from "./blocks/IdleRuntimeBlock";
import { DoneRuntimeBlock } from "./blocks/DoneRuntimeBlock";
import { StartHandler } from "./inputs/StartEvent";
import { StopHandler } from "./inputs/StopEvent";
import { ResetHandler } from "./inputs/ResetEvent";
import { EndHandler } from "./inputs/EndEvent";
import { RootBlock } from "./blocks/RootBlock";
import { RunHandler } from "./inputs/RunEvent";
import { NextStatementHandler } from "./inputs/NextStatementEvent";
import { DisplayHandler } from "./inputs/DisplayHandler";
import { PushActionHandler } from "./inputs/PushActionEvent";
import { SoundHandler } from "./inputs/SoundEvent";
import { RuntimeScript } from "./RuntimeScript";
import { RuntimeJitStrategies } from "./RuntimeJitStrategies";
import { IRuntimeBlockStrategy } from "./blocks/strategies/IRuntimeBlockStrategy";
/**
 * Just-In-Time Compiler for Runtime Blocks
 * This class compiles StatementNodes into executable IRuntimeBlocks on demand.
 */
export class RuntimeJit {
  constructor(public script: RuntimeScript) {
    this.strategyManager = new RuntimeJitStrategies();
  }
  /**
   * Strategy manager for runtime block compilation
   * @private
   */
  private strategyManager: RuntimeJitStrategies;

  idle(_runtime: ITimerRuntime): IRuntimeBlock {
    return new IdleRuntimeBlock();
  }
  end(_runtime: ITimerRuntime): IRuntimeBlock {
    // Attempting to refresh type checker
    return new DoneRuntimeBlock();
  }

  root(runtime: ITimerRuntime): IRuntimeBlock {
    return new RootBlock(runtime.script.root);
  }

  handlers: EventHandler[] = [
    new PushActionHandler(),
    new RunHandler(),
    new TickHandler(),
    new NextStatementHandler(),
    new StartHandler(),
    new StopHandler(),
    new ResetHandler(),
    new EndHandler(),
    new DisplayHandler(),
    new SoundHandler(), // Add SoundHandler for audio feedback
  ];

  /**
   * Registers a custom block compilation strategy
   * @param strategy The strategy to register
   */
  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategyManager.addStrategy(strategy);
  }

  /**
   * Compiles a statement node into a runtime block using registered strategies
   * @param node The statement node to compile
   * @returns A compiled runtime block or undefined if compilation fails
   */
  compile(node: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined {
    return this.strategyManager.compile(node, runtime);
  }  
}
