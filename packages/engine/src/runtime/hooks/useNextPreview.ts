import { useState, useEffect, useMemo } from 'react';
import { useSnapshotBlocks } from './useStackSnapshot';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { MetricContainer } from '../../core/models/MetricContainer';

/**
 * Result of the next-preview resolution.
 *
 * `metrics` contains the display metrics for the next child that
 * will be pushed by the deepest block on the stack that has a
 * `metrics:next` memory location.
 */
export interface NextPreview {
    /** Fragments describing the next child to be executed */
    metrics: MetricContainer;
    /** The block that owns this preview (the parent that will push the child) */
    block: IRuntimeBlock;
}

/**
 * Hook that resolves the "Up Next" preview from the runtime stack.
 *
 * Walks the stack from leaf (index 0) to root, finding the first block
 * that has a non-empty `metrics:next` memory location. This gives the
 * deepest (most specific) preview of what's coming next.
 *
 * The hook subscribes to `metrics:next` memory changes on all stack
 * blocks, so it re-renders when the preview updates (e.g., after a
 * child completes and the next child is queued).
 *
 * @returns NextPreview if any block has a next preview, or null
 *
 * @example
 * ```tsx
 * function UpNextCard() {
 *   const preview = useNextPreview();
 *   if (!preview) return <span>End of session</span>;
 *
 *   return <MetricSourceRow metric={preview.metrics} />;
 * }
 * ```
 */
export function useNextPreview(): NextPreview | null {
    const blocks = useSnapshotBlocks();
    const [version, setVersion] = useState(0);

    // Subscribe to metrics:next memory changes on all blocks
    useEffect(() => {
        const unsubscribes: (() => void)[] = [];

        for (const block of blocks) {
            const nextLocs = block.getMemoryByTag('metric:next');
            for (const loc of nextLocs) {
                const unsub = loc.subscribe(() => {
                    setVersion(v => v + 1);
                });
                unsubscribes.push(unsub);
            }
        }

        return () => {
            unsubscribes.forEach(fn => fn());
        };
    }, [blocks]);

    return useMemo(() => {
        // Walk leaf-to-root (blocks[0] is leaf, blocks[length-1] is root)
        for (const block of blocks) {
            const nextLocs = block.getMemoryByTag('metric:next');
            if (nextLocs.length === 0) continue;

            // Collect metrics from all metrics:next locations
            const metrics = MetricContainer.empty(block.key.toString());
            for (const loc of nextLocs) metrics.merge(loc.metrics);
            if (metrics.length > 0) {
                return { metrics, block };
            }
        }

        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, version]);
}
