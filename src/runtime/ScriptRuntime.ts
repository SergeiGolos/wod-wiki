import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IEventHandler } from "./IEventHandler";
import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeMemory } from './RuntimeMemory';
import type { RuntimeError } from './actions/ErrorAction';
import { IMetricCollector, MetricCollector } from './MetricCollector';
import { ExecutionRecord } from './models/ExecutionRecord';
import { TypedMemoryReference } from './IMemoryReference';
import { RuntimeMetric, MetricValue } from './RuntimeMetric';

import { RuntimeClock } from './RuntimeClock';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {
    public readonly stack: RuntimeStack;
    public readonly jit: JitCompiler;
    public readonly memory: IRuntimeMemory;
    public readonly metrics: IMetricCollector;
    public readonly clock: RuntimeClock;
    public readonly errors: RuntimeError[] = [];
    private _lastUpdatedBlocks: Set<string> = new Set();
    
    constructor(public readonly script: WodScript, compiler: JitCompiler) {
        this.stack = new RuntimeStack();
        this.memory = new RuntimeMemory();
        this.metrics = new MetricCollector();
        this.clock = new RuntimeClock();
        this.jit = compiler;
        this._setupMemoryAwareStack();

        // Start the clock
        this.clock.start();
    }

    /**
     * Gets the currently active execution spans from memory.
     * Used by UI to display ongoing execution state.
     */
    public get activeSpans(): ReadonlyMap<string, ExecutionRecord> {
        const map = new Map<string, ExecutionRecord>();
        this.memory.search({ type: 'execution-record', visibility: 'public', id: null, ownerId: null })
            .forEach(ref => {
                const record = this.memory.get(ref as any) as ExecutionRecord;
                if (record && record.status === 'active') {
                    map.set(record.blockId, record);
                }
            });
        return map;
    }

    /**
     * Gets the execution history from memory.
     * Note: This returns a copy of the records.
     */
    public get executionLog(): ExecutionRecord[] {
        return this.memory.search({ type: 'execution-record', id: null, ownerId: null, visibility: null })
            .map(ref => this.memory.get(ref as any) as ExecutionRecord)
            .filter(r => r && r.status === 'completed');
    }

    /**
     * Enhanced stack management with constructor-based initialization and consumer-managed disposal.
     * Updated to support the new lifecycle pattern where:
     * - Initialization happens in block constructors (not during push)
     * - Cleanup happens via consumer-managed dispose() calls (not during pop)
     */
    private _setupMemoryAwareStack(): void {
        // Override stack operations for logging and runtime context setup only
        const originalPop = this.stack.pop.bind(this.stack);
        const originalPush = this.stack.push.bind(this.stack);

        this.stack.pop = () => {
            const poppedBlock = originalPop();

            if (poppedBlock) {
                const blockId = poppedBlock.key.toString();


                // Finalize execution span in memory
                const refs = this.memory.search({ type: 'execution-record', ownerId: blockId, id: null, visibility: null });
                if (refs.length > 0) {
                    // Use TypedMemoryReference to ensure type safety if possible, or cast
                    const ref = refs[0] as TypedMemoryReference<ExecutionRecord>;
                    const record = this.memory.get(ref);
                    
                    if (record) {
                        const updatedRecord: ExecutionRecord = {
                            ...record,
                            endTime: Date.now(),
                            status: 'completed'
                        };
                        
                        // Update memory (triggers subscribers)
                        this.memory.set(ref, updatedRecord);
                    }
                }
            }

            return poppedBlock; // Consumer responsibility to dispose
        };

        this.stack.push = (block) => {
            const blockId = block.key.toString();

            
            // Identify parent span
            const parentBlock = this.stack.current;
            let parentId: string | null = null;
            
            if (parentBlock) {
                const parentRefs = this.memory.search({ type: 'execution-record', ownerId: parentBlock.key.toString(), id: null, visibility: null });
                if (parentRefs.length > 0) {
                    const parentRecord = this.memory.get(parentRefs[0] as any) as ExecutionRecord;
                    if (parentRecord) {
                        parentId = parentRecord.id;
                    }
                }
            }

            // Create initial metrics from block information
            const initialMetrics: RuntimeMetric[] = [];
            
            // For effort blocks, extract exercise name from label (e.g., "10 Pushups" -> exerciseId: "Pushups", reps: 10)
            if (block.blockType === 'Effort' && block.label) {
                const label = block.label;
                // Parse label like "10 Pushups" or just "Pushups"
                const match = label.match(/^(\d+)\s+(.+)$/);
                if (match) {
                    const reps = parseInt(match[1], 10);
                    const exerciseName = match[2].trim();
                    const values: MetricValue[] = [];
                    if (!isNaN(reps)) {
                        values.push({ type: 'repetitions', value: reps, unit: 'reps' });
                    }
                    initialMetrics.push({
                        exerciseId: exerciseName,
                        values,
                        timeSpans: []
                    });
                } else {
                    // No reps, just exercise name
                    initialMetrics.push({
                        exerciseId: label,
                        values: [],
                        timeSpans: []
                    });
                }
            }

            // Create execution record
            const record: ExecutionRecord = {
                id: `${Date.now()}-${blockId}`, // Simple unique ID
                blockId: blockId,
                parentId: parentId,
                type: block.blockType || 'unknown',
                label: block.label || blockId,
                startTime: Date.now(),
                status: 'active',
                metrics: initialMetrics
            };

            // Store in memory
            this.memory.allocate<ExecutionRecord>('execution-record', blockId, record, 'public');
            
            // Optionally allow blocks that expose setRuntime to receive runtime context (duck-typing)
            if (typeof (block as any).setRuntime === 'function') {
                (block as any).setRuntime(this);
            }
            
            // Push block (no lifecycle method calls - constructor-based initialization)
            originalPush(block);
            
        };
    }

    handle(event: IEvent): void {
        const allActions: IRuntimeAction[] = [];
        const updatedBlocks = new Set<string>();

        // UNIFIED HANDLER PROCESSING: Get ALL handlers from memory (not just current block)
        const handlerRefs = this.memory.search({ type: 'handler', id: null, ownerId: null, visibility: null });
        const allHandlers = handlerRefs
            .map(ref => this.memory.get(ref as any))
            .filter(Boolean) as IEventHandler[];

        // Process ALL handlers in memory
        for (let i = 0; i < allHandlers.length; i++) {
            const handler = allHandlers[i];
            const actions = handler.handler(event, this);

            if (actions.length > 0) {
                allActions.push(...actions);
            }
            
            // Check for errors - if runtime has errors, abort further processing
            if (this.errors && this.errors.length > 0) {
                break;
            }
        }

        for (let i = 0; i < allActions.length; i++) {
            const action = allActions[i];
            action.do(this);
        }
        
        // Store updated blocks for consumers to query
        this._lastUpdatedBlocks = updatedBlocks;
    }
    
    /**
     * Gets the blocks that were updated during the last event processing.
     * This allows consumers to make decisions about what state needs to be updated in the UI.
     */
    public getLastUpdatedBlocks(): string[] {
        return Array.from(this._lastUpdatedBlocks);
    }

    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty.
     * Note: A fresh runtime starts with an empty stack, so this will return true
     * until a block is pushed. Consumers should ensure the runtime is initialized
     * with a root block before checking completion.
     */
    public isComplete(): boolean {
        return this.stack.blocks.length === 0;
    }

    /**
     * Helper method to safely pop and dispose a block following the new lifecycle pattern.
     * This demonstrates the consumer-managed dispose pattern.
     */
    public popAndDispose(): void {
        const poppedBlock = this.stack.pop();
        
        if (poppedBlock) {
            // Consumer responsibility: call dispose() on the popped block
            try {
                poppedBlock.dispose(this);
            } catch (error) {
                console.error(`  ❌ Error disposing block: ${error}`);
                // Continue execution despite dispose error
            }
        }
    }

    /**
     * Emergency cleanup method that disposes all blocks in the stack.
     * Useful for shutdown or error recovery scenarios.
     */
    public disposeAllBlocks(): void {
        // Stop the clock
        this.clock.stop();

        const disposeErrors: Error[] = [];
        
        while (this.stack.blocks.length > 0) {
            const block = this.stack.pop();
            if (block) {
                try {
                    block.dispose(this);
                } catch (error) {
                    disposeErrors.push(error as Error);
                    console.error(`  ❌ Error disposing ${block.key.toString()}: ${error}`);
                }
            }
        }
        
        if (disposeErrors.length > 0) {
            console.warn(`🧠 ScriptRuntime.disposeAllBlocks() - ${disposeErrors.length} dispose errors occurred`);
        }
    }
    
    tick(): IEvent[] {
        const currentBlock = this.stack.current;
        if (!currentBlock) {
            return [];
        }

        // In the new Push/Next/Pop pattern, we might emit timer events or check for completion
        // For now, we'll emit a generic tick event that blocks can handle
        const tickEvent: IEvent = {
            name: 'tick',
            timestamp: new Date(),
            data: { source: 'runtime' }
        };

        this.handle(tickEvent);

        return [];
    }
}
