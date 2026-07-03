import type { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import type { IRuntimeContext } from "../contracts/IRuntimeContext";
import type { IRuntimeBlockStrategy } from "../contracts/IRuntimeBlockStrategy";
import type { ICodeStatement } from "@/core/models/CodeStatement";
import { BlockBuilder } from "./BlockBuilder";
import type { IJitCompiler } from "../contracts/IJitCompiler";
import { PromotionResolver } from "./PromotionResolver";
import type { IPromotionResolver } from "./contracts/IPromotionResolver";

/**
 * Just-In-Time Compiler for Runtime Blocks.
 * Coordinates strategy application to build composed RuntimeBlocks.
 */
export class JitCompiler implements IJitCompiler {
  private _promotionResolver: IPromotionResolver;

  constructor(
    private strategies: IRuntimeBlockStrategy[] = [],
    promotionResolver?: IPromotionResolver
  ) {
    this._promotionResolver = promotionResolver ?? new PromotionResolver();
  }

  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategies.push(strategy);
  }

  compile(nodes: ICodeStatement[], runtime: IRuntimeContext): IRuntimeBlock | undefined {
    if (nodes.length === 0) {
      return undefined;
    }

    let effectiveNodes = nodes;
    const parentBlock = runtime.stack?.current;

    // Delegate parent-block promotion projection to the resolver; the
    // compiler remains a pure `Statement[] → Block` transform.
    const promotion = this._promotionResolver.resolvePromotions(parentBlock, runtime);

    if (promotion.hasPromotions) {
        const promotedFragments = promotion.promotedFragments;
        // Clone nodes and append promoted metrics.  We append so that
        // explicit child metrics (index 0) take precedence when origins
        // are equal (defaults), but higher-precedence origins
        // (compiler/execution) will still resort to the top in the UI.
        effectiveNodes = nodes.map(node => {
            // Preserve the prototype chain (to keep methods like getFragment)
            const clone = Object.create(Object.getPrototypeOf(node));
            Object.assign(clone, node);
            clone.metrics = node.metrics.clone(node.id).add(...promotedFragments);
            return clone;
        });
    }

    // Match strategies directly: every production `match()` is a cheap
    // boolean predicate, so the filter+sort below costs less than building
    // a cache key would (and avoids stale-hit bugs where the key doesn't
    // capture everything `match()` inspects). Re-evaluate if profiling ever
    // shows strategy matching is hot.
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
