/**
 * WorkbenchCastBridge — renderless component that broadcasts workbench-level
 * display state to the Chromecast receiver via the active RPC transport.
 *
 * While a runtime is running, the ChromecastRuntimeSubscription handles stack
 * snapshot delivery.  This bridge fills in the gaps:
 *
 * - **preview** — a note is loaded but no runtime is active → shows plan on TV.
 * - **review**  — no active runtime, but analytics / result data exists → summary.
 * - **active**  — a runtime is running; stack subscription drives the TV.
 * - **idle**    — nothing to show.
 *
 * Placement: inside WorkbenchSyncBridge so the store is fully hydrated.
 */

import React, { useEffect, useRef } from 'react';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import type { RpcWorkbenchUpdate } from '@/services/cast/rpc/RpcMessages';
import { formatTimeMMSS } from '@/lib/formatTime';

export const WorkbenchCastBridge: React.FC = () => {
    const castTransport = useWorkbenchSyncStore(s => s.castTransport);
    const runtime = useWorkbenchSyncStore(s => s.runtime);
    const execution = useWorkbenchSyncStore(s => s.execution);
    const selectedBlock = useWorkbenchSyncStore(s => s.selectedBlock);
    const documentItems = useWorkbenchSyncStore(s => s.documentItems);
    const analyticsSegments = useWorkbenchSyncStore(s => s.analyticsSegments);
    const analyticsData = useWorkbenchSyncStore(s => s.analyticsData);

    // Fingerprint of the last sent message — avoids redundant sends
    const lastFingerprintRef = useRef<string>('');

    useEffect(() => {
        if (!castTransport?.connected) return;

        let message: RpcWorkbenchUpdate;

        if (runtime && (execution.status === 'running' || execution.status === 'paused')) {
            // Stack subscription drives the TV; just signal the mode so the
            // receiver knows not to show preview/review over the top.
            message = { type: 'rpc-workbench-update', mode: 'active' };

        } else if (!runtime && analyticsSegments.length > 0) {
            // Review mode: results from a completed workout
            const firstTime = analyticsData[0]?.time ?? 0;
            const lastTime = analyticsData[analyticsData.length - 1]?.time ?? 0;
            const totalMs = lastTime - firstTime;

            const rows: Array<{ label: string; value: string }> = [];
            if (totalMs > 0) {
                rows.push({ label: 'Total Time', value: formatTimeMMSS(totalMs) });
            }
            rows.push({ label: 'Segments', value: String(analyticsSegments.length) });

            // Add up to 4 representative segment times from the deepest level
            const maxDepth = Math.max(...analyticsSegments.map(s => s.depth));
            const leafSegs = analyticsSegments.filter(s => s.depth === maxDepth).slice(0, 4);
            leafSegs.forEach(seg => {
                rows.push({
                    label: seg.name || 'Segment',
                    value: formatTimeMMSS(Math.round(seg.elapsed * 1000)),
                });
            });

            message = {
                type: 'rpc-workbench-update',
                mode: 'review',
                reviewData: {
                    totalDurationMs: totalMs,
                    completedSegments: analyticsSegments.length,
                    rows,
                },
            };

        } else if (!runtime) {
            // Preview mode: show what's in the loaded document
            const wodItems = documentItems.filter(i => i.type === 'wod');

            if (wodItems.length === 0 && !selectedBlock) {
                message = { type: 'rpc-workbench-update', mode: 'idle' };
            } else {
                // Use the first line of the active block's content as the title
                const titleSource = selectedBlock?.content ?? wodItems[0]?.content ?? '';
                const title = titleSource.split('\n')[0].trim().substring(0, 60) || 'Workout';

                const blocks = wodItems.slice(0, 8).map(item => ({
                    id: item.id,
                    title: (item.wodBlock?.content ?? item.content).split('\n')[0].trim().substring(0, 50) || 'Workout',
                    statementCount: item.wodBlock?.statements?.length ?? 0,
                }));

                message = {
                    type: 'rpc-workbench-update',
                    mode: 'preview',
                    previewData: { title, blocks },
                };
            }
        } else {
            message = { type: 'rpc-workbench-update', mode: 'idle' };
        }

        // Skip send if nothing has changed
        const fingerprint = JSON.stringify(message);
        if (fingerprint === lastFingerprintRef.current) return;
        lastFingerprintRef.current = fingerprint;

        try {
            castTransport.send(message);
        } catch (err) {
            console.warn('[WorkbenchCastBridge] Failed to send workbench update:', err);
        }
    }, [
        castTransport,
        runtime,
        execution.status,
        selectedBlock,
        documentItems,
        analyticsSegments,
        analyticsData,
    ]);

    return null;
};
