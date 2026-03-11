import { IMetric } from '@/core/models/Metric';
import { MemoryTag } from '@/runtime/memory/MemoryLocation';

// ============================================================================
// Serialized Block — lightweight representation of an IRuntimeBlock
// ============================================================================

/**
 * Serialized behavior descriptor — name-only snapshot of an IRuntimeBehavior.
 * Used on the receiver for debug inspection (Behaviors tab in BlockDebugDialog).
 */
export interface SerializedBehavior {
    /** Runtime class name of the behavior (e.g. 'CountdownTimerBehavior') */
    name: string;
}

/**
 * Serialized timer span (start/end in epoch ms).
 * The receiver interpolates elapsed time locally from these spans.
 */
export interface SerializedTimeSpan {
    started: number;
    ended?: number;
}

/**
 * Serialized timer state extracted from a block's timer memory.
 */
export interface SerializedTimer {
    label?: string;
    format: string;
    durationMs?: number;
    direction: 'up' | 'down';
    spans: SerializedTimeSpan[];
    isRunning: boolean;
    /** Timer role — 'primary' marks a pinned timer (drives usePrimaryTimer on the receiver). */
    role?: 'primary' | 'secondary' | 'auto';
}

/**
 * A JSON-serializable representation of an IRuntimeBlock.
 *
 * Contains only what the receiver workbench needs to render:
 * - Identity (key, blockType, label)
 * - Display state (metrics rows, timer, completion)
 * - All metric visibility tiers (display, promote, result, private)
 * - Behavior metadata for debug inspection
 * - No methods, no references to runtime internals
 */
export interface SerializedBlock {
    key: string;
    blockType: string;
    label: string;
    sourceIds: number[];
    isComplete: boolean;
    completionReason?: string;

    /** Fragment rows from getMetricMemoryByVisibility('display') */
    displayFragments: IMetric[][];

    /**
     * Fragment rows from getMetricMemoryByVisibility('promote').
     * Inherited by child blocks during JIT compilation.
     * Grouped by memory location (one array per location).
     */
    promoteFragments?: IMetric[][];

    /**
     * Fragment rows from getMetricMemoryByVisibility('result').
     * Block output metric collected on unmount/completion.
     */
    resultFragments?: IMetric[][];

    /**
     * Private metrics locations, keyed by memory tag.
     * Groups multiple locations per tag: Record<tag, IMetric[][]>
     * (e.g. metric:label → [[LabelMetric]], metric:tracked → [[...], [...]])
     */
    privateFragments?: Record<MemoryTag, IMetric[][]>;

    /** Timer state (if the block has a timer memory location) */
    timer: SerializedTimer | null;

    /**
     * "Up Next" preview metrics from the block's metrics:next memory.
     * Used by useNextPreview() on the receiver to render the Up Next panel.
     * Empty array when no next-preview is available.
     * Optional for backwards compatibility with test fixtures created before this field.
     */
    nextFragments?: IMetric[];

    /**
     * Behavior metadata — name-only descriptors for each attached behavior.
     * Used by BlockDebugDialog's Behaviors tab on the receiver.
     * Optional for backwards compatibility.
     */
    behaviorsMetadata?: SerializedBehavior[];
}

// ============================================================================
// RPC Messages — typed wire protocol over the DataChannel
// ============================================================================

export interface RpcStackUpdate {
    type: 'rpc-stack-update';
    /** 'push' | 'pop' | 'clear' | 'initial' */
    snapshotType: 'push' | 'pop' | 'clear' | 'initial';
    /** All blocks on the stack (bottom-to-top order) */
    blocks: SerializedBlock[];
    /** The block that was pushed/popped (undefined for clear/initial) */
    affectedBlockKey?: string;
    /** Stack depth after the event */
    depth: number;
    /** Clock time as epoch ms */
    clockTime: number;
}

export interface RpcOutputStatement {
    type: 'rpc-output';
    outputType: string;
    sourceBlockKey: string;
    stackLevel: number;
    metrics: IMetric[];
    completionReason?: string;
    timeSpan: { started: number; ended?: number };
    /** Pre-computed elapsed duration in ms (ended - started, or 0 if still running). */
    elapsed?: number;
}

export interface RpcEvent {
    type: 'rpc-event';
    name: string;
    timestamp: number;
    data?: unknown;
}

export interface RpcDispose {
    type: 'rpc-dispose';
}

/**
 * Workbench-level display mode update.
 * Sent by the browser when the workbench state changes outside of a live runtime
 * (e.g., a note is loaded in preview, or results are shown in review).
 */
export interface RpcWorkbenchUpdate {
    type: 'rpc-workbench-update';
    /** Current workbench display mode */
    mode: 'idle' | 'preview' | 'active' | 'review';
    /** Populated in 'preview' mode — info about the loaded document */
    previewData?: {
        /** Title of the selected WOD block (or document title) */
        title: string;
        /** Workout blocks available in the document */
        blocks: Array<{ id: string; title: string; statementCount: number }>;
    };
    /** Populated in 'review' mode — summary of completed workout */
    reviewData?: {
        /** Total wall-clock duration in ms */
        totalDurationMs: number;
        /** Number of completed segments */
        completedSegments: number;
        /** Key-value summary rows (e.g. "Total Time" → "12:34") */
        rows: Array<{ label: string; value: string }>;
    };
}

export interface RpcTrackerUpdate {
    type: 'rpc-tracker-update';
    update: {
        type: 'metric' | 'round';
        blockId: string;
        key?: string;
        value?: any;
        unit?: string;
        current?: number;
        total?: number;
        timestamp: number;
    };
}

/**
 * Clock synchronization request sent by browser on connection.
 * Used to calculate clock offset between sender and receiver.
 */
export interface RpcClockSyncRequest {
    type: 'rpc-clock-sync-request';
    /** Browser's timestamp when this request was sent */
    timestamp: number;
}

/**
 * Clock synchronization response from receiver.
 * Receiver includes its own timestamp and echoes back the request timestamp.
 * Browser uses this to calculate RTT and clock offset.
 */
export interface RpcClockSyncResponse {
    type: 'rpc-clock-sync-response';
    /** Original request timestamp from browser (for RTT calculation) */
    requestTimestamp: number;
    /** Receiver's timestamp when this response was sent */
    receiverTimestamp: number;
}

/**
 * Clock sync result sent by browser back to receiver.
 * Contains the calculated clock offset (receiver's clock minus sender's clock).
 * Receiver uses this to adjust elapsed time calculations.
 */
export interface RpcClockSyncResult {
    type: 'rpc-clock-sync-result';
    /** Clock offset in milliseconds (positive = receiver is ahead, negative = receiver is behind) */
    offsetMs: number;
    /** Round-trip time in milliseconds (for debugging/reliability) */
    rttMs: number;
}

/**
 * Individual projection result from analytics projection engine.
 */
export interface RpcProjectionResult {
    /** Human-readable name (e.g., "Total Volume", "Average Power") */
    name: string;
    /** Calculated value */
    value: number;
    /** Unit of measurement (e.g., "kg", "watts", "calories") */
    unit: string;
    /** Associated metric type for UI categorization (optional) */
    metricType?: string;
    /** Icon for display (Lucide icon name) */
    icon?: string;
    /** Color for visualization (hex code) */
    color?: string;
}

/**
 * Analytics summary with projection results.
 * Sent by browser to replace the simple row-based review data
 * with a focused, categorized view of workout analytics.
 */
export interface RpcAnalyticsSummary {
    type: 'rpc-analytics-summary';
    /** Total workout duration in ms */
    totalDurationMs: number;
    /** Number of completed segments */
    completedSegments: number;
    /** Projection results from analytics engines */
    projections: RpcProjectionResult[];
}

/**
 * Union of all RPC message types sent over the DataChannel.
 */
export type RpcMessage =
    | RpcStackUpdate
    | RpcOutputStatement
    | RpcTrackerUpdate
    | RpcEvent
    | RpcDispose
    | RpcWorkbenchUpdate
    | RpcClockSyncRequest
    | RpcClockSyncResponse
    | RpcClockSyncResult
    | RpcAnalyticsSummary;
