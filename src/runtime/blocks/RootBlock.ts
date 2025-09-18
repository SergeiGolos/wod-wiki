import { BlockKey } from "../../BlockKey";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RootNextHandler } from "../handlers/RootNextHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";

/**
 * Root block adapted to the memory model. This ensures setRuntime() exists
 * so ScriptRuntime can push it safely.
 */
export class RootBlock extends RuntimeBlockWithMemoryBase {
    private _childrenRef?: IMemoryReference<string[]>;
    private _childrenInit: string[];
    private _statementIndexRef?: IMemoryReference<number>;

    constructor(children: string[]) {
        console.log(`🌱 RootBlock constructor - Creating with children: [${children.join(', ')}]`);
        const key = new BlockKey('root');
        super(key, []);
        this._childrenInit = children;
        console.log(`🌱 RootBlock created with key: ${this.key.toString()}`);
    }

    protected initializeMemory(): void {
        // Initialize statement index in memory
        this._statementIndexRef = this.allocateMemory<number>('statement-index', 0);
        // Store children array in memory now that memory is available
        this._childrenRef = this.allocateMemory<string[]>('children', this._childrenInit);
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

    protected createInitialHandlers(): IEventHandler[] {
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

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🌱 RootBlock.onPush() - Block pushed to stack`);
    // reference runtime to avoid unused warnings
    void runtime;
    void this._childrenRef;
        return [{ level: 'info', message: 'root push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🌱 RootBlock.onNext() - Determining next block after child completion`);
        void runtime;
        // Root block typically doesn't schedule further work; return an empty log set
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🌱 RootBlock.onPop() - Block popped from stack, cleaning up`);
        void runtime;
        // Handle completion logic for root block
        return [{ level: 'info', message: 'root pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}