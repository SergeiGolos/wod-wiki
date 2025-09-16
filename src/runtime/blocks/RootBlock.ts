import { BlockKey } from "../../BlockKey";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RootNextHandler } from "../handlers/RootNextHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IRuntimeBlock } from "../IRuntimeBlock";
import type { IMemoryReference } from "../memory";

/**
 * Root block adapted to the memory model. This ensures setRuntime() exists
 * so ScriptRuntimeWithMemory can push it safely.
 */
export class RootBlock extends RuntimeBlockWithMemoryBase {
    private _children: string[];
    private _statementIndexRef?: IMemoryReference<number>;

    constructor(children: string[]) {
        console.log(`🌱 RootBlock constructor - Creating with children: [${children.join(', ')}]`);
        const key = new BlockKey('root');
        super(key, []);
        this._children = children;
        console.log(`🌱 RootBlock created with key: ${this.key.toString()}`);
    }

    protected initializeMemory(): void {
        // Initialize statement index in memory
        this._statementIndexRef = this.allocateMemory<number>('statement-index', 0);
        console.log(`🌱 RootBlock.initializeMemory()`);
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        // Minimal spans builder placeholder
        return {
            create: () => ({ blockKey: '', timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {},
            stop: () => {}
        };
    }

    protected createInitialHandlers(): EventHandler[] {
        const handlers = [new RootNextHandler()];
        console.log(`  🔧 Registered ${handlers.length} handlers: ${handlers.map(h => h.name).join(', ')}`);
        return handlers;
    }

    /**
     * Get the current statement index from memory
     */
    public getStatementIndex(): number {
        if (!this._statementIndexRef || !this._statementIndexRef.isValid()) {
            return 0;
        }
        return this._statementIndexRef.get() || 0;
    }

    /**
     * Set the current statement index in memory
     */
    public setStatementIndex(index: number): void {
        if (this._statementIndexRef && this._statementIndexRef.isValid()) {
            this._statementIndexRef.set(index);
        }
    }

    /**
     * Increment the statement index in memory
     */
    public incrementStatementIndex(): void {
        const currentIndex = this.getStatementIndex();
        this.setStatementIndex(currentIndex + 1);
    }

    protected onPush(): IRuntimeEvent[] {
        console.log(`🌱 RootBlock.onPush() - Block pushed to stack`);
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        console.log(`🌱 RootBlock.onNext() - Determining next block after child completion`);
        // Root block typically doesn't have a next block
        return undefined;
    }

    protected onPop(): void {
        console.log(`🌱 RootBlock.onPop() - Block popped from stack, cleaning up`);
        // Handle completion logic for root block
    }
}