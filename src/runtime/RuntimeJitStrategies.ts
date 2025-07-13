import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { ITimerRuntime } from "./ITimerRuntime";

// Re-export interfaces that will be used by other components
export interface JitStatement {
  fragments: any[];
  id: string;
}

export interface IRuntimeBlockStrategy {
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean;
  compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined;
}

/**
 * Strategy manager for RuntimeBlock creation in the JIT compilation system. 
 * Implements the Strategy pattern to select the appropriate block creation strategy 
 * based on JitStatement properties and characteristics. This class serves as the 
 * central coordinator for all runtime block compilation strategies.
 */
export class RuntimeJitStrategies {
  private strategies: IRuntimeBlockStrategy[] = [];

  constructor() {
    // Initialize with default strategies in priority order
    // Custom strategies will be added to the beginning for highest priority
  }

  /**
   * Adds a custom strategy to the beginning of the strategy list, giving it highest priority.
   * @param strategy The runtime block strategy to register
   */
  addStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategies.unshift(strategy);
  }

  /**
   * Compiles statement nodes into a runtime block using the first matching strategy.
   * @param compiledMetrics Pre-compiled metrics from fragment compilation
   * @param legacySources Original statement nodes for backward compatibility
   * @param runtime The timer runtime instance
   * @returns Compiled runtime block or undefined if no strategy matches
   */
  compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined {
    // Try each strategy in priority order until one can handle the statements
    for (const strategy of this.strategies) {
      if (strategy.canHandle(legacySources, runtime)) {
        const result = strategy.compile(compiledMetrics, legacySources, runtime);
        if (result) {
          return result;
        }
      }
    }

    // Log warning when no strategy matches for debugging
    console.warn('No strategy found for statements:', legacySources.map(s => s.id));
    return undefined;
  }

  /**
   * Gets the current number of registered strategies.
   */
  getStrategyCount(): number {
    return this.strategies.length;
  }

  /**
   * Clears all registered strategies (primarily for testing).
   */
  clearStrategies(): void {
    this.strategies = [];
  }
}