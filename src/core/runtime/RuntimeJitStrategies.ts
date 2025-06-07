import { ITimerRuntime } from "../ITimerRuntime";
import { JitStatement } from "../JitStatement";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockEffortStrategy } from "./blocks/strategies/BlockEffortStrategy";
import { IRuntimeBlockStrategy } from "./blocks/strategies/IRuntimeBlockStrategy";
import { GroupRepeatingStrategy } from "./blocks/strategies/GroupRepeatingStrategy";
import { BlockRootStrategy } from "./blocks/strategies/BlockRootStrategy";
import { BlockTimerStrategy } from "./blocks/strategies/BlockTimerStrategy";
import { GroupCountdownStrategy } from "./blocks/strategies/GroupCountdownStrategy";
import { RuntimeMetric } from "../RuntimeMetric";


/**
 * Strategy manager for RuntimeBlock creation
 * Implements the Strategy pattern to select appropriate block creation strategy
 */
export class RuntimeJitStrategies {
  private strategies: IRuntimeBlockStrategy[] = [];

  constructor() {
    this.addStrategy(new BlockRootStrategy());    
    
    // Single block strategies first (will be lower priority due to unshift)
    this.addStrategy(new BlockEffortStrategy());    
    this.addStrategy(new BlockTimerStrategy()); // ← Add this
    
    // Group strategies last (will be higher priority due to unshift)
    this.addStrategy(new GroupCountdownStrategy()); // ← Add this
    this.addStrategy(new GroupRepeatingStrategy());
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
   * Phase 4: Now accepts pre-compiled metrics and legacy sources for gradual migration
   * @param compiledMetrics The pre-compiled metrics from fragment compilation
   * @param legacySources The original statement nodes (for backward compatibility)
   * @param runtime The runtime instance
   * @returns A compiled runtime block or undefined if no strategy matches
   */
  compile(
    compiledMetrics: RuntimeMetric[],
    legacySources: JitStatement[], 
    runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {  
    // Convert to array if a single node is passed
    const nodeArray = Array.isArray(legacySources) ? legacySources : [legacySources];
    
    // Find the first strategy that can handle these nodes
    for (const strategy of this.strategies) {
      if (strategy.canHandle(nodeArray, runtime)) {       
        const block = strategy.compile(compiledMetrics, nodeArray, runtime);        
        if (block) {
          return block;
        }
      }
    }
    
    // No strategy matched
    const nodeIds = nodeArray.map(node => node.id).join(', ');
    console.warn(`RuntimeBlockStrategyManager: No strategy matched for nodes [${nodeIds}]`);
    return undefined;
  }
}
