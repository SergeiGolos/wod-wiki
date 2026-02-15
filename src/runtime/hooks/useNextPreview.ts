import { useState, useEffect, useMemo } from 'react';
import { useSnapshotBlocks } from './useStackSnapshot';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { ICodeFragment } from '../../core/models/CodeFragment';

/**
 * Result of the next-preview resolution.
 *
 * `fragments` contains the display fragments for the next child that
 * will be pushed by the deepest block on the stack that has a
 * `fragment:next` memory location.
 */
export interface NextPreview {
    /** Fragments describing the next child to be executed */
    fragments: ICodeFragment[];
    /** The block that owns this preview (the parent that will push the child) */
    block: IRuntimeBlock;
}

/**
 * Hook that resolves the "Up Next" preview from the runtime stack.
 *
 * Walks the stack from leaf (index 0) to root, finding the first block
 * that has a non-empty `fragment:next` memory location. This gives the
 * deepest (most specific) preview of what's coming next.
 *
 * The hook subscribes to `fragment:next` memory changes on all stack
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
 *   return <FragmentSourceRow fragments={preview.fragments} />;
 * }
 * ```
 */
export function useNextPreview(): NextPreview | null {
    const blocks = useSnapshotBlocks();
    const [version, setVersion] = useState(0);

    // Subscribe to fragment:next memory changes on all blocks
    useEffect(() => {
        const unsubscribes: (() => void)[] = [];

        for (const block of blocks) {
            const nextLocs = block.getMemoryByTag('fragment:next');
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
            const nextLocs = block.getMemoryByTag('fragment:next');
            if (nextLocs.length === 0) continue;

            // Collect fragments from all fragment:next locations
            const fragments = nextLocs.flatMap(loc => loc.fragments);
            if (fragments.length > 0) {
                return { fragments, block };
            }
        }

        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, version]);
}
