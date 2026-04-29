/**
 * ProjectionSyncContext — Provides Chromecast subscription reference for analytics sync.
 *
 * This allows useWorkbenchEffects to send analytics summary projections
 * to the Chromecast receiver without requiring dynamic engine imports.
 */

import React, { createContext, useContext } from 'react';
import type { IRuntimeSubscription } from '@/hooks/useRuntimeTimer';

interface ProjectionSyncContextValue {
    updateFromSegments: (
        segments: any[],
        totalElapsedMs: number,
        segmentCount: number,
    ) => void;
    clear: () => void;
}

const defaultContext: ProjectionSyncContextValue = {
    updateFromSegments: () => {},
    clear: () => {},
};

const ProjectionSyncContext = createContext<ProjectionSyncContextValue>(defaultContext);

/**
 * Hook to access the projection sync context.
 */
export function useProjectionSync(): ProjectionSyncContextValue {
    return useContext(ProjectionSyncContext);
}

export interface ProjectionSyncProviderProps {
    children: React.ReactNode;
    chromecastSubscription?: IRuntimeSubscription | null;
}

/**
 * Provider component for projection sync context.
 *
 * Passes the Chromecast subscription reference so useWorkbenchEffects
 * can send analytics summary results directly.
 */
export const ProjectionSyncProvider: React.FC<ProjectionSyncProviderProps> = ({
    children,
    chromecastSubscription = null,
}) => {
    return (
        <ProjectionSyncContext.Provider value={{
            updateFromSegments: (segments, totalElapsedMs, segmentCount) => {
                // Send analytics summary to Chromecast subscription
                if (chromecastSubscription?.sendAnalyticsSummary) {
                    chromecastSubscription.sendAnalyticsSummary(
                        [],
                        totalElapsedMs,
                        segmentCount,
                    );
                }
            },
            clear: () => {
                // No-op for this simple implementation
            },
        }}>
            {children}
        </ProjectionSyncContext.Provider>
    );
};
