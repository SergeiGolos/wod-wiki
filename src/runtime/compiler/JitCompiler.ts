import { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../contracts/IScriptRuntime";
import { IRuntimeBlockStrategy } from "../contracts/IRuntimeBlockStrategy";
import type { CodeStatement } from "@/core/models/CodeStatement";
import { DialectRegistry } from "../../services/DialectRegistry";
import { BlockBuilder } from "./BlockBuilder";

/**
 * Just-In-Time Compiler for Runtime Blocks.
 * Coordinates strategy application to build composed RuntimeBlocks.
 */
export class JitCompiler {
  private dialectRegistry: DialectRegistry;

  constructor(
    private strategies: IRuntimeBlockStrategy[] = [],
    dialectRegistry?: DialectRegistry
  ) {
    this.dialectRegistry = dialectRegistry || new DialectRegistry();
  }

  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategies.push(strategy);
  }

  getDialectRegistry(): DialectRegistry {
    return this.dialectRegistry;
  }

  compile(nodes: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    if (nodes.length === 0) {
      return undefined;
    }

    this.dialectRegistry.processAll(nodes);

    // Filter matching strategies and sort by priority (Desc)
    const matchingStrategies = this.strategies
      .filter(s => s.match(nodes, runtime))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (matchingStrategies.length === 0) {
      return undefined;
    }

    // Composition Flow
    const builder = new BlockBuilder(runtime);

    for (const strategy of matchingStrategies) {
      strategy.apply(builder, nodes, runtime);
    }

    try {
      return builder.build();
    } catch (e) {
      console.error("Failed to build block from composition:", e);
      return undefined;
    }
  }
}
