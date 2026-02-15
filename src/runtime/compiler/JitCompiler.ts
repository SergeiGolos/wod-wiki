import { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../contracts/IScriptRuntime";
import { IRuntimeBlockStrategy } from "../contracts/IRuntimeBlockStrategy";
import { ICodeStatement } from "@/core/models/CodeStatement";
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

  compile(nodes: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    if (nodes.length === 0) {
      return undefined;
    }

    let effectiveNodes = nodes;
    const parentBlock = runtime.stack?.current;

    // Parent Injection Layer: Inject promoted fragments from parent block
    if (parentBlock) {
      const promotedLocations = parentBlock.getFragmentMemoryByVisibility('promote');

      if (promotedLocations.length > 0) {
        // Flatten fragments from all promoted locations
        const promotedFragments = promotedLocations.flatMap(loc => loc.fragments);

        if (promotedFragments.length > 0) {
          // Clone nodes and append promoted fragments
          // We append so that explicit child fragments (index 0) take precedence 
          // when origins are equal (defaults), but higher-precedence origins (compiler)
          // will still resort to the top.
          effectiveNodes = nodes.map(node => {
            // Create a clone that preserves the prototype chain (to keep methods like getFragment)
            const clone = Object.create(Object.getPrototypeOf(node));
            Object.assign(clone, node);
            clone.fragments = [...node.fragments, ...promotedFragments];
            return clone;
          });
        }
      }
    }

    this.dialectRegistry.processAll(effectiveNodes);

    // Filter matching strategies and sort by priority (Desc)
    const matchingStrategies = this.strategies
      .filter(s => s.match(effectiveNodes, runtime))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (matchingStrategies.length === 0) {
      return undefined;
    }

    // Composition Flow
    const builder = new BlockBuilder(runtime);

    for (const strategy of matchingStrategies) {
      strategy.apply(builder, effectiveNodes, runtime);
    }

    try {
      return builder.build();
    } catch (e) {
      console.error("Failed to build block from composition:", e);
      return undefined;
    }
  }
}
