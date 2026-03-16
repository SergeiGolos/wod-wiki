import { IRuntimeBlock } from './IRuntimeBlock';
import { TestableBlockConfig } from '../../testing/testable/TestableBlock';

/**
 * Factory function type for wrapping blocks in debug mode.
 * Receives the original block and returns a wrapped version.
 */
export type BlockWrapperFactory = (block: IRuntimeBlock, config?: TestableBlockConfig) => IRuntimeBlock;

/**
 * Configuration options for ScriptRuntime initialization.
 * These options control debugging, logging, and testing capabilities.
 */
export interface IRuntimeOptions {
    /**
     * Enable debug mode for the runtime.
     * When true:
     * - All blocks pushed to the stack are automatically wrapped with TestableBlock
     * - Additional lifecycle events are logged
     */
    debugMode?: boolean;

    /**
     * Custom factory for wrapping blocks when debugMode is true.
     * If not provided, uses the default TestableBlock wrapper with spy mode.
     */
    blockWrapperFactory?: BlockWrapperFactory;

    /**
     * Default configuration for TestableBlock wrappers.
     * Applied to all blocks wrapped in debug mode unless overridden.
     */
    defaultTestableConfig?: Partial<TestableBlockConfig>;

    /**
     * Enable console logging for runtime debug output.
     * Automatically set to true when debugMode is true.
     */
    enableLogging?: boolean;

    /**
     * Custom log handler for debug events.
     * If provided, called in addition to console logging.
     */
    onDebugLog?: (event: DebugLogEvent) => void;

    /**
     * Maximum depth for nested actions within a single execution turn.
     * Defaults to 20 if not specified.
     */
    maxActionDepth?: number;

    /**
     * Optional frontmatter properties parsed from the document.
     * Used for things like attaching a youtube playlist to a workout session.
     */
    frontmatter?: Record<string, string>;
}

/**
 * Types of debug log events
 */
export type DebugLogEventType =
    | 'block-wrapped'
    | 'block-mount'
    | 'block-next'
    | 'block-unmount'
    | 'block-dispose'
    | 'stack-push'
    | 'stack-pop'
    | 'memory-allocate'
    | 'memory-release'
    | 'event-handled';

/**
 * Debug log event structure
 */
export interface DebugLogEvent {
    type: DebugLogEventType;
    timestamp: number;
    blockKey?: string;
    blockType?: string;
    details?: Record<string, any>;
}

/**
 * Default runtime options
 */
export const DEFAULT_RUNTIME_OPTIONS: Required<Omit<IRuntimeOptions, 'blockWrapperFactory' | 'onDebugLog' | 'defaultTestableConfig'>> = {
    debugMode: false,
    enableLogging: false,
    maxActionDepth: 20,
};

export interface RuntimeStackTracker {
    getActiveSpanId?: (blockKey: string) => string | null | undefined;
    startSpan?: (block: IRuntimeBlock, parentSpanId: string | null) => void;
    endSpan?: (blockKey: string) => void;

    /**
     * Record a metric update for a specific block.
     * This is used for real-time tracking of exercise progress (e.g. reps, distance).
     */
    recordMetric?: (blockId: string, metricKey: string, value: any, unit?: string) => void;

    /**
     * Record a round update for a specific block.
     */
    recordRound?: (blockId: string, currentRound: number, totalRounds?: number) => void;

    /**
     * Subscribe to tracker updates.
     */
    onUpdate?: (callback: (update: TrackerUpdate) => void) => () => void;

    /**
     * Get a snapshot of the current tracker state.
     */
    getSnapshot?: () => TrackerSnapshot;
}

/**
 * A snapshot of the entire workout tracker state.
 */
export interface TrackerSnapshot {
    metrics: Record<string, Record<string, { value: any; unit?: string }>>;
    rounds: Record<string, { current: number; total?: number }>;
}

/**
 * Represents a real-time update from the workout tracker.
 */
export type TrackerUpdate = 
    | { type: 'metric'; blockId: string; key: string; value: any; unit?: string; timestamp: number }
    | { type: 'round'; blockId: string; current: number; total?: number; timestamp: number }
    | { type: 'snapshot'; snapshot: TrackerSnapshot; timestamp: number };

export interface RuntimeStackWrapper {
    wrap?: (block: IRuntimeBlock, parent?: IRuntimeBlock) => IRuntimeBlock;
    cleanup?: (block: IRuntimeBlock) => void;
}

export interface RuntimeStackLogger {
    debug?: (message: string, details?: Record<string, unknown>) => void;
    error?: (message: string, error: unknown, details?: Record<string, unknown>) => void;
}

export interface RuntimeStackHooks {
    onBeforePush?: (block: IRuntimeBlock, parent?: IRuntimeBlock) => void;
    onAfterPush?: (block: IRuntimeBlock, parent?: IRuntimeBlock) => void;
    onBeforePop?: (block: IRuntimeBlock | undefined) => void;
    onAfterPop?: (block: IRuntimeBlock | undefined) => void;
    unregisterByOwner?: (ownerKey: string) => void;
}

export interface RuntimeStackOptions extends IRuntimeOptions {
    tracker?: RuntimeStackTracker;
    wrapper?: RuntimeStackWrapper;
    logger?: RuntimeStackLogger;
    hooks?: RuntimeStackHooks;
}
