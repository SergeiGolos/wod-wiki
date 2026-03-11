import React from 'react';
import { useWorkoutTracker } from '../../runtime/hooks/useWorkoutTracker';
import { useSnapshotBlocks } from '../../runtime/hooks/useStackSnapshot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Activity, Layers, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricTrackerCardProps {
    className?: string;
}

/**
 * MetricTrackerCard - Displays real-time progress of the current workout metrics
 * (reps, rounds) by subscribing to the live tracker updates.
 * 
 * It provides two views of progress:
 * 1. Global Totals: Summed values across the entire workout history (e.g. Total Reps)
 * 2. Active Progress: The current block's metrics and the most relevant parent round.
 */
export const MetricTrackerCard: React.FC<MetricTrackerCardProps> = ({ className }) => {
    const { metrics, rounds } = useWorkoutTracker();
    const blocks = useSnapshotBlocks();

    if (blocks.length === 0) return null;

    // 1. Calculate Global Totals (Sum across ALL blocks in history)
    const globalTotals: Record<string, { value: number; unit?: string }> = {};
    Object.values(metrics).forEach(blockMetrics => {
        Object.entries(blockMetrics).forEach(([key, data]) => {
            if (typeof data.value === 'number') {
                if (!globalTotals[key]) {
                    globalTotals[key] = { value: 0, unit: data.unit };
                }
                globalTotals[key].value += data.value;
            }
        });
    });

    // 2. Aggregate Active Progress (from blocks currently on the stack)
    const activeMetrics: Record<string, { value: any; unit?: string }> = {};
    let activeRounds: { current: number; total?: number; label: string } | undefined;

    for (const block of blocks) {
        const id = block.key.toString();
        
        // Collect rounds (the most nested parent wins)
        if (rounds[id]) {
            activeRounds = {
                ...rounds[id],
                label: block.label
            };
        }

        // Collect metrics for the stack
        const blockMetrics = metrics[id];
        if (blockMetrics) {
            Object.entries(blockMetrics).forEach(([key, data]) => {
                activeMetrics[key] = data;
            });
        }
    }

    const currentBlock = blocks[blocks.length - 1];
    const hasGlobalData = Object.keys(globalTotals).length > 0;
    
    return (
        <Card className={cn("overflow-hidden shadow-sm border-primary/20 bg-background/50 backdrop-blur-sm", className)}>
            <CardHeader className="pb-2 bg-primary/5 border-b border-border/50">
                <CardTitle className="text-[10px] font-bold flex items-center justify-between uppercase tracking-widest text-primary/80">
                    <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        Live Progress
                    </div>
                    <span className="opacity-50 font-medium">{currentBlock.label}</span>
                </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
                <div className="flex flex-col">
                    {/* Global Sums Section */}
                    {hasGlobalData && (
                        <div className="p-4 bg-primary/[0.02] border-b border-border/40">
                            <div className="flex items-center gap-1.5 mb-3 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                <Sigma className="h-2.5 w-2.5" />
                                Session Totals
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(globalTotals).map(([key, data]) => (
                                    <div key={`total-${key}`} className="flex flex-col">
                                        <span className="text-[9px] font-bold uppercase text-muted-foreground/70 mb-0.5">{key}</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-foreground tabular-nums leading-none tracking-tight">
                                                {data.value}
                                            </span>
                                            {data.unit && (
                                                <span className="text-[10px] font-bold text-primary/60 uppercase">{data.unit}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Progress Section */}
                    <div className="p-4 flex flex-col gap-4">
                        {/* Rounds Progress */}
                        {activeRounds && (
                            <div className="flex flex-col gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/60">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-tight">
                                        <Layers className="h-3 w-3" />
                                        {activeRounds.label || 'Round'}
                                    </span>
                                    <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                                        {activeRounds.current} {activeRounds.total ? `/ ${activeRounds.total}` : ''}
                                    </span>
                                </div>
                                {activeRounds.total && (
                                    <Progress value={(activeRounds.current / activeRounds.total) * 100} className="h-1 bg-muted-foreground/10" />
                                )}
                            </div>
                        )}

                        {/* Current metrics (leaf only) */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {Object.entries(activeMetrics).map(([key, data]) => (
                                <div key={`active-${key}`} className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase text-primary/50 tracking-tighter">Current {key}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-bold text-foreground tabular-nums leading-none">
                                            {data.value}
                                        </span>
                                        {data.unit && (
                                            <span className="text-[9px] font-medium text-muted-foreground uppercase">{data.unit}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!hasGlobalData && Object.keys(activeMetrics).length === 0 && !activeRounds && (
                            <div className="text-center py-4 text-muted-foreground text-[10px] font-medium uppercase tracking-widest opacity-30 italic">
                                Waiting for movement...
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
