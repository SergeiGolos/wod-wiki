/**
 * WorkbenchCastBridge — renderless component that broadcasts workbench-level
 * display state to the Chromecast receiver via the active RPC transport.
 *
 * Uses viewMode (synced from WorkbenchContext into the store) as the PRIMARY
 * signal for which display mode to send to the receiver, so navigation changes
 * in the browser immediately update the receiver regardless of runtime state.
 *
 * Mode mapping:
 * - viewMode 'track'  + runtime running/paused  → 'active'  (stack/timer drives TV)
 * - viewMode 'track'  + workout just ended       → 'review'  (analytics summary)
 * - viewMode 'review'                            → 'review'  (analytics summary)
 * - viewMode 'plan' / 'analyze' / other          → 'preview' (document info) or 'idle'
 *
 * Placement: inside RuntimeLifecycleProvider to participate in the runtime
 * lifecycle, but store-backed values such as runtime, execution, and
 * documentItems may still be unavailable on the first render because
 * hydration happens via useWorkbenchEffects() after mount.
 */

import React, { useEffect, useRef } from 'react';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import type { RpcWorkbenchUpdate } from '@/services/cast/rpc/RpcMessages';
import { formatTimeMMSS } from '@/lib/formatTime';
import type { Segment } from '@/core/models/AnalyticsModels';
import type { DocumentItem } from '@/components/Editor/utils/documentStructure';
import type { WodBlock } from '@/components/Editor/types';

export const WorkbenchCastBridge: React.FC = () => {
    const castTransport = useWorkbenchSyncStore(s => s.castTransport);
    const runtime = useWorkbenchSyncStore(s => s.runtime);
    const execution = useWorkbenchSyncStore(s => s.execution);
    const viewMode = useWorkbenchSyncStore(s => s.viewMode);
    const selectedBlock = useWorkbenchSyncStore(s => s.selectedBlock);
    const documentItems = useWorkbenchSyncStore(s => s.documentItems);
    const analyticsSegments = useWorkbenchSyncStore(s => s.analyticsSegments);

    // Fingerprint of the last sent message — avoids redundant sends
    const lastFingerprintRef = useRef<string>('');

    useEffect(() => {
        if (!castTransport?.connected) return;

        let message: RpcWorkbenchUpdate;

        if (viewMode === 'track') {
            if (runtime && (execution.status === 'running' || execution.status === 'paused')) {
                // Active workout in progress — stack subscription drives the TV display;
                // just signal the mode so the receiver doesn't overlay preview/review.
                message = { type: 'rpc-workbench-update', mode: 'active' };

            } else if (analyticsSegments.length > 0) {
                // Workout just ended while still on the track view — show results.
                message = buildReviewMessage(analyticsSegments);

            } else if (runtime) {
                // On track view, runtime exists but not yet started (idle).
                // Show 'active' mode so the TV displays the stack ("Ready to Start") 
                // matching the browser view.
                message = { type: 'rpc-workbench-update', mode: 'active' };

            } else {
                // On track view but no runtime yet (selecting a block) → show plan preview.
                message = buildPreviewMessage(selectedBlock, documentItems);
            }

        } else if (viewMode === 'review') {
            // Explicitly on the review view.
            if (analyticsSegments.length > 0) {
                message = buildReviewMessage(analyticsSegments);
            } else {
                // Analytics were cleared (navigated to a new note) — show the
                // new document in preview mode rather than a blank idle screen.
                message = buildPreviewMessage(selectedBlock, documentItems);
            }

        } else {
            // plan, analyze, history, tv — show document preview or idle.
            message = buildPreviewMessage(selectedBlock, documentItems);
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
        viewMode,
        runtime,
        execution.status,
        selectedBlock,
        documentItems,
        analyticsSegments,
    ]);

    return null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildReviewMessage(
    analyticsSegments: Segment[],
): RpcWorkbenchUpdate {
    // Derive total duration from segments instead of old time-series data
    const totalSeconds = analyticsSegments.length > 0
        ? Math.max(...analyticsSegments.map(s => s.endTime)) - Math.min(...analyticsSegments.map(s => s.startTime))
        : 0;
    const totalMs = Math.round(totalSeconds * 1000);

    const rows: Array<{ label: string; value: string }> = [];
    if (totalMs > 0) {
        rows.push({ label: 'Total Time', value: formatTimeMMSS(totalMs) });
    }
    rows.push({ label: 'Segments', value: String(analyticsSegments.length) });

    const maxDepth = Math.max(...analyticsSegments.map(s => s.depth));
    const leafSegs = analyticsSegments.filter(s => s.depth === maxDepth).slice(0, 4);
    leafSegs.forEach(seg => {
        rows.push({
            label: seg.name || 'Segment',
            value: formatTimeMMSS(Math.round(seg.elapsed * 1000)),
        });
    });

    return {
        type: 'rpc-workbench-update',
        mode: 'review',
        reviewData: {
            totalDurationMs: totalMs,
            completedSegments: analyticsSegments.length,
            rows,
        },
    };
}

function buildPreviewMessage(
    selectedBlock: WodBlock | null,
    documentItems: DocumentItem[],
): RpcWorkbenchUpdate {
    const wodItems = documentItems.filter(i => i.type === 'wod');

    if (wodItems.length === 0 && !selectedBlock) {
        return { type: 'rpc-workbench-update', mode: 'idle' };
    }

    const titleSource = selectedBlock?.content ?? wodItems[0]?.content ?? '';
    const title = titleSource.split('\n')[0].trim().substring(0, 60) || 'Workout';

    const blocks = wodItems.slice(0, 8).map(item => ({
        id: item.id,
        title: (item.wodBlock?.content ?? item.content).split('\n')[0].trim().substring(0, 50) || 'Workout',
        statementCount: item.wodBlock?.statements?.length ?? 0,
    }));

    return {
        type: 'rpc-workbench-update',
        mode: 'preview',
        previewData: { title, blocks },
    };
}

