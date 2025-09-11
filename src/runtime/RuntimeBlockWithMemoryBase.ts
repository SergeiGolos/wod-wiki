import { IRuntimeBlock } from './IRuntimeBlock';
import { IScriptRuntimeWithMemory } from './IScriptRuntimeWithMemory';
import { IMemoryReference } from './memory';
import { IResultSpanBuilder } from './ResultSpanBuilder';
import { EventHandler } from './EventHandler';
import { RuntimeMetric } from './RuntimeMetric';
import { IMetricInheritance } from './IMetricInheritance';
import { BlockKey } from '../BlockKey';

/**
 * Base implementation for runtime blocks that use memory for all state storage.
 * All blocks should extend this class instead of implementing IRuntimeBlock directly.
 */
export abstract class RuntimeBlockWithMemoryBase implements IRuntimeBlock {
    protected runtime?: IScriptRuntimeWithMemory;
    private _initialMetrics: RuntimeMetric[];
    
    // Memory references for core runtime state
    private _spansRef?: IMemoryReference<IResultSpanBuilder>;
    private _handlersRef?: IMemoryReference<EventHandler[]>;
    private _parentRef?: IMemoryReference<IRuntimeBlock>;
    private _metricsRef?: IMemoryReference<RuntimeMetric[]>;

    constructor(public readonly key: BlockKey, metrics: RuntimeMetric[]) {
        this._initialMetrics = metrics;
        console.log(`🧠 RuntimeBlockWithMemoryBase created: ${key.toString()}`);
    }

    /**
     * Sets the runtime context and initializes memory storage for core state
     */
    setRuntime(runtime: IScriptRuntimeWithMemory): void {
        this.runtime = runtime;
        
        const ownerId = this.key.toString();
        
        // Initialize core runtime state in memory
        this._spansRef = runtime.memory.allocate<IResultSpanBuilder>(
            'spans', 
            this.createSpansBuilder(), 
            ownerId
        );
        
        this._handlersRef = runtime.memory.allocate<EventHandler[]>(
            'handlers', 
            this.createInitialHandlers(), 
            ownerId
        );
        
        this._metricsRef = runtime.memory.allocate<RuntimeMetric[]>(
            'metrics', 
            [...this._initialMetrics], 
            ownerId
        );
        
        this._parentRef = runtime.memory.allocate<IRuntimeBlock>(
            'parent', 
            undefined, 
            ownerId
        );

        // Call template method for subclass initialization
        this.initializeMemory();
        
        console.log(`🧠 RuntimeBlockWithMemoryBase initialized memory for: ${this.key.toString()}`);
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

    getSpans(): IResultSpanBuilder {
        if (!this._spansRef || !this._spansRef.isValid()) {
            throw new Error(`Block ${this.key.toString()} spans not initialized or invalid`);
        }
        const spans = this._spansRef.get();
        if (!spans) {
            throw new Error(`Block ${this.key.toString()} spans is null/undefined`);
        }
        return spans;
    }

    getHandlers(): EventHandler[] {
        if (!this._handlersRef || !this._handlersRef.isValid()) {
            throw new Error(`Block ${this.key.toString()} handlers not initialized or invalid`);
        }
        const handlers = this._handlersRef.get();
        if (!handlers) {
            throw new Error(`Block ${this.key.toString()} handlers is null/undefined`);
        }
        return handlers;
    }

    getMetrics(): RuntimeMetric[] {
        if (!this._metricsRef || !this._metricsRef.isValid()) {
            throw new Error(`Block ${this.key.toString()} metrics not initialized or invalid`);
        }
        const metrics = this._metricsRef.get();
        if (!metrics) {
            throw new Error(`Block ${this.key.toString()} metrics is null/undefined`);
        }
        return metrics;
    }

    getParent(): IRuntimeBlock | undefined {
        if (!this._parentRef || !this._parentRef.isValid()) {
            return undefined;
        }
        return this._parentRef.get();
    }

    /**
     * Sets the parent block reference in memory
     */
    protected setParent(parent: IRuntimeBlock | undefined): void {
        if (this._parentRef && this._parentRef.isValid()) {
            this._parentRef.set(parent);
        }
    }

    /**
     * Helper method to allocate memory for block-specific state
     */
    protected allocateMemory<T>(type: string, initialValue?: T): IMemoryReference<T> {
        if (!this.runtime) {
            throw new Error(`Cannot allocate memory before runtime is set for block ${this.key.toString()}`);
        }
        
        return this.runtime.memory.allocate<T>(
            type,
            initialValue,
            this.key.toString()
        );
    }

    /**
     * Helper method to get memory references allocated by this block
     */
    protected getMyMemory(): IMemoryReference[] {
        if (!this.runtime) {
            return [];
        }
        
        return this.runtime.memory.getByOwner(this.key.toString());
    }

    /**
     * Clean up all memory allocated by this block
     */
    cleanupMemory(): void {
        if (!this.runtime) {
            return;
        }

        const myMemory = this.getMyMemory();
        console.log(`🧠 RuntimeBlockWithMemoryBase cleaning up ${myMemory.length} memory references for ${this.key.toString()}`);
        
        for (const memRef of myMemory) {
            this.runtime.memory.release(memRef);
        }
    }

    // Abstract methods that subclasses must implement
    abstract tick(): import('./EventHandler').IRuntimeEvent[];
    abstract isDone(): boolean;
    abstract reset(): void;
    abstract inherit(): IMetricInheritance[];
}