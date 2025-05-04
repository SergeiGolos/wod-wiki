import { IRuntimeBlock, ITimerRuntime, StatementNode, StatementNodeDetail } from "../timer.types";
import { RuntimeScript } from "./RuntimeScript";
import { getMetrics } from "./blocks/readers/getDistance";
import { getDuration } from "./blocks/readers/getDuration";
import { getRounds } from "./blocks/readers/getRounds";
import { CompoundBlockStrategy } from "./blocks/strategies/CompoundBlockStrategy";
import { IRuntimeBlockStrategy } from "./blocks/strategies/IRuntimeBlockStrategy";
import { IdleBlockStrategy } from "./blocks/strategies/IdleBlockStrategy";
import { RepeatingBlockStrategy } from "./blocks/strategies/RepeatingBlockStrategy";
import { RootBlockStrategy } from "./blocks/strategies/RootBlockStrategy";
import { SingleBlockStrategy } from "./blocks/strategies/SingleBlockStrategy";

/**
 * Strategy manager for RuntimeBlock creation
 * Implements the Strategy pattern to select appropriate block creation strategy
 */
export class RuntimeJitStrategies {
  private strategies: IRuntimeBlockStrategy[] = [];

  constructor() {
    // Register strategies in order of most specific to most general
    this.addStrategy(new RootBlockStrategy());
    this.addStrategy(new IdleBlockStrategy());    
    this.addStrategy(new RepeatingBlockStrategy());
    this.addStrategy(new CompoundBlockStrategy());
    this.addStrategy(new SingleBlockStrategy());
    // More strategies can be added here as needed
  }

  /**
   * Adds a custom strategy to the manager
   * @param strategy The strategy to add
   */
  addStrategy(strategy: IRuntimeBlockStrategy): void {
    // Add to beginning so custom strategies take precedence        
    this.strategies.unshift(strategy);
  }

  /**
   * Compiles a statement node into a runtime block using the appropriate strategy
   * @param node The statement node to compile
   * @param script The runtime script containing all statements
   * @returns A compiled runtime block or undefined if no strategy matches
   */
  compile(
    node: StatementNode, 
    runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {  
    const detail = {...node} as StatementNodeDetail;
    
    detail.duration = getDuration(node);
    detail.metrics = getMetrics(node);
    detail.rounds = getRounds(node);
    
    // Find the first strategy that can handle this node
    for (const strategy of this.strategies) {
      if (strategy.canHandle(detail)) {
        console.log(`RuntimeBlockStrategyManager: Using strategy ${strategy.constructor.name} for node ${node.id}`);
        const block = strategy.compile(detail, runtime);
        if(block) return block;
      }
    }
    
    // No strategy matched
    console.warn(`RuntimeBlockStrategyManager: No strategy matched for node ${node.id}`);
    return undefined;
  }
}
