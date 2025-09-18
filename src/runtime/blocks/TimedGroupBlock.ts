import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlock } from "../RuntimeBlock";
import { GroupNextHandler } from "../handlers/GroupNextHandler";
import type { IMemoryReference } from "../memory";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";

interface GroupState {
    childBlocks: IRuntimeBlock[];
    currentChildIndex: number;
}

export class TimedGroupBlock extends RuntimeBlock {
    private _groupStateRef?: IMemoryReference<GroupState>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`⏱️ TimedGroupBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Allocate memory for group state (child blocks and current index)
        this._groupStateRef = this.allocateMemory<GroupState>('group-state', {
            childBlocks: [],
            currentChildIndex: -1
        });

        console.log(`⏱️ TimedGroupBlock initialized memory for: ${this.key.toString()}`);
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        // Create a simple spans builder - this should be replaced with actual implementation
        return {
            create: () => ({ blockKey: '', timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {},
            stop: () => {}
        };
    }

    protected createInitialHandlers(): IEventHandler[] {
        return [new GroupNextHandler()];
    }

    private getGroupState(): GroupState {
        if (!this._groupStateRef || !this._groupStateRef.isValid()) {
            throw new Error(`TimedGroupBlock ${this.key.toString()} group state not initialized`);
        }
        const state = this._groupStateRef.get();
        if (!state) {
            throw new Error(`TimedGroupBlock ${this.key.toString()} group state is null`);
        }
        return state;
    }

    private setGroupState(state: GroupState): void {
        if (!this._groupStateRef || !this._groupStateRef.isValid()) {
            throw new Error(`TimedGroupBlock ${this.key.toString()} group state not initialized`);
        }
        this._groupStateRef.set(state);
    }

    public hasNextChild(): boolean {
        const state = this.getGroupState();
        return state.currentChildIndex < state.childBlocks.length - 1;
    }

    public advanceToNextChild(): void {
        const state = this.getGroupState();
        state.currentChildIndex++;
        this.setGroupState(state);
        
        console.log(`⏱️ TimedGroupBlock advanced to child ${state.currentChildIndex}`);
        // In a real implementation, this would involve more logic
        // to activate the next child block.
    }

    public reset(): void {
        this.setGroupState({
            childBlocks: [],
            currentChildIndex: -1
        });
        console.log(`⏱️ TimedGroupBlock reset: ${this.key.toString()}`);
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimedGroupBlock.onPush() - Block pushed to stack`);
        void runtime;
        return [{ level: 'info', message: 'group push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimedGroupBlock.onNext() - Determining next block after child completion`);
        void runtime;
        
        // Scheduling responsibility has moved out; just log
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimedGroupBlock.onPop() - Block popped from stack, cleaning up`);
        void runtime;
        // Handle completion logic for timed group block
        return [{ level: 'info', message: 'group pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}