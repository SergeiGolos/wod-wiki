import { IRuntimeBlockWithMemory } from "./IRuntimeBlockWithMemory";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IMemoryReference } from "./memory";
import { IScriptRuntimeWithMemory } from "./IScriptRuntimeWithMemory";

/**
 * Base class that adds memory support to existing runtime blocks.
 * This allows gradual migration from the old architecture to the new memory-separated one.
 */
export abstract class RuntimeBlockWithMemoryBase implements IRuntimeBlockWithMemory {
    private _memory: IMemoryReference[] = [];
    private _runtime?: IScriptRuntimeWithMemory;

    // Delegate all existing IRuntimeBlock properties to the wrapped block
    abstract get key(): import("../BlockKey").BlockKey;
    abstract get spans(): import("./ResultSpanBuilder").IResultSpanBuilder;
    abstract handlers: import("./EventHandler").EventHandler[];
    abstract metrics: import("./RuntimeMetric").RuntimeMetric[];
    abstract parent?: IRuntimeBlock | undefined;
    abstract tick(): import("./EventHandler").IRuntimeEvent[];
    abstract isDone(): boolean;
    abstract reset(): void;
    abstract inherit(): import("./IMetricInheritance").IMetricInheritance[];

    get memory(): IMemoryReference[] {
        return [...this._memory];
    }

    /**
     * Sets the runtime context. This should be called when the block is added to the runtime.
     */
    setRuntime(runtime: IScriptRuntimeWithMemory): void {
        this._runtime = runtime;
    }

    allocateMemory<T>(type: string, initialValue?: T): IMemoryReference<T> {
        if (!this._runtime) {
            throw new Error(`Cannot allocate memory: block ${this.key.toString()} is not associated with a runtime`);
        }

        const ownerId = this.key.toString();
        const memoryRef = this._runtime.memory.allocate<T>(type, initialValue, ownerId);
        this._memory.push(memoryRef);

        console.log(`🧠 RuntimeBlock.allocateMemory() - Block ${ownerId} allocated ${type} memory [${memoryRef.id}]`);
        
        return memoryRef;
    }

    getMemory<T>(type: string): IMemoryReference<T> | undefined {
        for (const mem of this._memory) {
            if (mem.type === type && mem.isValid()) {
                return mem as IMemoryReference<T>;
            }
        }
        return undefined;
    }

    /**
     * Cleanup all memory allocated by this block.
     * This is automatically called when the block is removed from the stack.
     */
    cleanupMemory(): void {
        if (this.onMemoryCleanup) {
            this.onMemoryCleanup();
        }

        console.log(`🧠 RuntimeBlock.cleanupMemory() - Cleaning up ${this._memory.length} memory references for block ${this.key.toString()}`);

        if (this._runtime) {
            for (const memRef of this._memory) {
                if (memRef.isValid()) {
                    this._runtime.memory.release(memRef);
                }
            }
        }

        this._memory.length = 0;
    }

    onMemoryCleanup?(): void;
}