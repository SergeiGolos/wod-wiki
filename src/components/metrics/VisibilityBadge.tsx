/**
 * VisibilityBadge.tsx
 *
 * Colored icon-badge indicating the visibility tier of a metric in the
 * runtime memory system. Used in debug-mode overlays.
 *
 *  display  – green Eye      – shown in the main display
 *  result   – purple Check   – recorded as a workout result
 *  promote  – blue Arrow     – promoted to a parent block
 *  private  – amber Lock     – private to the current block
 */

import React from 'react';
import { Eye, ArrowUpCircle, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricVisibility, VISIBILITY_LABELS } from '@/runtime/memory/MetricVisibility';

export const VISIBILITY_ICON_MAP: Record<MetricVisibility, React.ElementType> = {
    display: Eye,
    promote: ArrowUpCircle,
    private: Lock,
    result: CheckCircle2,
};

export const VISIBILITY_COLOR_MAP: Record<MetricVisibility, string> = {
    display: 'text-green-500',
    promote: 'text-blue-500',
    private: 'text-amber-500',
    result:  'text-purple-500',
};

export const VISIBILITY_BG_MAP: Record<MetricVisibility, string> = {
    display: 'bg-green-500/10',
    promote: 'bg-blue-500/10',
    private: 'bg-amber-500/10',
    result:  'bg-purple-500/10',
};

export const VisibilityBadge: React.FC<{ visibility: MetricVisibility }> = ({ visibility }) => {
    const Icon = VISIBILITY_ICON_MAP[visibility];
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                VISIBILITY_COLOR_MAP[visibility],
                VISIBILITY_BG_MAP[visibility],
            )}
            title={VISIBILITY_LABELS[visibility]}
        >
            <Icon className="h-3 w-3" />
            {VISIBILITY_LABELS[visibility]}
        </span>
    );
};

export default VisibilityBadge;
