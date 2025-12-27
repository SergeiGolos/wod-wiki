import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import type { CodeStatement } from "@/core/models/CodeStatement";
import { DialectRegistry } from "../services/DialectRegistry";

/**
 * Just-In-Time Compiler for Runtime Blocks that compiles JitStatement nodes 
 * into executable IRuntimeBlock instances on demand. Serves as the central 
 * compilation engine coordinating fragment compilation, strategy management, 
 * and block creation in the Wod.Wiki runtime system.
 * 
 * Metric inheritance is handled via inherited memory references rather than
 * CompilationContext - parent blocks expose metrics with 'inherited' visibility,
 * and child strategies search memory for inherited values.
 * 
 * The JitCompiler integrates with a DialectRegistry to process semantic hints
 * before strategy matching. Dialects analyze statements and emit behavioral hints
 * that strategies can query for matching decisions.
 */
export class JitCompiler {
  private dialectRegistry: DialectRegistry;

  constructor(
    private strategies: IRuntimeBlockStrategy[] = [],
    dialectRegistry?: DialectRegistry
  ) {
    this.dialectRegistry = dialectRegistry || new DialectRegistry();
  }

  /**
   * Registers a custom block compilation strategy with the strategy manager.
   */
  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Get the dialect registry for registering dialects
   */
  getDialectRegistry(): DialectRegistry {
    return this.dialectRegistry;
  }

  /**
   * Compiles an array of JitStatement nodes into an executable runtime block.
   * 
   * Before strategy matching, all statements are processed through the dialect
   * registry to populate semantic hints. Strategies then use runtime.memory.search() 
   * to find public metrics from parent blocks and check hints for matching.
   * 
   * @param nodes Array of JitStatement nodes to compile
   * @param runtime Timer runtime instance for context
   * @returns Compiled runtime block or undefined if compilation fails
   */
  compile(nodes: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    if (nodes.length === 0) {
      return undefined;
    }

    // Process all nodes through dialect registry before strategy matching
    this.dialectRegistry.processAll(nodes);

    for (const strategy of this.strategies) {
      if (strategy.match(nodes, runtime)) {
        return strategy.compile(nodes, runtime);
      }
    }
    return undefined;

  }
}
