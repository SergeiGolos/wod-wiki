import { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../contracts/IScriptRuntime";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { DialectRegistry } from "../../services/DialectRegistry";
import { isFragmentPromoter } from "../contracts/behaviors/IFragmentPromoter";
import { TypedBlockFactory } from "./TypedBlockFactory";

/**
 * Just-In-Time Compiler for Runtime Blocks.
 *
 * Uses TypedBlockFactory to compile CodeStatements into typed blocks.
 * All block types (Timer, EMOM, AMRAP, Group, Effort, etc.) are
 * handled by the factory's fragment-based detection.
 */
export class JitCompiler {
  private dialectRegistry: DialectRegistry;
  private factory: TypedBlockFactory;

  constructor(
    _strategies?: unknown[],
    dialectRegistry?: DialectRegistry
  ) {
    this.dialectRegistry = dialectRegistry || new DialectRegistry();
    this.factory = new TypedBlockFactory();
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
      // 1. Static promotions from memory (fragment:promote, fragment:rep-target)
      const promotedLocations = parentBlock.getFragmentMemoryByVisibility('promote');
      const promotedFragments = [...promotedLocations.flatMap(loc => loc.fragments)];

      // 2. Dynamic promotions from behaviors (compiler-time concern)
      // This allows behaviors to compute promotions based on current parent state
      // (e.g. current round) regardless of memory update ordering.
      for (const behavior of parentBlock.behaviors) {
        if (isFragmentPromoter(behavior)) {
          const dynamicFragments = behavior.getPromotedFragments(runtime, parentBlock);
          
          for (const df of dynamicFragments) {
            // Deduplicate: Dynamic promotions take precedence over memory-based ones
            const existingIndex = promotedFragments.findIndex(f => f.fragmentType === df.fragmentType);
            if (existingIndex !== -1) {
              promotedFragments[existingIndex] = df;
            } else {
              promotedFragments.push(df);
            }
          }
        }
      }

      if (promotedFragments.length > 0) {
        // Clone nodes and append promoted fragments
        // We append so that explicit child fragments (index 0) take precedence 
        // when origins are equal (defaults), but higher-precedence origins (compiler/execution)
        // will still resort to the top in the UI.
        effectiveNodes = nodes.map(node => {
          // Create a clone that preserves the prototype chain (to keep methods like getFragment)
          const clone = Object.create(Object.getPrototypeOf(node));
          Object.assign(clone, node);
          clone.fragments = [...node.fragments, ...promotedFragments];
          return clone;
        });
      }
    }

    this.dialectRegistry.processAll(effectiveNodes);

    // TypedBlockFactory handles all block type detection and creation
    return this.factory.create(effectiveNodes, runtime);
  }
}
