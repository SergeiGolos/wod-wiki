import type { ICodeFragment } from './CodeFragment';

/**
 * CollectionSpan represents a span of time with associated fragment data.
 * Used by UI components to display workout segment information.
 */
export interface CollectionSpan {
    /** Array of fragment groups for display */
    fragments?: ICodeFragment[][];
    
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
 * Re-exported from runtime for convenience.
 */
export { TimeSpan } from '../../runtime/models/TimeSpan';
