/**
 * MetricSourceRow.tsx - Fragment source row for unified visualization
 *
 * Renders an IMetricSource directly, without requiring the IDisplayItem
 * adapter layer. Layout metadata (depth, active status) is provided via
 * props rather than baked into an intermediate data structure.
 *
 * Supports multi-group rendering: when a block has multiple metrics groups
 * (from `+` linked statements), each group is displayed as a separate line
 * within the same row container.
 *
 * @see docs/FragmentOverhaul.md - Phase 5: Eliminate IDisplayItem
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { MetricVisualizer } from '../../views/runtime/MetricVisualizer';
import { IMetricSource } from '@/core/contracts/IMetricSource';
import { IMetric } from '@/core/models/Metric';
import { VisualizerSize, VisualizerFilter } from '@/core/models/DisplayItem';

export type FragmentSourceStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

/**
 * A generic entry for rendering metrics sources in a list.
 *
 * This replaces IDisplayItem as the standard shape for list rendering.
 * `StackFragmentEntry` extends this with an `IRuntimeBlock` reference
 * for runtime-specific scenarios.
 */
export interface FragmentSourceEntry {
    /** The metrics source to render */
    source: IMetricSource;
    /** Nesting depth for indentation (0 = root level) */
    depth: number;
    /** Whether this is the leaf (most active) entry */
    isLeaf?: boolean;
    /** Whether this entry should render as a section header */
    isHeader?: boolean;
    /** Whether this item is part of a linked group (+ statements) */
    isLinked?: boolean;
    /** Display label (fallback if metrics empty) */
    label?: string;
    /** Explicit status. If not set, derived from isLeaf */
    status?: FragmentSourceStatus;
    /** Duration in milliseconds (for duration column) */
    duration?: number;
    /** Start time in milliseconds */
    startTime?: number;
    /** End time in milliseconds */
    endTime?: number;
    /** Raw metrics groups from block memory for multi-line display */
    metricGroups?: readonly (readonly IMetric[])[];
}

export interface MetricSourceRowProps {
    /** The metric source to render (optional if metric provided) */
    source?: IMetricSource;
    /** Direct metric array (takes precedence over source.getDisplayMetrics()) */
    metrics?: IMetric[];
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
    /** Whether this is the leaf (most active) entry */
    isLeaf?: boolean;
    /** Whether this item should render as a section header */
    isHeader?: boolean;
    /** Display label (fallback if metrics empty) */
    label?: string;
    /** Show duration column */
    showDuration?: boolean;
    /** Duration in ms (used when showDuration is true) */
    duration?: number;
    /** Render custom actions (e.g., timer pill, buttons) */
    actions?: React.ReactNode;
    /** Raw metrics groups for multi-line rendering within a single row */
    metricGroups?: readonly (readonly IMetric[])[];
    /** Click handler */
    onClick?: (source?: IMetricSource, modifiers?: { ctrlKey: boolean; shiftKey: boolean }) => void;
    /** Double click handler */
    onDoubleClick?: (source?: IMetricSource) => void;
    /** Hover handler */
    onHover?: (source?: IMetricSource | null) => void;
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



export const MetricSourceRow: React.FC<MetricSourceRowProps> = ({
    source,
    metrics: metricProp,
    status: _status = 'pending',
    depth = 0,
    size = 'normal',
    filter,
    isSelected = false,
    isHighlighted = false,
    isLeaf = false,
    isHeader = false,
    label,
    showDuration = false,
    duration,
    actions,
    metricGroups,
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

    // Get display-ready metrics: prioritize direct metric prop, fall back to source
    const metrics = metricProp ?? (source?.getDisplayMetrics(filter ? {
        origins: filter.allowedOrigins,
        // Map VisualizerFilter to MetricFilter where possible
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
    const displayLabel = label ?? (metrics.length === 0 ? (source ? `Block ${source.id}` : 'Block') : undefined);

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
                isLeaf && 'font-bold',
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
            {/* Main content: metrics (multi-group or single line) */}
            <div className="flex-1 min-w-0">
                {metricGroups && metricGroups.length > 1 ? (
                    <div className="flex flex-col">
                        {metricGroups
                            .map(group => group.filter(f => {
                                const type = (f.type || f.metricType || '').toLowerCase();
                                const image = f.image || '';
                                if (type === 'group' && (image === '+' || image === '-')) return false;
                                return type !== 'lap';
                            }))
                            .filter(g => g.length > 0).map((group, i, arr) => (
                            <div
                                key={i}
                                className={cn(
                                    i < arr.length - 1 && 'border-b border-border/20 pb-0.5 mb-0.5'
                                )}
                            >
                                <MetricVisualizer
                                    metric={[...group]}
                                    size={size}
                                    filter={filter}
                                    className={cn("inline-flex", currentConfig.fontSize)}
                                />
                            </div>
                        ))}
                    </div>
                ) : metrics.length > 0 ? (
                    <MetricVisualizer
                        metric={metric}
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

export default MetricSourceRow;
