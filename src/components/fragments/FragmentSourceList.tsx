/**
 * FragmentSourceList.tsx - List component for IFragmentSource visualization
 *
 * Renders an array of FragmentSourceEntry items (from any data source) directly,
 * without the IDisplayItem adapter layer.
 *
 * Supports:
 * - Auto-scrolling to active or leaf items
 * - Linked item grouping (+ statements)
 * - Selection and highlighting
 * - Duration display
 *
 * @see docs/FragmentOverhaul.md - Phase 5: Eliminate IDisplayItem
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { IFragmentSource } from '@/core/contracts/IFragmentSource';
import { VisualizerSize, VisualizerFilter } from '@/core/models/DisplayItem';
import { FragmentSourceRow, FragmentSourceStatus, FragmentSourceEntry } from './FragmentSourceRow';

export interface FragmentSourceListProps {
    /** Fragment source entries to display */
    entries: FragmentSourceEntry[];
    /** Display size variant @default 'normal' */
    size?: VisualizerSize;
    /** Optional filter configuration */
    filter?: VisualizerFilter;
    /** ID of the currently active item (for highlighting) */
    activeItemId?: string;
    /** Set of selected item IDs */
    selectedIds?: Set<string>;
    /** Show duration column per-entry */
    showDurations?: boolean;
    /** Group linked items visually (+ statements) */
    groupLinked?: boolean;
    /** Auto-scroll to active/leaf items */
    autoScroll?: boolean;
    /** Scroll behavior */
    scrollBehavior?: 'smooth' | 'auto';
    /** Render custom actions for each entry */
    renderActions?: (entry: FragmentSourceEntry) => React.ReactNode;
    /** Click handler (receives source) */
    onClick?: (source: IFragmentSource) => void;
    /** Selection change handler (receives source ID as string) */
    onSelectionChange?: (id: string | null) => void;
    /** Hover handler */
    onHover?: (source: IFragmentSource | null) => void;
    /** Additional CSS classes */
    className?: string;
    /** Message to show when list is empty */
    emptyMessage?: string;
    /** Maximum height with scroll */
    maxHeight?: string | number;
}

/**
 * LinkedGroup - Visual wrapper for grouped linked items
 */
const LinkedGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="border-l-2 border-orange-400/50 ml-2 pl-1 my-1 rounded-r">
        {children}
    </div>
);

/**
 * Group linked entries together into sub-arrays.
 * Non-linked entries remain standalone.
 */
function groupLinkedEntries(
    entries: FragmentSourceEntry[]
): (FragmentSourceEntry | FragmentSourceEntry[])[] {
    const result: (FragmentSourceEntry | FragmentSourceEntry[])[] = [];
    let currentGroup: FragmentSourceEntry[] = [];

    for (const entry of entries) {
        if (entry.isLinked) {
            currentGroup.push(entry);
        } else {
            if (currentGroup.length > 0) {
                result.push(currentGroup.length === 1 ? currentGroup[0] : currentGroup);
                currentGroup = [];
            }
            result.push(entry);
        }
    }

    if (currentGroup.length > 0) {
        result.push(currentGroup.length === 1 ? currentGroup[0] : currentGroup);
    }

    return result;
}

export const FragmentSourceList: React.FC<FragmentSourceListProps> = ({
    entries,
    size = 'normal',
    filter,
    activeItemId,
    selectedIds,
    showDurations = false,
    groupLinked = false,
    autoScroll = true,
    scrollBehavior = 'smooth',
    renderActions,
    onClick,
    onSelectionChange,
    onHover,
    className,
    emptyMessage = "No items to display",
    maxHeight
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeItemRef = useRef<HTMLDivElement>(null);

    // Find active entry for auto-scroll
    const activeEntry = useMemo(() => {
        if (activeItemId) {
            return entries.find(e => String(e.source.id) === activeItemId);
        }
        // Fallback: first entry with status 'active' or isLeaf
        return entries.find(e => e.status === 'active' || e.isLeaf);
    }, [entries, activeItemId]);

    // Auto-scroll to active entry
    useEffect(() => {
        if (autoScroll && activeEntry && activeItemRef.current && scrollRef.current) {
            activeItemRef.current.scrollIntoView({
                behavior: scrollBehavior,
                block: 'nearest'
            });
        }
    }, [autoScroll, activeEntry, scrollBehavior]);

    // Handlers
    const handleClick = useCallback((source: IFragmentSource) => {
        if (onSelectionChange) {
            onSelectionChange(String(source.id));
        }
        onClick?.(source);
    }, [onClick, onSelectionChange]);

    const handleHover = useCallback((source: IFragmentSource | null) => {
        onHover?.(source);
    }, [onHover]);

    // Process entries: optionally group linked items
    const processedEntries = useMemo(() => {
        if (!groupLinked) {
            return entries.map(entry => ({ type: 'single' as const, entry }));
        }
        const grouped = groupLinkedEntries(entries);
        return grouped.map(item => {
            if (Array.isArray(item)) {
                return { type: 'group' as const, entries: item };
            }
            return { type: 'single' as const, entry: item };
        });
    }, [entries, groupLinked]);

    // Render a single entry
    const renderEntry = (entry: FragmentSourceEntry, isInGroup = false) => {
        const entryId = String(entry.source.id);
        const isActive = activeItemId
            ? entryId === activeItemId
            : (entry.status === 'active' || entry.isLeaf);
        const isSelected = selectedIds?.has(entryId) ?? false;

        // Resolve status: explicit > isLeaf-based > pending
        const status: FragmentSourceStatus = entry.status
            ?? (entry.isLeaf ? 'active' : 'pending');

        // Calculate duration from timestamps if not provided
        const duration = entry.duration ??
            (entry.startTime !== undefined && entry.endTime !== undefined
                ? entry.endTime - entry.startTime
                : undefined);

        return (
            <div
                key={entryId}
                ref={isActive ? activeItemRef : undefined}
            >
                <FragmentSourceRow
                    source={entry.source}
                    status={status}
                    depth={entry.depth}
                    size={size}
                    filter={filter}
                    isSelected={isSelected}
                    isHighlighted={isActive && !isSelected}
                    isHeader={entry.isHeader}
                    label={entry.label}
                    showDuration={showDurations}
                    duration={duration}
                    fragmentGroups={entry.fragmentGroups}
                    actions={renderActions?.(entry)}
                    onClick={onSelectionChange || onClick ? handleClick : undefined}
                    onHover={onHover ? handleHover : undefined}
                    className={isInGroup ? 'border-l-orange-400/30' : undefined}
                />
            </div>
        );
    };

    // Empty state
    if (entries.length === 0) {
        return (
            <div className={cn(
                'flex items-center justify-center text-muted-foreground text-sm',
                size === 'compact' ? 'p-2' : size === 'focused' ? 'p-6' : 'p-4',
                className
            )}>
                {emptyMessage}
            </div>
        );
    }

    return (
        <div
            ref={scrollRef}
            className={cn('overflow-y-auto', className)}
            style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
        >
            <div>
                {processedEntries.map((processed, index) => {
                    if (processed.type === 'group') {
                        return (
                            <LinkedGroup key={`group-${index}`}>
                                {processed.entries.map(entry => renderEntry(entry, true))}
                            </LinkedGroup>
                        );
                    }
                    return renderEntry(processed.entry);
                })}
            </div>
        </div>
    );
};

export default FragmentSourceList;
