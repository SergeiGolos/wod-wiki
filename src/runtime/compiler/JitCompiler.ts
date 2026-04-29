import { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../contracts/IScriptRuntime";
import { IRuntimeBlockStrategy } from "../contracts/IRuntimeBlockStrategy";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { DialectRegistry } from "../../services/DialectRegistry";
import { BlockBuilder } from "./BlockBuilder";
import { isFragmentPromoter } from "../contracts/behaviors/IMetricPromoter";

/**
 * Just-In-Time Compiler for Runtime Blocks.
 * Coordinates strategy application to build composed RuntimeBlocks.
 */
export class JitCompiler {
  private dialectRegistry: DialectRegistry;

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
    dialectRegistry?: DialectRegistry
  ) {
    this.dialectRegistry = dialectRegistry || new DialectRegistry();
  }

  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategies.push(strategy);
    // Invalidate cache whenever the strategy set changes.
    this._strategyMatchCache.clear();
  }

  getDialectRegistry(): DialectRegistry {
    return this.dialectRegistry;
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
   *
   * Note: `processAll()` must have been called on `nodes` before this
   * method so that `n.hints` reflects any dialect-added semantic markers
   * (e.g. 'rest').
   */
  private _statementCacheKey(nodes: ICodeStatement[]): string {
    return nodes.map(n => {
      const metricTypes = n.metrics.map(m => m.type).sort().join(',');
      const hasChildren = n.children && n.children.length > 0 ? '1' : '0';
      const hints = n.hints ? Array.from(n.hints).sort().join(',') : '';
      return `${metricTypes}:${hasChildren}:${hints}`;
    }).join('|');
  }

  compile(nodes: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    if (nodes.length === 0) {
      return undefined;
    }

    let effectiveNodes = nodes;
    const parentBlock = runtime.stack?.current;
    let hasPromotions = false;

    // Parent Injection Layer: Inject promoted metrics from parent block
    if (parentBlock) {
      // 1. Static promotions from memory (metrics:promote, metrics:rep-target)
      const promotedLocations = parentBlock.getMetricMemoryByVisibility('promote');
      const promotedFragments = promotedLocations.flatMap(loc => loc.metrics.toArray());

      // 2. Dynamic promotions from behaviors (compiler-time concern)
      // This allows behaviors to compute promotions based on current parent state
      // (e.g. current round) regardless of memory update ordering.
      for (const behavior of parentBlock.behaviors) {
        if (isFragmentPromoter(behavior)) {
          const dynamicFragments = behavior.getPromotedFragments(runtime, parentBlock);
          
          for (const df of dynamicFragments) {
            // Deduplicate: Dynamic promotions take precedence over memory-based ones
            const existingIndex = promotedFragments.findIndex(f => f.type === df.type);
            if (existingIndex !== -1) {
              promotedFragments[existingIndex] = df;
            } else {
              promotedFragments.push(df);
            }
          }
        }
      }

      if (promotedFragments.length > 0) {
        hasPromotions = true;
        // Clone nodes and append promoted metrics
        // We append so that explicit child metric (index 0) take precedence 
        // when origins are equal (defaults), but higher-precedence origins (compiler/execution)
        // will still resort to the top in the UI.
        effectiveNodes = nodes.map(node => {
          // Create a clone that preserves the prototype chain (to keep methods like getFragment)
          const clone = Object.create(Object.getPrototypeOf(node));
          Object.assign(clone, node);
          clone.metrics = node.metrics.clone(node.id).add(...promotedFragments);
          return clone;
        });
      }
    }

    this.dialectRegistry.processAll(effectiveNodes);

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
