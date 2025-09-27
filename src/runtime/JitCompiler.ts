import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { CodeStatement } from "@/CodeStatement";

/**
 * Just-In-Time Compiler for Runtime Blocks that compiles JitStatement nodes 
 * into executable IRuntimeBlock instances on demand. Serves as the central 
 * compilation engine coordinating fragment compilation, strategy management, 
 * and block creation in the Wod.Wiki runtime system.
 */
export class JitCompiler {
  constructor(private strategies: IRuntimeBlockStrategy[] = []) {
  }

  /**
   * Registers a custom block compilation strategy with the strategy manager.
   */
  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Compiles an array of JitStatement nodes into an executable runtime block 
   * using the two-phase compilation process with metric inheritance.
   * 
   * @param nodes Array of JitStatement nodes to compile
   * @param runtime Timer runtime instance for context
   * @returns Compiled runtime block or undefined if compilation fails
   */
  compile(nodes: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    if (nodes.length === 0) {
      console.warn('JitCompiler: No nodes to compile.');
      return undefined;
    }

    for (const strategy of this.strategies) {
      if (strategy.match(nodes, runtime)) {
        return strategy.compile(nodes, runtime);
      }
    }
    console.warn('JitCompiler: No suitable strategy found.');
    return undefined;

  }
}
