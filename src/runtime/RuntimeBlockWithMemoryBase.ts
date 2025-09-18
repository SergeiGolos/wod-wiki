import type { IMemoryReference } from './memory';
import { IRuntimeMemory } from './memory/IRuntimeMemory';
import { IResultSpanBuilder } from './ResultSpanBuilder';
import { IEventHandler, IRuntimeLog } from './EventHandler';
import { RuntimeMetric, MetricEntry } from './RuntimeMetric';
import { BlockKey } from '../BlockKey';
import { IScriptRuntimeWithMemory } from './IScriptRuntimeWithMemory';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeBlock } from './IRuntimeBlock';

/**
 * Base implementation for runtime blocks using the new Push/Next/Pop pattern.
 * All blocks should extend this class instead of implementing IRuntimeBlock directly.
 */
export abstract class RuntimeBlockWithMemoryBase implements IRuntimeBlock {
    protected memory?: IRuntimeMemory;
    protected runtime?: IScriptRuntimeWithMemory;
    public readonly sourceId: string[];

    // Memory references for core runtime state
    private _spansRef?: IMemoryReference<IResultSpanBuilder>;
    // Handlers and metrics are now stored as individual memory entries ('handler' and 'metric').

    constructor(public readonly key: BlockKey, protected initialMetrics: RuntimeMetric[] = []) {
        // Derive source ids from initial metrics (unique, preserve insertion order)
        const ids = Array.from(new Set(initialMetrics.map(m => m.sourceId)));
        this.sourceId = ids;
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
    push(runtime: IScriptRuntime): IRuntimeLog[] {
        // Bind runtime and memory
        this.runtime = runtime as unknown as IScriptRuntimeWithMemory;
        this.memory = (runtime as any).memory as IRuntimeMemory;

        const ownerId = this.key.toString();

        // Initialize core runtime state in memory
        this._spansRef = this.memory.allocate<IResultSpanBuilder>(
            'span-builder',
            ownerId,
            this.createSpansBuilder()
        );

        // Handlers: allocate one entry per handler to avoid arrays in memory
        const initialHandlers = this.createInitialHandlers();
        for (const h of initialHandlers) {
            this.memory.allocate<IEventHandler>('handler', ownerId, h, undefined, 'private');
        }

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
                    this.memory.allocate<MetricEntry>('metric', ownerId, entry, undefined, 'public');
                }
            }
        } catch (e) {
            console.log(`⚠️ Failed to publish metric entries for ${ownerId}:`, e);
        }

        console.log(`🧠 RuntimeBlockWithMemoryBase pushed and initialized memory for: ${this.key.toString()}`);

        // Return initial logs from subclass
        return this.onPush(runtime);
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     */
    next(runtime: IScriptRuntime): IRuntimeLog[] {
        return this.onNext(runtime);
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    pop(runtime: IScriptRuntime): IRuntimeLog[] {
        // Call subclass completion logic
        const logs = this.onPop(runtime) || [];

        // Clean up all memory allocated by this block
        const mem = (runtime as any).memory as IRuntimeMemory;
        const myMemory = this.getMyMemory();
        console.log(`🧠 RuntimeBlockWithMemoryBase cleaning up ${myMemory.length} memory references for ${this.key.toString()}`);

        for (const memRef of myMemory) {
            mem.release(memRef);
        }

        return [
            ...logs,
            {
                message: `Popped block and cleaned memory: ${this.key.toString()}`,
                level: 'info',
                timestamp: new Date(),
                context: { released: myMemory.length }
            }
        ];
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
    protected abstract createInitialHandlers(): IEventHandler[];

    /**
     * Template method called after push to return initial events
     */
    protected abstract onPush(runtime: IScriptRuntime): IRuntimeLog[];

    /**
     * Template method called when determining next block after child completion
     */
    protected abstract onNext(runtime: IScriptRuntime): IRuntimeLog[];
    /**
     * Template method called before pop for completion logic
     */
    protected abstract onPop(runtime: IScriptRuntime): IRuntimeLog[];

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
     * Helper to allocate a JSON-like state object under the canonical 'state' type.
     * Use distinct subtypes by convention via a state object key if needed.
     */
    protected allocateState<T extends object>(initial: T, visibility: 'public' | 'private' = 'private'): IMemoryReference<T> {
        return this.allocateMemory<T>('state', initial, visibility);
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
    protected getHandlers(): IEventHandler[] {
        if (!this.memory) return [];
        // Collect all handler entries owned by this block
        const refs = this.memory.searchReferences<IEventHandler>({ ownerId: this.key.toString(), type: 'handler' });
        return refs.map(r => r.get()).filter(Boolean) as IEventHandler[];
    }

    /**
     * Gets the metrics from memory
     */
    protected getMetrics(): RuntimeMetric[] {
        // Avoid array storage in memory; derive from constructor input for now
        return [...this.initialMetrics];
    }
}