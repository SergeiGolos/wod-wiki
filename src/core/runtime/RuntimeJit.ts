import { ITimerRuntime } from "../ITimerRuntime";
import { JitStatement } from "../types/JitStatement";
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
import { PushActionHandler } from "./inputs/PushActionEvent";
import { SoundHandler } from "./inputs/SoundEvent";
import { SkipHandler } from "./inputs/SkipEvent";
import { RuntimeScript } from "./RuntimeScript";
import { RuntimeJitStrategies } from "./RuntimeJitStrategies";
import { IRuntimeBlockStrategy } from "./blocks/strategies/IRuntimeBlockStrategy";
import { FragmentCompilationManager } from "./strategies/FragmentCompilationManager";
import { RuntimeMetric } from "../types/RuntimeMetric";
import { BlockKey } from "../types/BlockKey";
/**
 * Just-In-Time Compiler for Runtime Blocks
 * This class compiles StatementNodes into executable IRuntimeBlocks on demand.
 * Phase 4: Now includes fragment compilation to separate metrics from block creation.
 */
export class RuntimeJit {
  constructor(public script: RuntimeScript) {
    this.strategyManager = new RuntimeJitStrategies();
    this.fragmentCompiler = new FragmentCompilationManager();
  }
  /**
   * Strategy manager for runtime block compilation
   * @private
   */
  private strategyManager: RuntimeJitStrategies;
  
  /**
   * Fragment compilation manager for converting fragments to metrics
   * @private
   */
  private fragmentCompiler: FragmentCompilationManager;

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
    new SoundHandler(), // Add SoundHandler for audio feedback
    new SkipHandler(), // Add SkipHandler for skipping rest periods
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
   * Phase 4: Now compiles fragments into metrics before block creation
   * @param node The statement node to compile
   * @returns A compiled runtime block or undefined if compilation fails
   */  compile(node: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined {
    // Phase 4: Compile fragments into metrics before creating blocks
    const compiledMetrics: RuntimeMetric[] = [];
    
    for (const statement of node) {
      const metric = this.fragmentCompiler.compileStatementFragments(statement, {
        runtimeState: {
          isActive: false,
          isPaused: false,
          elapsedTime: 0,
          currentRep: 1,
          currentRound: 1
        },        blockContext: {
          blockKey: new BlockKey(),
          childBlocks: [],
          isRepeating: false,
          iterationCount: 0
        },
        parentMetrics: [],
        executionDepth: 0,
        currentTime: 0,
        currentRound: 1
      });
      compiledMetrics.push(metric);
    }
    
    // Pass both compiled metrics and legacy sources to strategy manager
    return this.strategyManager.compile(compiledMetrics, node, runtime);
  }

  // /**
  //  * Retrieves a sequence of consecutive child JitStatements that are part of a 'compose' group.
  //  * Iteration starts from the given startIndex and continues as long as subsequent statements
  //  * have a LapFragment with group type 'compose'.
  //  * 
  //  * @param startIndex The index in `this.sources` to start looking for the compose group.
  //  * @returns An array of JitStatement objects belonging to the consecutive compose group.
  //  */  public nextChildStatements(runtime: ITimerRuntime, startIndex: number): JitStatement[] {
  //   const groupStatements: JitStatement[] = [];
    
  //   // TODO: During migration, use legacy sources if available
  //   if (!this._legacySources) {
  //     return groupStatements; // Return empty if no legacy sources available
  //   }
    
  //   const sources = this._legacySources.flatMap((s: JitStatement) => s.children);
  //   if (startIndex < 0 || startIndex >= sources.length) {
  //     // Return empty if startIndex is out of bounds
  //     return groupStatements;
  //   }
    
  //   // Get the first item and check its lap value
  //   let current = runtime.script.getId(sources[startIndex])[0];
  //   let increment = current.lap(startIndex);
    
  //   // Add the first item
  //   groupStatements.push(current);
    
  //   // Only continue if increment is + and more items exist
  //   let currentIndex = startIndex;
  //   while (increment && increment.image === "+" && ++currentIndex < sources.length) {
  //     // Get the next item
  //     current = runtime.script.getId(sources[currentIndex])[0];
  //     increment = current.lap(currentIndex);
      
  //     // Only add it if it has a + lap value
  //     if (increment && increment.image === "+") {
  //       groupStatements.push(current);
  //     } else {
  //       // If not +, stop the loop without incrementing or including
  //       break;
  //     }
  //   }
    
  //   return groupStatements;
  // }

}
