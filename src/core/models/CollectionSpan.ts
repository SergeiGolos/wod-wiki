import type { MetricContainer } from './MetricContainer';

/**
 * CollectionSpan represents a span of time with associated metrics data.
 * Used by UI components to display workout segment information.
 */
export interface CollectionSpan {
    /** Array of metrics groups for display */
    metrics?: MetricContainer[];
    
    /** Associated block key */
    blockKey?: string;
    
    /** Template for label rendering */
    template?: string;
    
    /** Duration in milliseconds */
    durationMs?: number;
    
    /** Exercise or action name */
    label?: string;
}

/**
 * TimeSpan represents a discrete period of time.
 */
export { TimeSpan } from './TimeSpan';
