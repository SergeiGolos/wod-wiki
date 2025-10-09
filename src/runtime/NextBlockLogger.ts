/**
 * NextBlockLogger
 * 
 * Focused logging utility for validating and debugging the "next block" advancement flow.
 * Provides structured logs with validation data for each stage of the process.
 */

export interface NextBlockLogData {
    stage: string;
    blockKey?: string;
    childIndex?: number;
    childTotal?: number;
    stackDepth?: number;
    actionCount?: number;
    statementId?: string | number | number[];
    compiledBlockKey?: string;
    isComplete?: boolean;
    error?: Error;
}

export class NextBlockLogger {
    private static enabled = true;
    private static logHistory: NextBlockLogData[] = [];
    private static maxHistorySize = 50;

    /**
     * Enables or disables next block logging.
     */
    static setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Clears the log history.
     */
    static clearHistory(): void {
        this.logHistory = [];
    }

    /**
     * Gets the complete log history for analysis.
     */
    static getHistory(): ReadonlyArray<NextBlockLogData> {
        return [...this.logHistory];
    }

    /**
     * Logs the NextAction starting execution.
     */
    static logNextActionStart(blockKey: string, stackDepth: number): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'next-action-start',
            blockKey,
            stackDepth,
        };

        this.addToHistory(data);
        console.log(`🎯 NEXT-BLOCK | Action Start`, {
            block: blockKey,
            depth: stackDepth,
        });
    }

    /**
     * Logs the NextAction completion.
     */
    static logNextActionComplete(stackDepth: number, actionCount: number): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'next-action-complete',
            stackDepth,
            actionCount,
        };

        this.addToHistory(data);
        console.log(`✅ NEXT-BLOCK | Action Complete`, {
            newDepth: stackDepth,
            actionsExecuted: actionCount,
        });
    }

    /**
     * Logs child advancement behavior state.
     */
    static logChildAdvancement(childIndex: number, childTotal: number, isComplete: boolean): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'child-advancement',
            childIndex,
            childTotal,
            isComplete,
        };

        this.addToHistory(data);
        console.log(`📍 NEXT-BLOCK | Child Advancement`, {
            index: childIndex,
            total: childTotal,
            complete: isComplete,
            progress: `${childIndex}/${childTotal}`,
        });
    }

    /**
     * Logs lazy compilation attempt.
     */
    static logCompilationStart(childIndex: number, statementId: string | number | number[]): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'compilation-start',
            childIndex,
            statementId,
        };

        this.addToHistory(data);
        console.log(`🔨 NEXT-BLOCK | Compilation Start`, {
            childIndex,
            statementId: Array.isArray(statementId) ? statementId.join(',') : statementId,
        });
    }

    /**
     * Logs successful compilation.
     */
    static logCompilationSuccess(childIndex: number, compiledBlockKey: string): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'compilation-success',
            childIndex,
            compiledBlockKey,
        };

        this.addToHistory(data);
        console.log(`✅ NEXT-BLOCK | Compilation Success`, {
            childIndex,
            newBlock: compiledBlockKey,
        });
    }

    /**
     * Logs compilation failure.
     */
    static logCompilationFailure(childIndex: number, error: Error): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'compilation-failure',
            childIndex,
            error,
        };

        this.addToHistory(data);
        console.error(`❌ NEXT-BLOCK | Compilation Failed`, {
            childIndex,
            error: error.message,
        });
    }

    /**
     * Logs push block action execution.
     */
    static logPushBlockStart(blockKey: string, stackDepthBefore: number): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'push-block-start',
            blockKey,
            stackDepth: stackDepthBefore,
        };

        this.addToHistory(data);
        console.log(`⬆️  NEXT-BLOCK | Push Start`, {
            block: blockKey,
            depthBefore: stackDepthBefore,
        });
    }

    /**
     * Logs successful push block action.
     */
    static logPushBlockComplete(blockKey: string, stackDepthAfter: number, initActionCount: number): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'push-block-complete',
            blockKey,
            stackDepth: stackDepthAfter,
            actionCount: initActionCount,
        };

        this.addToHistory(data);
        console.log(`✅ NEXT-BLOCK | Push Complete`, {
            block: blockKey,
            depthAfter: stackDepthAfter,
            initActions: initActionCount,
        });
    }

    /**
     * Logs stack modification.
     */
    static logStackPush(blockKey: string, depthBefore: number, depthAfter: number): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'stack-push',
            blockKey,
            stackDepth: depthAfter,
        };

        this.addToHistory(data);
        console.log(`📚 NEXT-BLOCK | Stack Modified`, {
            block: blockKey,
            depthChange: `${depthBefore} → ${depthAfter}`,
        });
    }

    /**
     * Logs behavior orchestration in RuntimeBlock.next().
     */
    static logBehaviorOrchestration(blockKey: string, behaviorCount: number): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'behavior-orchestration',
            blockKey,
            actionCount: behaviorCount,
        };

        this.addToHistory(data);
        console.log(`🔄 NEXT-BLOCK | Behavior Orchestration`, {
            block: blockKey,
            behaviorCount,
        });
    }

    /**
     * Logs error conditions.
     */
    static logError(stage: string, error: Error, context?: Partial<NextBlockLogData>): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: `error-${stage}`,
            error,
            ...context,
        };

        this.addToHistory(data);
        console.error(`❌ NEXT-BLOCK | Error in ${stage}`, {
            error: error.message,
            context,
        });
    }

    /**
     * Logs validation failure.
     */
    static logValidationFailure(reason: string, context?: Record<string, any>): void {
        if (!this.enabled) return;

        const data: NextBlockLogData = {
            stage: 'validation-failure',
            ...context,
        };

        this.addToHistory(data);
        console.error(`⚠️  NEXT-BLOCK | Validation Failed: ${reason}`, context);
    }

    /**
     * Gets a summary of the current next block flow.
     */
    static getSummary(): string {
        const recent = this.logHistory.slice(-10);
        const stages = recent.map(log => log.stage);
        return `Recent flow: ${stages.join(' → ')}`;
    }

    /**
     * Adds log entry to history with size management.
     */
    private static addToHistory(data: NextBlockLogData): void {
        this.logHistory.push(data);
        
        // Trim history if it exceeds max size
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory = this.logHistory.slice(-this.maxHistorySize);
        }
    }
}
