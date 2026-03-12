/**
 * review-panel-chromecast.tsx — Chromecast receiver review panel.
 * Shown after a workout completes with analytics projections grid,
 * duration, and segment counts.
 *
 * Extracted from receiver-rpc.tsx ReceiverReviewPanel.
 */

import React from 'react';
import type { WorkbenchDisplayState } from '@/services/cast/rpc/ChromecastProxyRuntime';
import { cn } from '@/lib/utils';
import {
    Timer,
    CheckCircle2,
    BarChart3,
} from 'lucide-react';



export const ReceiverReviewPanel: React.FC<{
    reviewData: NonNullable<WorkbenchDisplayState['reviewData']>;
    analyticsSummary?: WorkbenchDisplayState['analyticsSummary'];
}> = ({ reviewData, analyticsSummary }) => {
    // Prefer analytics summary if available, otherwise fall back to simple rows
    const projections = analyticsSummary?.projections ?? [];
    const totalDurationMs = analyticsSummary?.totalDurationMs ?? reviewData?.totalDurationMs ?? 0;
    const completedSegments = analyticsSummary?.completedSegments ?? reviewData?.completedSegments ?? 0;

    // Format total duration
    const formatDuration = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-8 p-12 bg-background">
            {/* Header */}
            <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <h1 className="text-4xl font-bold text-foreground">Workout Complete</h1>
            </div>

            {/* Analytics Summary View */}
            {projections.length > 0 ? (
                <div className="w-full max-w-2xl flex flex-col gap-4">
                    {/* Total Duration Card */}
                    <div className="bg-card/50 border border-border/60 rounded-xl p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Timer className="h-6 w-6 text-primary" />
                            <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">Total Duration</span>
                                <span className="text-3xl font-bold text-foreground font-mono">
                                    {formatDuration(totalDurationMs)}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground/60">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-xs font-mono uppercase tracking-wider">
                                {completedSegments} segments
                            </span>
                        </div>
                    </div>

                    {/* Projection Results Grid */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {projections.map((proj, index) => {
                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex flex-col items-center gap-3 p-5 rounded-xl border transition-all",
                                        "bg-card/50 border-border/60 hover:bg-card/80"
                                    )}
                                >
                                    {/* Metric Value */}
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-lg font-bold text-foreground font-mono">
                                            {proj.value.toLocaleString()}
                                        </span>
                                        <span className="text-2xl font-bold text-foreground font-mono">
                                            {proj.value.toLocaleString()}
                                            <span className="text-sm font-medium text-muted-foreground ml-1">
                                                {proj.unit}
                                            </span>
                                        </span>
                                    </div>

                                    {/* Metric Name */}
                                    <span className="text-sm font-medium text-muted-foreground text-center">
                                        {proj.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                // Fallback to simple rows if no projections available
                <div className="w-full max-w-md flex flex-col gap-2">
                    {reviewData?.rows.map((row, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex items-center justify-between rounded-lg px-5 py-3 text-base",
                                i === 0
                                    ? "bg-primary/10 border border-primary/30 font-bold"
                                    : "bg-card/40 border border-border/40"
                            )}
                        >
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-mono font-semibold text-foreground">{row.value}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground/50">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-mono uppercase tracking-widest">
                    {completedSegments} segments completed
                </span>
            </div>
        </div>
    );
};
