import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { GroupNextHandler } from "../handlers/GroupNextHandler";
import type { IMemoryReference } from "../memory";
import { IRuntimeBlock } from "../IRuntimeBlock";

interface GroupState {
    childBlocks: IRuntimeBlock[];
    currentChildIndex: number;
}

export class TimedGroupBlock extends RuntimeBlockWithMemoryBase {
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

    protected createInitialHandlers(): EventHandler[] {
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

    public tick(): IRuntimeEvent[] {
        return [];
    }

    public inherit(): IMetricInheritance[] {
        return [];
    }

    public isDone(): boolean { 
        return false; 
    }

    public reset(): void {
        this.setGroupState({
            childBlocks: [],
            currentChildIndex: -1
        });
        console.log(`⏱️ TimedGroupBlock reset: ${this.key.toString()}`);
    }
}