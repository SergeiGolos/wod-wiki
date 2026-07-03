/**
 * EffortEnrichmentPass — Post-compilation pass that injects planned effort metrics.
 *
 * Runs AFTER JIT compilation completes. Walks the compiled block tree and
 * enriches exercise blocks with resolved effort-data metrics containing planned
 * MET, discipline factor, and intensity information.
 *
 * This enables the runtime UI to display "planned 12 MET-min" and effort identity
 * during execution, before analytics finalization.
 *
 * @see ADR-0008 Decision 1: Compile-Time Effort Enrichment
 */

import type { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import type { IEffortResolver } from '@/effort-registry/types';
import { EFFORT_DATA_METRIC_TYPE } from '@/core/analytics/effortResolution';
import type { IMetric, MetricType } from '@/core/models/Metric';
import { IMemoryLocation, MemoryLocation } from '@/runtime/memory/MemoryLocation';

export interface EffortEnrichmentPassOptions {
  /** Effort resolver for label → definition lookup. */
  resolver: IEffortResolver;
  /** Whether to overwrite existing effort-data metrics (default: false). */
  overwrite?: boolean;
  /** Debug logging enabled (default: false). */
  debug?: boolean;
}

/**
 * Enriches a compiled block tree with planned effort metrics.
 *
 * @param root Root block of the compiled tree
 * @param options Resolver and configuration
 */
export function applyEffortEnrichment(root: IRuntimeBlock, options: EffortEnrichmentPassOptions): void {
  const { resolver, overwrite = false, debug = false } = options;
  const visited = new Set<string>();
    function walk(block: IRuntimeBlock): void {
        // Guard against circular references in the block tree
        if (visited.has(block.key.toString())) {
            if (debug) console.log(`[EffortEnrichment] Skipping visited block: ${block.key}`);
            return;
        }
        visited.add(block.key.toString());

        // Attempt to enrich this block if it's an exercise block
        tryEnrichBlock(block, resolver, overwrite, debug);

        // Recurse into child blocks so nested exercises also get enriched.
        // (Previously the function was a no-op stub that never recursed —
        // children with their own effort labels were silently skipped.)
        const children = (block as unknown as { children?: readonly IRuntimeBlock[] }).children;
        if (Array.isArray(children)) {
            for (const child of children) walk(child);
        }
    }

  walk(root);
}

function tryEnrichBlock(
  block: IRuntimeBlock,
  resolver: IEffortResolver,
  overwrite: boolean,
  debug: boolean,
): void {
  // Only enrich exercise blocks and effort blocks
  const normalizedBlockType = block.blockType?.toLowerCase();
  if (normalizedBlockType !== 'effort' && normalizedBlockType !== 'exercise') {
    return;
  }

  // Get the block label to use as the effort identifier
  const label = block.label;
  if (!label) {
    if (debug) console.log(`[EffortEnrichment] Skipping block with no label: ${block.key}`);
    return;
  }

  // Check if block already has effort-data metric
  const existingEffortData = block.getAllMemory().find(
    loc => loc.metrics.toArray().some(m => m.type === EFFORT_DATA_METRIC_TYPE),
  );

  if (existingEffortData && !overwrite) {
    if (debug) console.log(`[EffortEnrichment] Skipping block already enriched: ${label}`);
    return;
  }
  try {
  // Resolve the effort. `resolved.effort.hints` carries effort-defined hints
  // (Tier 3 §3.3) — they reach the same `metric:hint` memory location as
  // dialect-emitted hints and are consumed by the same strategies.
  const resolved = resolver.resolveEffort(label);
  const effortHints = resolved.effort.hints;
  if (effortHints && Object.keys(effortHints).length > 0) {
      block.mergeHints(effortHints);
  }

    if (debug) {
      console.log(`[EffortEnrichment] Resolved effort: ${label} → ${resolved.label} (MET: ${resolved.met})`);
    }

    // Create the effort-data metric
    const effortDataMetric: IMetric = {
      type: EFFORT_DATA_METRIC_TYPE as MetricType,
      image: resolved.label,
      value: resolved,
      origin: 'compiler',
      timestamp: new Date(),
    };

    // Create or update a private metrics memory location
    const privateMetrics = block.getMetricMemoryByVisibility('private');
    const existingLoc: IMemoryLocation | undefined = privateMetrics.find(loc =>
      loc.metrics.toArray().some(m => m.type === EFFORT_DATA_METRIC_TYPE),
    );

    if (existingLoc && overwrite) {
      // Update existing effort-data location: remove old effort-data and add new one
      const existingMetrics = existingLoc.metrics.toArray();
      const filtered = existingMetrics.filter(m => m.type !== EFFORT_DATA_METRIC_TYPE);
      filtered.push(effortDataMetric);
      existingLoc.update(filtered);
    } else if (!existingLoc) {
      // Create new private metrics location
      const location = new MemoryLocation('metric:tracked', [effortDataMetric]);
      block.pushMemory(location);
    }
  } catch (err) {
    console.error(`[EffortEnrichment] Failed to resolve effort "${label}":`, err);
  }
}
