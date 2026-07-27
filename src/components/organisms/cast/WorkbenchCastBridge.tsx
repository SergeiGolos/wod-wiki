/**
 * WorkbenchCastBridge — renderless component that broadcasts workbench-level
 * display state to the Chromecast receiver via the active RPC transport.
 */
import React, { useEffect, useRef } from 'react';
import { useCastTransport } from '@/contexts/CastTransportContext';
import { workbenchModeResolver } from '@/app/cast/workbenchModeResolver';
import { useWorkbenchSession } from '@/stores/workbenchSessionStore'

export const WorkbenchCastBridge: React.FC = () => {
    const castTransport = useCastTransport();
    const runtime = useWorkbenchSession((s) => s.runtime);
    const executionStatus = useWorkbenchSession((s) => s.execution.status);
    const viewMode = useWorkbenchSession((s) => s.viewMode);
    const selectedBlock = useWorkbenchSession((s) => s.selectedBlock);
    const documentItems = useWorkbenchSession((s) => s.documentItems);
    const analyticsSegments = useWorkbenchSession((s) => s.analyticsSegments);

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