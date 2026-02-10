import { useState, useEffect, useMemo } from 'react';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { TimerState, ButtonConfig } from '../memory/MemoryTypes';
import { IFragmentSource } from '../../core/contracts/IFragmentSource';
import { FragmentSourceEntry } from '../../components/unified/FragmentSourceRow';
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
 * Timer data is read directly from block memory via lock.getMemory('timer').
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
            const timerEntry = block.getMemory('timer');
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
            const timerEntry = block.getMemory('timer');
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
 * 1. Scan stack bottom-to-top for the LOWEST block with role === 'primary'
 * 2. If no pinned timer exists, use the leaf (top-of-stack) timer
 *
 * This allows a parent block (e.g., `For Time` or `AMRAP 20:00`) to pin its
 * timer as the main display, while child blocks (rounds, efforts) execute
 * beneath it without stealing the primary display.
 *
 * @returns The primary timer entry, or undefined if no timers on stack
 */
export function usePrimaryTimer(): StackTimerEntry | undefined {
    const timers = useStackTimers();

    return useMemo(() => {
        if (timers.length === 0) return undefined;

        // Find the lowest (first from bottom) pinned timer
        const pinned = timers.find(t => t.isPinned);
        if (pinned) return pinned;

        // Fallback: leaf timer (top of stack = last in array)
        return timers[timers.length - 1];
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
            const controlsEntry = block.getMemory('controls');
            if (controlsEntry) {
                const unsub = controlsEntry.subscribe(() => {
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
            const controlsEntry = blocks[i].getMemory('controls');
            if (!controlsEntry?.value) continue;

            const buttons = controlsEntry.value.buttons;
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
            const displayEntry = block.getMemory('fragment:display');
            if (displayEntry) {
                const unsub = displayEntry.subscribe(() => {
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

            // Get the DisplayFragmentMemory entry (implements IFragmentSource)
            const displayEntry = block.getMemory('fragment:display');
            if (!displayEntry) return;

            const source = displayEntry as unknown as IFragmentSource;
            const isLeaf = index === orderedBlocks.length - 1;

            entries.push({
                source,
                block,
                depth: index,
                isLeaf,
                label: block.label
            });
        });

        return entries.length > 0 ? entries : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, version]);
}
