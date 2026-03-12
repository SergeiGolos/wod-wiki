/**
 * track-panel-chromecast.tsx — Chromecast receiver stack panel.
 * Renders the runtime stack using standard hooks, mirroring the browser's
 * RuntimeStackView with completion summaries and "Up Next" preview.
 *
 * Extracted from receiver-rpc.tsx ReceiverStackPanel.
 */

import React from 'react';
import { useSnapshotBlocks } from '@/runtime/hooks/useStackSnapshot';
import { useStackTimers } from '@/runtime/hooks/useStackDisplay';
import { useNextPreview } from '@/runtime/hooks/useNextPreview';
import { useOutputStatements } from '@/runtime/hooks/useOutputStatements';
import { MetricSourceRow } from '@/components/metrics/MetricSourceRow';
import { cn } from '@/lib/utils';
import { formatTimeMMSS } from '@/lib/formatTime';
import { calculateDuration } from '@/lib/timeUtils';
import {
    Timer,
    CheckCircle2,
    Clock,
} from 'lucide-react';

export const ReceiverStackPanel: React.FC<{ localNow: number }> = ({ localNow }) => {
    const blocks = useSnapshotBlocks();
    const nextPreview = useNextPreview();
    const allTimers = useStackTimers();
    const { outputs } = useOutputStatements();

    // Build timer lookup
    const blockTimerMap = new Map<string, {
        elapsed: number;
        durationMs?: number;
        direction: 'up' | 'down';
        isRunning: boolean;
    }>();
    for (const entry of allTimers) {
        const blockKey = entry.block.key.toString();
        blockTimerMap.set(blockKey, {
            elapsed: calculateDuration(entry.timer.spans, localNow),
            durationMs: entry.timer.durationMs,
            direction: entry.timer.direction,
            isRunning: entry.timer.spans.some(s => s.ended === undefined),
        });
    }

    // Root→leaf order (stack is leaf→root)
    const orderedBlocks = [...blocks].reverse();

    // Helper: render interleaved completion summary for a given stack level.
    // Mirrors the browser's RuntimeStackView.renderHistorySummary() logic.
    const renderCompletionSummary = (childLevel: number) => {
        const levelOutputs = outputs.filter(
            o => o.stackLevel === childLevel && (o.outputType as string) === 'completion',
        );
        if (levelOutputs.length === 0) return null;

        const totalDuration = levelOutputs.reduce(
            (acc, curr) => acc + (curr.elapsed ?? curr.timeSpan.duration ?? 0), 0,
        );
        const formatDur = (ms: number) => {
            const s = Math.floor(ms / 1000);
            const m = Math.floor(s / 60);
            return `${m}:${String(s % 60).padStart(2, '0')}`;
        };

        return (
            <div className="flex items-center gap-3 text-xs text-muted-foreground py-2 pl-4 border-l-2 border-muted ml-3 my-1 bg-muted/5 rounded-r-md">
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-medium">{levelOutputs.length} Completed</span>
                </div>
                <div className="w-px h-3 bg-border/50" />
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono">{formatDur(totalDuration)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
            {/* Stack blocks with interleaved completion history */}
            <div className="shrink-0">
                {orderedBlocks.length > 0 ? (
                    <div className="flex flex-col gap-1 relative">
                        {orderedBlocks.map((block, index) => {
                            const blockKey = block.key.toString();
                            const timer = blockTimerMap.get(blockKey);
                            const isLeaf = index === orderedBlocks.length - 1;
                            const displayLocs = block.getMetricMemoryByVisibility('display');
                            const rows = displayLocs.map(loc => loc.metrics);
                            // Show completed children immediately after the parent block
                            const childLevel = index + 1;

                            return (
                                <React.Fragment key={blockKey}>
                                    <div className={cn(
                                        "relative w-full",
                                        isLeaf ? "animate-in fade-in slide-in-from-left-1 duration-300" : ""
                                    )}>
                                        <div className={cn(
                                            "rounded-md border text-sm transition-all",
                                            isLeaf
                                                ? "bg-card shadow-sm border-primary/40 ring-1 ring-primary/10"
                                                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
                                        )}>
                                            <div className="flex items-center justify-between gap-3 p-3">
                                                <div className="flex flex-col min-w-0">
                                                    <span className={cn(
                                                        "tracking-tight",
                                                        isLeaf ? "text-base font-bold text-foreground" : "text-xs font-medium text-muted-foreground/70"
                                                    )}>
                                                        {block.label}
                                                    </span>
                                                </div>
                                                {timer && (
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 px-2 py-1 rounded font-mono text-xs font-bold shrink-0",
                                                        timer.isRunning
                                                            ? "bg-primary/10 text-primary animate-pulse"
                                                            : "bg-muted text-muted-foreground"
                                                    )}>
                                                        <Timer className="h-3 w-3" />
                                                        {formatTimeMMSS(timer.elapsed)}
                                                    </div>
                                                )}
                                            </div>
                                            {rows.length > 0 && (
                                                <div className="flex flex-col gap-0.5 px-3 pb-2">
                                                    {rows.map((row, rowIdx) => (
                                                        <MetricSourceRow
                                                            key={rowIdx}
                                                            metrics={row}
                                                            size={isLeaf ? "normal" : "compact"}
                                                            isLeaf={isLeaf}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Interleaved completion history for children of this block */}
                                    {renderCompletionSummary(childLevel)}
                                </React.Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-md border border-border bg-card p-4">
                        <span className="text-base font-medium text-foreground capitalize">
                            Ready to Start
                        </span>
                    </div>
                )}
            </div>

            {/* Spacer */}
            <div className="flex-1 min-h-0" />

            {/* Up Next */}
            <div className="shrink-0 bg-muted/30 border border-dashed rounded-lg">
                <div className="p-3 pb-0">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Up Next
                    </h3>
                </div>
                <div className="p-3">
                    {nextPreview ? (
                        <div className={cn(
                            "rounded-md border text-sm transition-all",
                            "bg-card/50 border-border/60 hover:bg-card/80"
                        )}>
                            <div className="flex flex-col gap-0.5 p-3">
                                <MetricSourceRow
                                    metrics={nextPreview.metrics}
                                    size="compact"
                                    isLeaf={false}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-sm p-3 border border-dashed rounded-lg text-muted-foreground bg-muted/10">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="italic">End of section</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
