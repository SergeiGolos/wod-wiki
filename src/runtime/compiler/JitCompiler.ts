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

    // Check for Legacy Strategies (those with compile() but no apply())
    // If the highest priority match is legacy, use it.
    const firstMatch = matchingStrategies[0];
    if (firstMatch.compile && !firstMatch.apply) {
        return firstMatch.compile(nodes, runtime);
    }

    // Composition Flow
    const builder = new BlockBuilder(runtime);

    for (const strategy of matchingStrategies) {
        if (strategy.apply) {
            strategy.apply(builder, nodes, runtime);
        } else if (strategy.compile) {
            // If we hit a legacy strategy in the middle of a chain...
            // Ideally we shouldn't mix. But if we must, maybe we ignore it?
            // Or maybe we treat it as a monolithic block provider and stop?
            // For safety during migration: if we encounter a legacy strategy,
            // and we haven't built anything yet, use it.
            // But since we sorted by priority, if we are here, it means we probably
            // want to use the new composition.
            console.warn(`Strategy ${strategy.constructor.name} implements compile() but not apply(). Skipping in composition flow.`);
        }
    }

    try {
        return builder.build();
    } catch (e) {
        console.error("Failed to build block from composition:", e);
        return undefined;
    }
  }
}
