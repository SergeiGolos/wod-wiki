import type { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import type { IRuntimeContext } from "../contracts/IRuntimeContext";
import type { IRuntimeBlockStrategy } from "../contracts/IRuntimeBlockStrategy";
import type { ICodeStatement } from "@/core/models/CodeStatement";
import { BlockBuilder } from "./BlockBuilder";
import { getHints } from "@/core/metrics/hints";
import { MetricType } from "@/core/models/Metric";
import type { IJitCompiler } from "../contracts/IJitCompiler";
import { PromotionResolver } from "./PromotionResolver";
import type { IPromotionResolver } from "./contracts/IPromotionResolver";

/**
 * Just-In-Time Compiler for Runtime Blocks.
 * Coordinates strategy application to build composed RuntimeBlocks.
 */
export class JitCompiler implements IJitCompiler {
  private _promotionResolver: IPromotionResolver;

  /**
   * Cache: statement-structure key → sorted matching strategy list.
   *
   * Strategy matching is purely a function of the statement structure (metric
   * types present, whether children exist, etc.) and the registered strategy
   * set — it does NOT depend on runtime state.  Caching the match result lets
   * us skip the O(strategies × metrics) filter+sort on every compilation of
   * the same child block type (e.g. the same effort block repeated over
   * 10 000 rounds).
   *
   * Cache entries are invalidated when a new strategy is registered.
   */
  private _strategyMatchCache: Map<string, IRuntimeBlockStrategy[]> = new Map();

  constructor(
    private strategies: IRuntimeBlockStrategy[] = [],
    promotionResolver?: IPromotionResolver
  ) {
    this._promotionResolver = promotionResolver ?? new PromotionResolver();
  }

  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategies.push(strategy);
    // Invalidate cache whenever the strategy set changes.
    this._strategyMatchCache.clear();
  }

  /**
   * Compute a compact cache key from the effective statement list.
   *
   * The key captures the metric types, child-presence, and processed hints
   * for each statement — these are exactly the properties that strategy
   * `match()` functions inspect.  The statement `id` is intentionally
   * excluded: two structurally identical blocks (e.g. "5 Burpees" and
   * "10 Pullups") share the same matching strategies and can reuse the
   * same cache entry, which is both correct and more efficient.
   */
  private _statementCacheKey(nodes: ICodeStatement[]): string {
    return nodes.map(n => {
      const metricTypes = n.metrics
        .filter(m => m.type !== MetricType.Hint && m.type !== MetricType.Choice)
        .map(m => m.type).sort().join(',');
      const hasChildren = n.children && n.children.length > 0 ? '1' : '0';
      const hints = getHints(n).sort().join(',');
      return `${metricTypes}:${hasChildren}:${hints}`;
    }).join('|');
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
    const hasPromotions = promotion.hasPromotions;

    if (hasPromotions) {
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

    // Strategy matching is deterministic for a given statement structure.
    // Use the cache to skip the filter+sort on repeated compilations of the
    // same block type (e.g. the same effort block in every round of a 10 k
    // round workout). Skip the cache when metric promotions were applied because
    // promoted metrics change the effective node shape and therefore which
    // strategies match.
    let matchingStrategies: IRuntimeBlockStrategy[];
    const cacheKey = hasPromotions ? null : this._statementCacheKey(effectiveNodes);

    if (cacheKey !== null) {
      const cached = this._strategyMatchCache.get(cacheKey);
      if (cached) {
        matchingStrategies = cached;
      } else {
        matchingStrategies = this.strategies
          .filter(s => s.match(effectiveNodes, runtime))
          .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        this._strategyMatchCache.set(cacheKey, matchingStrategies);
      }
    } else {
      // Cannot use cache when promotions alter the effective nodes.
      matchingStrategies = this.strategies
        .filter(s => s.match(effectiveNodes, runtime))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

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
