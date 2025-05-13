import { IRuntimeBlock, ITimerRuntime, PrecompiledNode, StatementNode } from "../timer.types";
import { EffortBlockStrategy } from "./blocks/strategies/EffortBlockStrategy";
import { IRuntimeBlockStrategy } from "./blocks/strategies/IRuntimeBlockStrategy";
import { RepeatingBlockStrategy } from "./blocks/strategies/RepeatingBlockStrategy";
import { RootBlockStrategy } from "./blocks/strategies/RootBlockStrategy";
import { TimerBlockStrategy } from "./blocks/strategies/SingleBlockStrategy";
import { TimedRepeaterBlockStrategy } from "./blocks/strategies/TimedLapBlockStrategy";

/**
 * Strategy manager for RuntimeBlock creation
 * Implements the Strategy pattern to select appropriate block creation strategy
 */
export class RuntimeJitStrategies {
  private strategies: IRuntimeBlockStrategy[] = [];

  constructor() {
    this.addStrategy(new RootBlockStrategy());    
    // Repeaters are first to be selected.
    this.addStrategy(new TimedRepeaterBlockStrategy());  
    this.addStrategy(new RepeatingBlockStrategy());
            
    // Single blocks are last to be selected.
    this.addStrategy(new TimerBlockStrategy());
    this.addStrategy(new EffortBlockStrategy());    
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
   * Compiles a collection of statement nodes into a runtime block using the appropriate strategy
   * @param nodes The statement nodes to compile (can be a single node or multiple nodes)
   * @param runtime The runtime instance
   * @returns A compiled runtime block or undefined if no strategy matches
   */
  compile(
    nodes: PrecompiledNode[], 
    runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {  
    // Convert to array if a single node is passed
    const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
    
    // Find the first strategy that can handle these nodes
    for (const strategy of this.strategies) {
      if (strategy.canHandle(nodeArray)) {       
        const block = strategy.compile(nodeArray, runtime);        
        if (block) return block;
      }
    }
    
    // No strategy matched
    const nodeIds = nodeArray.map(node => node.id).join(', ');
    console.warn(`RuntimeBlockStrategyManager: No strategy matched for nodes [${nodeIds}]`);
    return undefined;
  }
}
