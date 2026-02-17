import { useState, useEffect, useMemo } from 'react';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { TimerState, ButtonConfig } from '../memory/MemoryTypes';
import { IFragmentSource } from '../../core/contracts/IFragmentSource';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { FragmentSourceEntry } from '../../components/fragments/FragmentSourceRow';
import { useSnapshotBlocks } from './useStackSnapshot';

// ============================================================================
// Stack-Driven Timer Hooks
// ============================================================================

/**
 * Represents a timer on the stack with its owning block context.
 */
export interface StackTimerEntry {
    /** The block that owns this timer */
    block: IRuntimeBlock;
    /** The timer state from block memory */
    timer: TimerState;
    /** Whether this timer is pinned to the primary display */
    isPinned: boolean;
}

/**
 * Hook that scans the runtime stack for all blocks with timer memory.
 * Returns timer entries ordered from bottom of stack (index 0) to top.
 *
 * Timer data is read directly from block memory via lock.getMemory('time').
 * When a block is popped from the stack, its memory subscriptions are cleaned
 * up automatically, and the stack event triggers a re-render here.
 *
 * @returns Array of stack timer entries
 */
export function useStackTimers(): StackTimerEntry[] {
    const blocks = useSnapshotBlocks();
    const [version, setVersion] = useState(0);

    // Subscribe to timer memory changes on all blocks
    useEffect(() => {
        const unsubscribes: (() => void)[] = [];

        for (const block of blocks) {
            const timerEntry = block.getMemory('time');
            if (timerEntry) {
                const unsub = timerEntry.subscribe(() => {
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
        const entries: StackTimerEntry[] = [];

        for (const block of blocks) {
            const timerEntry = block.getMemory('time');
            if (!timerEntry) continue;

            const timer = timerEntry.value;
            if (!timer) continue;

            entries.push({
                block,
                timer,
                isPinned: timer.role === 'primary'
            });
        }

        return entries;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, version]);
}

/**
 * Determines which timer should be displayed as the primary (big) timer.
 *
 * Pin Resolution Strategy:
 * 1. If the top-of-stack block is a Rest block, its timer is ALWAYS primary.
 *    Rest countdowns should be front-and-center so users see time remaining.
 * 2. Otherwise, find the LOWEST (root-closest) block with role === 'primary'.
 *    This lets parent blocks (AMRAP, EMOM) keep their timer pinned while
 *    child exercises execute beneath them.
 * 3. If no pinned timer exists, use the leaf (top-of-stack) timer.
 *
 * @returns The primary timer entry, or undefined if no timers on stack
 */
export function usePrimaryTimer(): StackTimerEntry | undefined {
    const timers = useStackTimers();

    return useMemo(() => {
        if (timers.length === 0) return undefined;

        const leaf = timers[timers.length - 1];

        // Rest blocks always become the pinned timer when pushed.
        // Their countdown should override any parent's pinned timer.
        if (leaf.block.blockType === 'Rest') return leaf;

        // Find the lowest (root-closest / first in array) pinned timer.
        // Parent blocks pin their timer so it stays visible while children execute.
        const pinned = timers.find(t => t.isPinned);
        if (pinned) return pinned;

        // Fallback: leaf timer (top of stack = last in array)
        return leaf;
    }, [timers]);
}

/**
 * Returns all timers that are NOT the primary timer.
 * These are displayed as secondary/context timers in the UI.
 */
export function useSecondaryTimers(): StackTimerEntry[] {
    const timers = useStackTimers();
    const primary = usePrimaryTimer();

    return useMemo(() => {
        if (!primary) return [];
        return timers.filter(t => t.block !== primary.block);
    }, [timers, primary]);
}

// ============================================================================
// Stack-Driven Controls Hook
// ============================================================================

/**
 * Aggregates control buttons from all blocks on the stack.
 *
 * Button Resolution Strategy:
 * - Collect pinned buttons (isPinned === true) from ALL stack levels
 * - Collect non-pinned buttons from the TOP block only
 * - Deduplicate by button ID (pinned take precedence)
 *
 * When a block is popped, its buttons are automatically removed because
 * the stack subscription triggers a re-scan.
 *
 * @returns Array of active button configurations
 */
export function useActiveControls(): ButtonConfig[] {
    const blocks = useSnapshotBlocks();
    const [version, setVersion] = useState(0);

    // Subscribe to controls memory changes on all blocks
    useEffect(() => {
        const unsubscribes: (() => void)[] = [];

        for (const block of blocks) {
            const controlsLocs = block.getMemoryByTag('controls');
            for (const loc of controlsLocs) {
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
        const pinned: ButtonConfig[] = [];
        let topButtons: ButtonConfig[] = [];

        for (let i = 0; i < blocks.length; i++) {
            const controlsLocs = blocks[i].getMemoryByTag('controls');
            if (controlsLocs.length === 0) continue;

            // Each fragment in the controls location IS a button config
            const buttons = controlsLocs[0].fragments
                .map(f => f.value as ButtonConfig)
                .filter(Boolean);
            const isTop = i === blocks.length - 1;

            for (const btn of buttons) {
                if (btn.isPinned) {
                    pinned.push(btn);
                } else if (isTop) {
                    topButtons.push(btn);
                }
            }
        }

        // Deduplicate by ID: pinned take precedence
        const seen = new Set<string>();
        const result: ButtonConfig[] = [];

        for (const btn of pinned) {
            if (!seen.has(btn.id)) {
                seen.add(btn.id);
                result.push(btn);
            }
        }
        for (const btn of topButtons) {
            if (!seen.has(btn.id)) {
                seen.add(btn.id);
                result.push(btn);
            }
        }

        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, version]);
}

// ============================================================================
// Stack-Driven Fragment Source Hook
// ============================================================================

/**
 * Represents a fragment source on the stack with layout context.
 *
 * Extends the generic FragmentSourceEntry with a block reference for
 * runtime-specific scenarios (accessing memory, dispatching events).
 */
export interface StackFragmentEntry extends FragmentSourceEntry {
    /** The owning runtime block */
    block: IRuntimeBlock;
}

/**
 * Hook that converts the runtime stack into an array of IFragmentSource entries.
 *
 * Each block on the stack with a `'fragment:display'` memory entry produces a
 * `StackFragmentEntry` containing the `IFragmentSource` and layout context
 * (depth, leaf status, label).
 *
 * This is the preferred way for UI components to access fragment data from
 * the stack, replacing `useStackDisplayItems()` which returns `IDisplayItem[]`.
 *
 * @returns Array of stack fragment entries, or undefined if no blocks on stack
 *
 * @example
 * ```tsx
 * function StackView() {
 *   const entries = useStackFragmentSources();
 *   if (!entries) return null;
 *
 *   return entries.map(entry => (
 *     <FragmentVisualizer
 *       key={entry.source.id}
 *       fragments={entry.source.getDisplayFragments()}
 *     />
 *   ));
 * }
 * ```
 */
export function useStackFragmentSources(): StackFragmentEntry[] | undefined {
    const blocks = useSnapshotBlocks();
    const [version, setVersion] = useState(0);

    // Subscribe to fragment:display memory changes on all blocks
    useEffect(() => {
        const unsubscribes: (() => void)[] = [];

        for (const block of blocks) {
            const displayLocs = block.getMemoryByTag('fragment:display');
            for (const loc of displayLocs) {
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
        if (blocks.length === 0) return undefined;

        const entries: StackFragmentEntry[] = [];
        const orderedBlocks = [...blocks].reverse();

        orderedBlocks.forEach((block, index) => {
            // Skip root blocks without meaningful labels
            if (block.blockType === 'Root' && !block.label) return;

            // Get all fragment:display locations from list-based memory
            const displayLocs = block.getMemoryByTag('fragment:display');

            // Create fallback source for blocks without fragment:display memory
            let source: IFragmentSource;
            if (displayLocs.length === 0) {
                // Fallback: create synthetic fragment source from block label
                if (!block.label) return; // Skip blocks with no display entry AND no label

                source = {
                    id: block.key.toString(),
                    getDisplayFragments: () => [],
                    getFragment: () => undefined,
                    getAllFragmentsByType: () => [],
                    hasFragment: () => false,
                    rawFragments: [],
                } as IFragmentSource;
            } else {
                // Create an IFragmentSource adapter from the memory locations
                const allFragments = displayLocs.flatMap(loc => loc.fragments);
                source = {
                    id: block.key.toString(),
                    getDisplayFragments: () => allFragments,
                    getFragment: (type) => allFragments.find(f => f.fragmentType === type),
                    getAllFragmentsByType: (type) => allFragments.filter(f => f.fragmentType === type),
                    hasFragment: (type) => allFragments.some(f => f.fragmentType === type),
                    rawFragments: allFragments,
                } as IFragmentSource;
            }

            const isLeaf = index === orderedBlocks.length - 1;

            // Get raw fragment groups from list-based memory for multi-line display
            const fragmentGroups = displayLocs.length > 1
                ? displayLocs.map(loc => loc.fragments)
                : undefined;

            entries.push({
                source,
                block,
                depth: index,
                isLeaf,
                label: block.label,
                fragmentGroups,
            });
        });

        return entries.length > 0 ? entries : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, version]);
}

// ============================================================================
// Stack-Driven Display Rows Hook (List-Based Memory API)
// ============================================================================

/**
 * Represents a display entry with list-based memory access.
 *
 * Replaces IFragmentSource adapter with direct ICodeFragment[][] access.
 */
export interface StackDisplayEntry {
    /** The owning runtime block */
    block: IRuntimeBlock;
    /** Display rows - each row is an array of fragments */
    displayRows: ICodeFragment[][];
    /** Display label from block */
    label: string;
    /** Nesting depth for indentation (0 = root level) */
    depth: number;
    /** Whether this is the leaf (most active) entry */
    isLeaf: boolean;
    /** Raw fragment groups from block memory (for backward compatibility) */
    fragmentGroups?: readonly (readonly ICodeFragment[])[];
}

/**
 * Hook that reads list-based memory directly from runtime stack blocks.
 *
 * This is the Phase 3 UI migration hook that consumes the list-based memory
 * API populated by Phase 2 behaviors. It subscribes to all 'fragment:display'
 * memory locations and returns display rows without requiring IFragmentSource
 * adapter layer.
 *
 * Each block can have multiple 'fragment:display' memory locations (non-unique
 * tags in list-based API), where each location stores ICodeFragment[]. These
 * are returned as displayRows: ICodeFragment[][].
 *
 * @returns Array of stack display entries, or undefined if no blocks on stack
 *
 * @example
 * ```tsx
 * function StackView() {
 *   const entries = useStackDisplayRows();
 *   if (!entries) return null;
 *
 *   return entries.map(entry => (
 *     <div key={entry.block.key.toString()}>
 *       {entry.displayRows.map((row, idx) => (
 *         <FragmentSourceRow key={idx} fragments={row} />
 *       ))}
 *     </div>
 *   ));
 * }
 * ```
 */
export function useStackDisplayRows(): StackDisplayEntry[] | undefined {
    const blocks = useSnapshotBlocks();
    const [version, setVersion] = useState(0);

    // Subscribe to all fragment:display memory locations on all blocks
    useEffect(() => {
        const unsubscribes: (() => void)[] = [];

        for (const block of blocks) {
            const displayLocs = block.getMemoryByTag('fragment:display');
            for (const loc of displayLocs) {
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
        if (blocks.length === 0) return undefined;

        const entries: StackDisplayEntry[] = [];
        const orderedBlocks = [...blocks].reverse();

        orderedBlocks.forEach((block, index) => {
            // Skip root blocks without meaningful labels
            if (block.blockType === 'Root' && !block.label) return;

            // Get all fragment:display locations from list-based memory
            const displayLocs = block.getMemoryByTag('fragment:display');

            // Convert locations to display rows
            const displayRows = displayLocs.map(loc => loc.fragments);

            // Skip blocks with no display data AND no label
            if (displayRows.length === 0 && !block.label) return;

            const isLeaf = index === orderedBlocks.length - 1;

            // Get raw fragment groups from list-based memory for multi-line display
            const fragmentGroups = displayLocs.length > 1
                ? displayLocs.map(loc => loc.fragments)
                : undefined;

            entries.push({
                block,
                displayRows,
                label: block.label,
                depth: index,
                isLeaf,
                fragmentGroups,
            });
        });

        return entries.length > 0 ? entries : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, version]);
}
