/**
 * preview-panel-chromecast.tsx — Chromecast receiver preview panel.
 * Shown when a note is loaded but no runtime is active.
 * Displays the workout title and block list for the user to browse.
 *
 * Extracted from receiver-rpc.tsx ReceiverPreviewPanel.
 */

import React from 'react';
import type { WorkbenchDisplayState } from '@/services/cast/rpc/ChromecastProxyRuntime';
import type { FocusProps } from '@/hooks/useSpatialNavigation';
import {
    Dumbbell,
    Play,
} from 'lucide-react';

export const ReceiverPreviewPanel: React.FC<{
    previewData: NonNullable<WorkbenchDisplayState['previewData']>;
    getFocusProps?: (id: string) => FocusProps;
}> = ({ previewData, getFocusProps }) => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-8 p-12 bg-background">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <Dumbbell className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold tracking-tight text-foreground">Wod.Wiki</span>
            </div>

            {/* Title */}
            <div className="text-center">
                <h1 className="text-4xl font-bold text-foreground leading-tight">
                    {previewData.title}
                </h1>
                <p className="mt-2 text-muted-foreground text-lg">Select a workout to begin</p>
            </div>

            {/* Workout list */}
            {previewData.blocks.length > 0 && (
                <div className="w-full max-w-lg flex flex-col gap-2">
                    {previewData.blocks.map((block, index) => (
                        <div
                            key={block.id}
                            {...(getFocusProps ? getFocusProps(`preview-block-${index}`) : {})}
                            className="tv-focusable flex items-center justify-between rounded-lg border border-border/60 bg-card/50 px-4 py-3 text-sm transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Play className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-foreground truncate max-w-xs">
                                    {block.title}
                                </span>
                            </div>
                            {block.statementCount > 0 && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {block.statementCount} steps
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-muted-foreground/40 font-mono uppercase tracking-widest">
                Ready
            </p>
        </div>
    );
};
