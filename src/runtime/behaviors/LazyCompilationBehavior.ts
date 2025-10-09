/**
 * LazyCompilationBehavior
 * 
 * Compiles child statements on-demand using JIT compiler, one child per next() call.
 * Implements the IRuntimeBehavior interface for composable runtime block functionality.
 */

import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { PushBlockAction } from '../PushBlockAction';
import { ChildAdvancementBehavior } from './ChildAdvancementBehavior';
import { NextBlockLogger } from '../NextBlockLogger';

export class LazyCompilationBehavior implements IRuntimeBehavior {
    private compilationCache?: Map<number, IRuntimeBlock>;
    private readonly enableCaching: boolean;

    /**
     * Constructs a new LazyCompilationBehavior.
     * @param enableCaching Whether to cache compiled blocks (default: false for memory efficiency)
     */
    constructor(enableCaching: boolean = false) {
        this.enableCaching = enableCaching;
        if (enableCaching) {
            this.compilationCache = new Map();
        }
    }

    /**
     * Called when block advances to next execution step.
     * Compiles the current child statement and returns NextAction with compiled block.
     */
    onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // Get ChildAdvancementBehavior to find current child
        const childBehavior = this.getChildBehavior(block);
        if (!childBehavior) {
            return [];
        }

        // Get current child before advancement happens
        const currentChild = childBehavior.getCurrentChild();
        if (!currentChild) {
            return [];
        }

        const currentIndex = childBehavior.getCurrentChildIndex();

        // Check cache if enabled
        if (this.enableCaching && this.compilationCache) {
            const cached = this.compilationCache.get(currentIndex);
            if (cached) {
                return [new PushBlockAction(cached)];
            }
        }

        // Compile the child using JIT compiler
        try {
            // Log compilation start
            const statementId = typeof currentChild.id === 'number' 
                ? currentChild.id 
                : (Array.isArray(currentChild.id) ? currentChild.id : String(currentChild.id));
            
            NextBlockLogger.logCompilationStart(currentIndex, statementId);

            const compiledBlock = runtime.jit.compile([currentChild], runtime);
            
            if (!compiledBlock) {
                NextBlockLogger.logCompilationFailure(
                    currentIndex,
                    new Error('JIT compiler returned undefined')
                );
                return [];
            }

            // Log successful compilation
            NextBlockLogger.logCompilationSuccess(
                currentIndex,
                compiledBlock.key.toString()
            );

            // Cache if enabled
            if (this.enableCaching && this.compilationCache) {
                this.compilationCache.set(currentIndex, compiledBlock);
            }

            // Return PushBlockAction to push the compiled child onto the stack
            return [new PushBlockAction(compiledBlock)];
        } catch (error) {
            NextBlockLogger.logCompilationFailure(currentIndex, error as Error);
            // TODO: Create ErrorRuntimeBlock instead of returning empty
            return [];
        }
    }

    /**
     * Clears the compilation cache if enabled.
     */
    clearCache(): void {
        if (this.compilationCache) {
            this.compilationCache.clear();
        }
    }

    /**
     * Called when block is being disposed.
     * Cleans up compilation cache.
     */
    onDispose?(runtime: IScriptRuntime, block: IRuntimeBlock): void {
        this.clearCache();
    }

    /**
     * Helper to get ChildAdvancementBehavior from the block.
     * @param block Runtime block to search for behavior
     * @returns ChildAdvancementBehavior or undefined
     */
    private getChildBehavior(block: any): ChildAdvancementBehavior | undefined {
        // Check if block has getBehavior method
        if (typeof block.getBehavior === 'function') {
            return block.getBehavior(ChildAdvancementBehavior);
        }
        
        // Fallback: try to find in behaviors array
        if (Array.isArray(block.behaviors)) {
            return block.behaviors.find(b => b instanceof ChildAdvancementBehavior) as ChildAdvancementBehavior;
        }

        return undefined;
    }
}
