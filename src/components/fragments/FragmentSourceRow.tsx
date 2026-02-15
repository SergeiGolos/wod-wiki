/**
 * FragmentSourceRow.tsx - Fragment source row for unified visualization
 *
 * Renders an IFragmentSource directly, without requiring the IDisplayItem
 * adapter layer. Layout metadata (depth, active status) is provided via
 * props rather than baked into an intermediate data structure.
 *
 * Supports multi-group rendering: when a block has multiple fragment groups
 * (from `+` linked statements), each group is displayed as a separate line
 * within the same row container.
 *
 * @see docs/FragmentOverhaul.md - Phase 5: Eliminate IDisplayItem
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { IFragmentSource } from '@/core/contracts/IFragmentSource';
import { ICodeFragment } from '@/core/models/CodeFragment';
import { VisualizerSize, VisualizerFilter } from '@/core/models/DisplayItem';

export type FragmentSourceStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

/**
 * A generic entry for rendering fragment sources in a list.
 *
 * This replaces IDisplayItem as the standard shape for list rendering.
 * `StackFragmentEntry` extends this with an `IRuntimeBlock` reference
 * for runtime-specific scenarios.
 */
export interface FragmentSourceEntry {
    /** The fragment source to render */
    source: IFragmentSource;
    /** Nesting depth for indentation (0 = root level) */
    depth: number;
    /** Whether this is the leaf (most active) entry */
    isLeaf?: boolean;
    /** Whether this entry should render as a section header */
    isHeader?: boolean;
    /** Whether this item is part of a linked group (+ statements) */
    isLinked?: boolean;
    /** Display label (fallback if fragments empty) */
    label?: string;
    /** Explicit status. If not set, derived from isLeaf */
    status?: FragmentSourceStatus;
    /** Duration in milliseconds (for duration column) */
    duration?: number;
    /** Start time in milliseconds */
    startTime?: number;
    /** End time in milliseconds */
    endTime?: number;
    /** Raw fragment groups from block memory for multi-line display */
    fragmentGroups?: readonly (readonly ICodeFragment[])[];
}

export interface FragmentSourceRowProps {
    /** The fragment source to render (optional if fragments provided) */
    source?: IFragmentSource;
    /** Direct fragments array (takes precedence over source.getDisplayFragments()) */
    fragments?: ICodeFragment[];
    /** Current execution status @default 'pending' */
    status?: FragmentSourceStatus;
    /** Nesting depth for indentation (0 = root level) @default 0 */
    depth?: number;
    /** Display size variant @default 'normal' */
    size?: VisualizerSize;
    /** Optional filter configuration */
    filter?: VisualizerFilter;
    /** Whether this item is currently selected */
    isSelected?: boolean;
    /** Whether this item is highlighted (e.g., hovered) */
    isHighlighted?: boolean;
    /** Whether this item should render as a section header */
    isHeader?: boolean;
    /** Display label (fallback if fragments empty) */
    label?: string;
    /** Show duration column */
    showDuration?: boolean;
    /** Duration in ms (used when showDuration is true) */
    duration?: number;
    /** Render custom actions (e.g., timer pill, buttons) */
    actions?: React.ReactNode;
    /** Raw fragment groups for multi-line rendering within a single row */
    fragmentGroups?: readonly (readonly ICodeFragment[])[];
    /** Click handler */
    onClick?: (source?: IFragmentSource, modifiers?: { ctrlKey: boolean; shiftKey: boolean }) => void;
    /** Double click handler */
    onDoubleClick?: (source?: IFragmentSource) => void;
    /** Hover handler */
    onHover?: (source?: IFragmentSource | null) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
    if (!ms || ms < 0) return '';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
}



export const FragmentSourceRow: React.FC<FragmentSourceRowProps> = ({
    source,
    fragments: fragmentsProp,
    status: _status = 'pending',
    depth = 0,
    size = 'normal',
    filter,
    isSelected = false,
    isHighlighted = false,
    isHeader = false,
    label,
    showDuration = false,
    duration,
    actions,
    fragmentGroups,
    onClick,
    onDoubleClick,
    onHover,
    className
}) => {
    // Configuration based on size
    const config = {
        compact: {
            indent: 12,
            baseIndent: 8,
            fontSize: 'text-xs md:text-sm',
        },
        normal: {
            indent: 16,
            baseIndent: 12,
            fontSize: 'text-sm md:text-base',
        },
        focused: {
            indent: 20,
            baseIndent: 16,
            fontSize: 'text-base md:text-lg',
        }
    };

    const currentConfig = config[size];
    const paddingLeft = depth * currentConfig.indent;

    // Get display-ready fragments: prioritize direct fragments prop, fall back to source
    const fragments = fragmentsProp ?? (source?.getDisplayFragments(filter ? {
        origins: filter.allowedOrigins,
        // Map VisualizerFilter to FragmentFilter where possible
    } : undefined) || []);

    const handleClick = (e: React.MouseEvent) => {
        onClick?.(source, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
    };
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onDoubleClick?.(source);
    };
    const handleMouseEnter = () => { onHover?.(source); };
    const handleMouseLeave = () => { onHover?.(null); };

    // Derive label from source if not provided
    const displayLabel = label ?? (fragments.length === 0 ? (source ? `Block ${source.id}` : 'Block') : undefined);

    return (
        <div
            className={cn(
                // Base styles
                'flex items-center gap-2 transition-all px-2',
                // Header styling
                isHeader && 'font-semibold bg-muted/30',
                // Interactive states
                onClick && 'cursor-pointer hover:bg-muted/50',
                isSelected && 'bg-primary/10',
                isHighlighted && 'bg-muted/40',
                // Custom className
                className
            )}
            style={{
                paddingLeft: `${paddingLeft + currentConfig.baseIndent}px`,
                minHeight: 'var(--wod-preview-statement-height)',
                paddingTop: 'var(--wod-preview-statement-gap)',
                paddingBottom: 'var(--wod-preview-statement-gap)',
            }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {/* Main content: fragments (multi-group or single line) */}
            <div className="flex-1 min-w-0">
                {fragmentGroups && fragmentGroups.length > 1 ? (
                    <div className="flex flex-col">
                        {fragmentGroups.filter(g => g.length > 0).map((group, i, arr) => (
                            <div
                                key={i}
                                className={cn(
                                    i < arr.length - 1 && 'border-b border-border/20 pb-0.5 mb-0.5'
                                )}
                            >
                                <FragmentVisualizer
                                    fragments={[...group]}
                                    size={size}
                                    filter={filter}
                                    className={cn("inline-flex", currentConfig.fontSize)}
                                />
                            </div>
                        ))}
                    </div>
                ) : fragments.length > 0 ? (
                    <FragmentVisualizer
                        fragments={fragments}
                        size={size}
                        filter={filter}
                        className={cn("inline-flex", currentConfig.fontSize)}
                    />
                ) : displayLabel ? (
                    <span className={cn(
                        'text-muted-foreground',
                        currentConfig.fontSize
                    )}>
                        {displayLabel}
                    </span>
                ) : (
                    <span className="text-muted-foreground/50 italic text-xs">
                        No data
                    </span>
                )}
            </div>

            {/* Duration column */}
            {showDuration && duration !== undefined && duration > 0 && (
                <div className="flex-shrink-0 text-muted-foreground tabular-nums text-right min-w-[40px]"
                    style={{ fontSize: size === 'compact' ? '10px' : '12px' }}>
                    {formatDuration(duration)}
                </div>
            )}

            {/* Custom actions slot */}
            {actions && (
                <div className="flex-shrink-0 flex items-center gap-1">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default FragmentSourceRow;
