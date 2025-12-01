import { IRuntimeBlock } from './IRuntimeBlock';
import { IScriptRuntime } from './IScriptRuntime';
import { RuntimeStack } from './RuntimeStack';
import { ExecutionLogger } from './ExecutionLogger';
import { TestableBlock, TestableBlockConfig } from './testing/TestableBlock';
import { BlockWrapperFactory, DebugLogEvent, IRuntimeOptions } from './IRuntimeOptions';
import { NextBlockLogger } from './NextBlockLogger';

/**
 * Default block wrapper factory that uses TestableBlock in spy mode.
 */
const defaultBlockWrapperFactory: BlockWrapperFactory = (
    block: IRuntimeBlock,
    config?: TestableBlockConfig
): IRuntimeBlock => {
    return new TestableBlock(block, {
        testId: config?.testId ?? `debug-${block.key.toString()}`,
        labelOverride: config?.labelOverride,
        mountMode: config?.mountMode ?? 'spy',
        nextMode: config?.nextMode ?? 'spy',
        unmountMode: config?.unmountMode ?? 'spy',
        disposeMode: config?.disposeMode ?? 'spy',
        mountOverride: config?.mountOverride,
        nextOverride: config?.nextOverride,
        unmountOverride: config?.unmountOverride,
        disposeOverride: config?.disposeOverride,
    });
};

/**
 * DebugRuntimeStack extends MemoryAwareRuntimeStack to provide:
 * 1. Automatic TestableBlock wrapping when debug mode is active
 * 2. Enhanced logging via NextBlockLogger
 * 3. Custom block wrapper factory support
 * 
 * When debug mode is enabled:
 * - Every block pushed to the stack is wrapped with TestableBlock
 * - All lifecycle methods (mount, next, unmount, dispose) are intercepted
 * - Call history is recorded for inspection
 * - Enhanced logging is enabled
 * 
 * @example
 * ```typescript
 * const runtime = new RuntimeBuilder(script)
 *   .withDebugMode(true)
 *   .build();
 * 
 * // All blocks are now automatically wrapped
 * runtime.stack.push(myBlock);
 * 
 * // Get the wrapped block to inspect calls
 * const wrapped = runtime.stack.current as TestableBlock;
 * console.log(wrapped.calls);
 * ```
 */
export class DebugRuntimeStack extends RuntimeStack {
    private readonly _wrappedBlocks: Map<string, TestableBlock> = new Map();
    private readonly _wrapperFactory: BlockWrapperFactory;
    private readonly _defaultConfig: Partial<TestableBlockConfig>;
    private readonly _onDebugLog?: (event: DebugLogEvent) => void;
    
    constructor(
        private readonly runtime: IScriptRuntime,
        private readonly logger: ExecutionLogger,
        private readonly options: IRuntimeOptions = {}
    ) {
        super();
        this._wrapperFactory = options.blockWrapperFactory ?? defaultBlockWrapperFactory;
        this._defaultConfig = options.defaultTestableConfig ?? {};
        this._onDebugLog = options.onDebugLog;
        
        // Enable NextBlockLogger if debug mode is active
        if (options.debugMode || options.enableLogging) {
            NextBlockLogger.setEnabled(true);
        }
    }
    
    /**
     * Whether debug mode is currently active
     */
    get isDebugMode(): boolean {
        return this.options.debugMode ?? false;
    }
    
    /**
     * Get all wrapped TestableBlock instances for inspection
     */
    get wrappedBlocks(): ReadonlyMap<string, TestableBlock> {
        return this._wrappedBlocks;
    }
    
    /**
     * Get a specific wrapped block by its key
     */
    getWrappedBlock(blockKey: string): TestableBlock | undefined {
        return this._wrappedBlocks.get(blockKey);
    }
    
    /**
     * Get all call records from all wrapped blocks
     */
    getAllCalls(): Array<{ blockKey: string; calls: ReadonlyArray<any> }> {
        const result: Array<{ blockKey: string; calls: ReadonlyArray<any> }> = [];
        for (const [key, block] of this._wrappedBlocks) {
            result.push({ blockKey: key, calls: block.calls });
        }
        return result;
    }
    
    /**
     * Clear all recorded calls from wrapped blocks
     */
    clearAllCalls(): void {
        for (const block of this._wrappedBlocks.values()) {
            block.clearCalls();
        }
    }
    
    /**
     * Push a block onto the stack.
     * In debug mode, the block is automatically wrapped with TestableBlock.
     */
    override push(block: IRuntimeBlock): void {
        const parentBlock = this.current;
        let parentId: string | null = null;
        
        if (parentBlock) {
            parentId = this.logger.getActiveRecordId(parentBlock.key.toString());
        }
        
        // Wrap block if debug mode is active
        let blockToPush = block;
        if (this.isDebugMode) {
            const originalKey = block.key.toString();
            
            // Don't double-wrap TestableBlocks
            if (!(block instanceof TestableBlock)) {
                const config: TestableBlockConfig = {
                    ...this._defaultConfig,
                    testId: this._defaultConfig.testId ?? `debug-${originalKey}`,
                };
                blockToPush = this._wrapperFactory(block, config);
                
                // Store reference to wrapped block
                this._wrappedBlocks.set(originalKey, blockToPush as TestableBlock);
                
                // Log wrapping event
                this._logDebugEvent({
                    type: 'block-wrapped',
                    timestamp: Date.now(),
                    blockKey: originalKey,
                    blockType: block.blockType,
                    details: {
                        wrapperTestId: (blockToPush as unknown as TestableBlock).testId,
                        config,
                    }
                });
                
                NextBlockLogger.logPushBlockStart(originalKey, this.blocks.length);
            }
        }
        
        // Determine initial metrics
        const initialMetrics = block.compiledMetrics ? [block.compiledMetrics] : [];
        
        // Fallback for legacy blocks without compiledMetrics
        if (initialMetrics.length === 0 && block.blockType === 'Effort' && block.label) {
            const label = block.label;
            const match = label.match(/^(\d+)\s+(.+)$/);
            if (match) {
                const reps = parseInt(match[1], 10);
                const exerciseName = match[2].trim();
                if (!isNaN(reps)) {
                    initialMetrics.push({
                        exerciseId: exerciseName,
                        values: [{ type: 'repetitions', value: reps, unit: 'reps' }],
                        timeSpans: []
                    });
                }
            } else {
                initialMetrics.push({
                    exerciseId: label,
                    values: [],
                    timeSpans: []
                });
            }
        }
        
        // Start logging execution
        this.logger.startExecution(
            block.key.toString(),
            block.blockType || 'unknown',
            block.label || block.key.toString(),
            parentId,
            initialMetrics
        );
        
        // Provide runtime context if the block expects it (duck-typing)
        if (typeof (blockToPush as any).setRuntime === 'function') {
            (blockToPush as any).setRuntime(this.runtime);
        }
        
        // Perform standard push
        super.push(blockToPush);
        
        // Log push completion
        this._logDebugEvent({
            type: 'stack-push',
            timestamp: Date.now(),
            blockKey: block.key.toString(),
            blockType: block.blockType,
            details: {
                stackDepth: this.blocks.length,
                isWrapped: this.isDebugMode && !(block instanceof TestableBlock),
            }
        });
    }
    
    /**
     * Pop a block from the stack.
     * Note: Does NOT dispose the block - consumer must call dispose().
     */
    override pop(): IRuntimeBlock | undefined {
        const poppedBlock = super.pop();
        
        if (poppedBlock) {
            const blockKey = poppedBlock.key.toString();
            
            // Complete execution log
            this.logger.completeExecution(blockKey);
            
            // Log pop event
            this._logDebugEvent({
                type: 'stack-pop',
                timestamp: Date.now(),
                blockKey,
                blockType: poppedBlock.blockType,
                details: {
                    stackDepth: this.blocks.length,
                    wasWrapped: this._wrappedBlocks.has(blockKey.replace('debug-', '')),
                }
            });
            
            // Note: Don't remove from _wrappedBlocks yet - consumer may still need to inspect
        }
        
        return poppedBlock;
    }
    
    /**
     * Clean up wrapped block reference after disposal
     */
    cleanupWrappedBlock(blockKey: string): void {
        // Try both original key and debug-prefixed key
        this._wrappedBlocks.delete(blockKey);
        this._wrappedBlocks.delete(blockKey.replace('debug-', ''));
    }
    
    /**
     * Internal logging helper
     */
    private _logDebugEvent(event: DebugLogEvent): void {
        // Call custom handler if provided
        if (this._onDebugLog) {
            this._onDebugLog(event);
        }
        
        // Also log to NextBlockLogger
        if (NextBlockLogger['enabled']) {
            const prefix = `🔍 DEBUG | ${event.type}`;
            console.log(prefix, {
                blockKey: event.blockKey,
                blockType: event.blockType,
                ...event.details,
            });
        }
    }
}
