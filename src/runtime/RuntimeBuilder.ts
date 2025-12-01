import { ScriptRuntime } from './ScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { WodScript } from '../parser/WodScript';
import { IRuntimeOptions, DEFAULT_RUNTIME_OPTIONS } from './IRuntimeOptions';
import { TestableBlockConfig } from './testing/TestableBlock';
import { NextBlockLogger } from './NextBlockLogger';

/**
 * RuntimeBuilder provides a fluent API for constructing ScriptRuntime instances
 * with configurable options including debug mode, logging, and custom block wrappers.
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const runtime = new RuntimeBuilder(script, compiler).build();
 * 
 * // With debug mode
 * const debugRuntime = new RuntimeBuilder(script, compiler)
 *   .withDebugMode(true)
 *   .build();
 * 
 * // With custom configuration
 * const customRuntime = new RuntimeBuilder(script, compiler)
 *   .withDebugMode(true)
 *   .withLogging(true)
 *   .withMaxLogHistory(100)
 *   .withDefaultTestableConfig({ mountMode: 'spy', nextMode: 'spy' })
 *   .withDebugLogHandler((event) => {
 *     console.log('[Debug]', event);
 *   })
 *   .build();
 * ```
 */
export class RuntimeBuilder {
    private options: IRuntimeOptions = { ...DEFAULT_RUNTIME_OPTIONS };
    
    constructor(
        private readonly script: WodScript,
        private readonly compiler: JitCompiler
    ) {}
    
    /**
     * Enable or disable debug mode.
     * When enabled:
     * - All blocks are wrapped with TestableBlock for inspection
     * - NextBlockLogger is automatically enabled
     * - Lifecycle events are tracked and can be inspected
     */
    withDebugMode(enabled: boolean): this {
        this.options.debugMode = enabled;
        if (enabled) {
            // Auto-enable logging in debug mode
            this.options.enableLogging = true;
        }
        return this;
    }
    
    /**
     * Enable or disable logging via NextBlockLogger.
     * Can be enabled independently of debug mode for lighter-weight logging.
     */
    withLogging(enabled: boolean): this {
        this.options.enableLogging = enabled;
        return this;
    }
    
    /**
     * Set the maximum log history size for NextBlockLogger.
     * Default is 50 entries.
     */
    withMaxLogHistory(size: number): this {
        this.options.maxLogHistory = size;
        return this;
    }
    
    /**
     * Set default TestableBlock configuration.
     * Applied to all blocks wrapped in debug mode.
     */
    withDefaultTestableConfig(config: Partial<TestableBlockConfig>): this {
        this.options.defaultTestableConfig = config;
        return this;
    }
    
    /**
     * Set a custom block wrapper factory.
     * Use this to customize how blocks are wrapped in debug mode.
     */
    withBlockWrapperFactory(factory: IRuntimeOptions['blockWrapperFactory']): this {
        this.options.blockWrapperFactory = factory;
        return this;
    }
    
    /**
     * Set a custom debug log handler.
     * Called for every debug event in addition to console logging.
     */
    withDebugLogHandler(handler: IRuntimeOptions['onDebugLog']): this {
        this.options.onDebugLog = handler;
        return this;
    }
    
    /**
     * Get the current options (for inspection/debugging)
     */
    getOptions(): Readonly<IRuntimeOptions> {
        return { ...this.options };
    }
    
    /**
     * Build the ScriptRuntime with the configured options.
     */
    build(): ScriptRuntime {
        // Configure NextBlockLogger before creating runtime
        if (this.options.enableLogging || this.options.debugMode) {
            NextBlockLogger.setEnabled(true);
            if (this.options.maxLogHistory) {
                // Set max history size if NextBlockLogger supports it
                (NextBlockLogger as any).maxHistorySize = this.options.maxLogHistory;
            }
        }
        
        // Create runtime with options
        return new ScriptRuntime(this.script, this.compiler, this.options);
    }
    
    /**
     * Build the runtime and also return the options used.
     * Useful for debugging the builder configuration.
     */
    buildWithOptions(): { runtime: ScriptRuntime; options: IRuntimeOptions } {
        const runtime = this.build();
        return { runtime, options: { ...this.options } };
    }
}

/**
 * Factory function to create a RuntimeBuilder.
 * Convenience function for creating builders.
 * 
 * @example
 * ```typescript
 * const runtime = createRuntimeBuilder(script, compiler)
 *   .withDebugMode(true)
 *   .build();
 * ```
 */
export function createRuntimeBuilder(script: WodScript, compiler: JitCompiler): RuntimeBuilder {
    return new RuntimeBuilder(script, compiler);
}
