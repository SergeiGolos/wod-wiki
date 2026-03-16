/**
 * timer-panel-chromecast.tsx — Chromecast receiver timer panel.
 * Renders the primary/secondary timers using standard runtime hooks
 * and the shared TimerStackView component.
 *
 * Extracted from receiver-rpc.tsx ReceiverTimerPanel.
 */

import React from 'react';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { useSnapshotBlocks } from '@/runtime/hooks/useStackSnapshot';
import { usePrimaryTimer, useSecondaryTimers, useStackTimers } from '@/runtime/hooks/useStackDisplay';
import { calculateDuration } from '@/lib/timeUtils';
import type { FocusProps } from '@/hooks/useSpatialNavigation';

import { Music, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const ReceiverTimerPanel: React.FC<{
    localNow: number;
    onEvent: (name: string) => void;
    getFocusProps?: (id: string) => FocusProps;
    currentTrack?: string | null;
}> = ({ localNow, onEvent, getFocusProps, currentTrack }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const primaryTimerEntry = usePrimaryTimer();
    const secondaryTimers = useSecondaryTimers();
    const allTimers = useStackTimers();
    const blocks = useSnapshotBlocks();

    const isRunning = primaryTimerEntry
        ? primaryTimerEntry.timer.spans.some(s => s.ended === undefined)
        : false;

    const primaryElapsed = primaryTimerEntry
        ? calculateDuration(primaryTimerEntry.timer.spans, localNow)
        : 0;

    // Build timerStates map for TimerStackView
    const timerStates = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();
    for (const t of allTimers) {
        timerStates.set(t.block.key.toString(), {
            elapsed: calculateDuration(t.timer.spans, localNow),
            duration: t.timer.durationMs,
            format: t.timer.direction,
        });
    }

    // Use the leaf block's label as the timer header — it reflects the current
    // exercise (e.g. "21 Thrusters") rather than the session root's generic
    // "Session" string. Fall back to the timer's own label when it's more
    // descriptive (AMRAP countdown, etc.) or when there's only one block.
    const leafLabel = blocks[0]?.label;
    const timerLabel = (leafLabel && leafLabel !== primaryTimerEntry?.timer.label)
        ? leafLabel
        : (primaryTimerEntry?.timer.label || 'Session');

    const primaryEntry = primaryTimerEntry ? {
        id: `timer-${primaryTimerEntry.block.key}`,
        ownerId: primaryTimerEntry.block.key.toString(),
        timerMemoryId: '',
        label: timerLabel,
        format: primaryTimerEntry.timer.direction,
        durationMs: primaryTimerEntry.timer.durationMs,
        role: primaryTimerEntry.isPinned ? 'primary' as const : 'auto' as const,
        accumulatedMs: primaryElapsed,
    } : undefined;

    const secondaryEntries = secondaryTimers.map(t => ({
        id: `timer-${t.block.key}`,
        ownerId: t.block.key.toString(),
        timerMemoryId: '',
        label: t.timer.label,
        format: t.timer.direction,
        durationMs: t.timer.durationMs,
        role: 'auto' as const,
        accumulatedMs: calculateDuration(t.timer.spans, localNow),
    }));

    return (
        <div className="flex-1 flex flex-col justify-center">
            {currentTrack !== undefined && (
                <div className="flex items-center justify-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-secondary/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 border border-border/50 shadow-sm max-w-[80%]">
                        <div className="bg-primary/20 p-1.5 rounded-full">
                            <Music className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-sm font-medium truncate flex-1 min-w-0 pr-2">
                            {currentTrack || "Loading playlist..."}
                        </div>
                        <Button
                            id="btn-playlist-playpause"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
                            onClick={() => {
                                setIsPlaying(!isPlaying);
                                // The actual event emission is handled by ReceiverApp's onSelect mapping for the ID
                            }}
                            {...(getFocusProps ? getFocusProps('btn-playlist-playpause') : {})}
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            )}
            <TimerStackView
                elapsedMs={primaryElapsed}
                hasActiveBlock={!!primaryTimerEntry}
                onStart={() => onEvent('start')}
                onPause={() => onEvent('pause')}
                onStop={() => onEvent('stop')}
                onNext={() => onEvent('next')}
                isRunning={isRunning}
                primaryTimer={primaryEntry}
                subLabel={undefined}
                secondaryTimers={secondaryEntries}
                timerStates={timerStates}
                getFocusProps={getFocusProps}
            />
        </div>
    );
};
