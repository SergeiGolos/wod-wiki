import { IRuntimeBlock } from './IRuntimeBlock';
import { TestableBlockConfig } from './testing/TestableBlock';

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
     * - NextBlockLogger is automatically enabled
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
     * Enable console logging via NextBlockLogger.
     * Automatically set to true when debugMode is true.
     */
    enableLogging?: boolean;
    
    /**
     * Maximum log history size for NextBlockLogger.
     * Default: 50
     */
    maxLogHistory?: number;
    
    /**
     * Custom log handler for debug events.
     * If provided, called in addition to console logging.
     */
    onDebugLog?: (event: DebugLogEvent) => void;
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
    maxLogHistory: 50,
};
