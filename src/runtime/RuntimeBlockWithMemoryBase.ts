import { IRuntimeBlock } from './IRuntimeBlock';
import type { IMemoryReference } from './memory';
import { IRuntimeMemory } from './memory/IRuntimeMemory';
import { IResultSpanBuilder } from './ResultSpanBuilder';
import { EventHandler, IRuntimeEvent } from './EventHandler';
import { RuntimeMetric, MetricEntry } from './RuntimeMetric';
import { BlockKey } from '../BlockKey';
import { IScriptRuntimeWithMemory } from './IScriptRuntimeWithMemory';

/**
 * Base implementation for runtime blocks using the new Push/Next/Pop pattern.
 * All blocks should extend this class instead of implementing IRuntimeBlock directly.
 */
export abstract class RuntimeBlockWithMemoryBase implements IRuntimeBlock {
    protected memory?: IRuntimeMemory;
    protected runtime?: IScriptRuntimeWithMemory;

    // Memory references for core runtime state
    private _spansRef?: IMemoryReference<IResultSpanBuilder>;
    private _handlersRef?: IMemoryReference<EventHandler[]>;
    private _metricsRef?: IMemoryReference<RuntimeMetric[]>; // kept for compatibility; prefer metric-entry

    constructor(public readonly key: BlockKey, protected initialMetrics: RuntimeMetric[] = []) {
        console.log(`🧠 RuntimeBlockWithMemoryBase created: ${key.toString()}`);
    }

    /**
     * Sets the runtime context for this block
     */
    setRuntime(runtime: IScriptRuntimeWithMemory): void {
        this.runtime = runtime;
    }

    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     */
    push(memory: IRuntimeMemory): IRuntimeEvent[] {
        this.memory = memory;

        const ownerId = this.key.toString();

        // Initialize core runtime state in memory
        this._spansRef = memory.allocate<IResultSpanBuilder>(
            'spans',
            ownerId,
            this.createSpansBuilder()
        );

        this._handlersRef = memory.allocate<EventHandler[]>(
            'handlers',
            ownerId,
            this.createInitialHandlers()
        );

        // For new memory model, avoid storing arrays as a single memory object.
        // Keep a private reference only if needed for legacy paths.
        this._metricsRef = memory.allocate<RuntimeMetric[]>(
            'metrics',
            ownerId,
            [...this.initialMetrics],
            undefined,
            'private'
        );

        // Call template method for subclass initialization
        this.initializeMemory();

        // Publish flattened metric entries to memory for easier inspection and linking
        try {
            const metrics = [...this.initialMetrics];
            for (const m of metrics) {
                for (const mv of m.values) {
                    const entry: MetricEntry = {
                        sourceId: m.sourceId,
                        blockId: ownerId,
                        type: mv.type,
                        value: mv.value,
                        unit: mv.unit,
                    };
                    memory.allocate<MetricEntry>('metric-entry', ownerId, entry, undefined, 'public');
                }
            }
        } catch (e) {
            console.log(`⚠️ Failed to publish metric entries for ${ownerId}:`, e);
        }

        console.log(`🧠 RuntimeBlockWithMemoryBase pushed and initialized memory for: ${this.key.toString()}`);

        // Return initial events from subclass
        return this.onPush();
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     */
    next(_memory: IRuntimeMemory): IRuntimeBlock | undefined {
        return this.onNext();
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    pop(memory: IRuntimeMemory): void {
        // Call subclass completion logic
        this.onPop();

        // Clean up all memory allocated by this block
        const myMemory = this.getMyMemory();
        console.log(`🧠 RuntimeBlockWithMemoryBase cleaning up ${myMemory.length} memory references for ${this.key.toString()}`);

        for (const memRef of myMemory) {
            memory.release(memRef);
        }
    }

    /**
     * Template method for subclasses to initialize their own memory allocations
     */
    protected abstract initializeMemory(): void;

    /**
     * Template method for subclasses to create their spans builder
     */
    protected abstract createSpansBuilder(): IResultSpanBuilder;

    /**
     * Template method for subclasses to create their initial event handlers
     */
    protected abstract createInitialHandlers(): EventHandler[];

    /**
     * Template method called after push to return initial events
     */
    protected abstract onPush(): IRuntimeEvent[];

    /**
     * Template method called when determining next block after child completion
     */
    protected abstract onNext(): IRuntimeBlock | undefined;

    /**
     * Template method called before pop for completion logic
     */
    protected abstract onPop(): void;

    /**
     * Helper method to allocate memory for block-specific state
     */
    protected allocateMemory<T>(type: string, initialValue?: T, visibility: 'public' | 'private' = 'private'): IMemoryReference<T> {
        if (!this.memory) {
            throw new Error(`Cannot allocate memory before block is pushed for ${this.key.toString()}`);
        }

        return this.memory.allocate<T>(
            type,
            this.key.toString(),
            initialValue,
            undefined,
            visibility
        );
    }

    /**
     * Helper method to get memory references allocated by this block
     */
    protected getMyMemory(): IMemoryReference[] {
        if (!this.memory) {
            return [];
        }

        return this.memory.getByOwner(this.key.toString());
    }

    /**
     * Helper to get memory visible to this block: own refs (all) + public from ancestors
     */
    protected getVisibleMemory(): IMemoryReference[] {
        if (!this.memory || !this.runtime) return [];
        const ownerId = this.key.toString();
        // Determine ancestry from runtime stack
        const ancestors = this.runtime.stack.getParentBlocks().map(b => b.key.toString());
        return this.memory.getVisibleFor(ownerId, ancestors);
    }

    /**
     * Helper to find visible references by type
     */
    protected findVisibleByType<T = any>(type: string): IMemoryReference<T>[] {
        return this.getVisibleMemory().filter(r => r.type === type) as IMemoryReference<T>[];
    }

    /**
     * Gets the result spans builder from memory
     */
    protected getSpans(): IResultSpanBuilder {
        if (!this._spansRef || !this._spansRef.isValid()) {
            throw new Error(`Block ${this.key.toString()} spans not initialized or invalid`);
        }
        const spans = this._spansRef.get();
        if (!spans) {
            throw new Error(`Block ${this.key.toString()} spans is null/undefined`);
        }
        return spans;
    }

    /**
     * Gets the event handlers from memory
     */
    protected getHandlers(): EventHandler[] {
        if (!this._handlersRef || !this._handlersRef.isValid()) {
            throw new Error(`Block ${this.key.toString()} handlers not initialized or invalid`);
        }
        const handlers = this._handlersRef.get();
        if (!handlers) {
            throw new Error(`Block ${this.key.toString()} handlers is null/undefined`);
        }
        return handlers;
    }

    /**
     * Gets the metrics from memory
     */
    protected getMetrics(): RuntimeMetric[] {
        if (!this._metricsRef || !this._metricsRef.isValid()) {
            throw new Error(`Block ${this.key.toString()} metrics not initialized or invalid`);
        }
        const metrics = this._metricsRef.get();
        if (!metrics) {
            throw new Error(`Block ${this.key.toString()} metrics is null/undefined`);
        }
        return metrics;
    }
}