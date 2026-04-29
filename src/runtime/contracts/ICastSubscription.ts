import { IRuntimeSubscription } from './IRuntimeSubscription';

/**
 * Chromecast-specific subscription interface that extends IRuntimeSubscription
 * with analytics summary functionality.
 *
 * Only ChromecastRuntimeSubscription implements this interface — local
 * subscriptions do not support analytics summary.
 */
export interface ICastSubscription extends IRuntimeSubscription {
    /**
     * Send analytics summary with projection results to Chromecast review.
     * Called by browser when workout completes to show focused review.
     */
    sendAnalyticsSummary(
        projections: Array<{ name: string; value: number; unit: string; metricType?: string }>,
        totalDurationMs: number,
        completedSegments: number,
    ): void;
}

/**
 * Type guard to check if a subscription supports Chromecast analytics.
 */
export function isCastSubscription(s: IRuntimeSubscription): s is ICastSubscription {
    return 'sendAnalyticsSummary' in s;
}
