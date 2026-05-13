/**
 * WorkbenchCastBridge — renderless component that broadcasts workbench-level
 * display state to the Chromecast receiver via the active RPC transport.
 */

import React, { useEffect, useRef } from 'react';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { workbenchModeResolver } from '@/app/cast/workbenchModeResolver';

export const WorkbenchCastBridge: React.FC = () => {
    const castTransport = useWorkbenchSyncStore((s) => s.castTransport);
    const runtime = useWorkbenchSyncStore((s) => s.runtime);
    const executionStatus = useWorkbenchSyncStore((s) => s.execution.status);
    const viewMode = useWorkbenchSyncStore((s) => s.viewMode);
    const selectedBlock = useWorkbenchSyncStore((s) => s.selectedBlock);
    const documentItems = useWorkbenchSyncStore((s) => s.documentItems);
    const analyticsSegments = useWorkbenchSyncStore((s) => s.analyticsSegments);

    // Fingerprint of the last sent message — avoids redundant sends
    const lastFingerprintRef = useRef<string>('');

    useEffect(() => {
        if (!castTransport?.connected) return;

        const message = workbenchModeResolver.resolve({
            viewMode,
            executionStatus,
            runtime,
            analyticsSegments,
            selectedBlock,
            documentItems,
        });

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
        executionStatus,
        selectedBlock,
        documentItems,
        analyticsSegments,
    ]);

    return null;
};
