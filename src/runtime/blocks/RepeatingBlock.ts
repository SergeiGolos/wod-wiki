import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";
import { GroupNextHandler } from "../handlers/GroupNextHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import type { IMemoryReference } from "../memory";

interface LoopState {
    remainingRounds: number;
    currentChildIndex: number;
    childStatements: any[];
}

export class RepeatingBlock extends RuntimeBlockWithMemoryBase {
    private _loopStateRef?: IMemoryReference<LoopState>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`🔄 RepeatingBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Find rounds metric value
        const roundsMetric = this.getMetrics().find(m => 
            m.values.some(v => v.type === 'rounds')
        );
        const initialRounds = roundsMetric?.values.find(v => v.type === 'rounds')?.value || 1;

        // Allocate memory for loop state
        this._loopStateRef = this.allocateMemory<LoopState>('loop-state', {
            remainingRounds: initialRounds,
            currentChildIndex: -1,
            childStatements: []
        });

        console.log(`🔄 RepeatingBlock initialized with ${initialRounds} rounds in memory`);
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

    private getLoopState(): LoopState {
        if (!this._loopStateRef || !this._loopStateRef.isValid()) {
            throw new Error(`RepeatingBlock ${this.key.toString()} loop state not initialized`);
        }
        const state = this._loopStateRef.get();
        if (!state) {
            throw new Error(`RepeatingBlock ${this.key.toString()} loop state is null`);
        }
        return state;
    }

    private setLoopState(state: LoopState): void {
        if (!this._loopStateRef || !this._loopStateRef.isValid()) {
            throw new Error(`RepeatingBlock ${this.key.toString()} loop state not initialized`);
        }
        this._loopStateRef.set(state);
    }

    public hasNextChild(): boolean {
        const state = this.getLoopState();
        
        // Check if there are more children in the current round
        if (state.currentChildIndex < state.childStatements.length - 1) {
            return true;
        }
        
        // Check if there are more rounds to execute
        return state.remainingRounds > 1;
    }

    public advanceToNextChild(): void {
        const state = this.getLoopState();
        state.currentChildIndex++;
        
        // If we've completed all children in this round
        if (state.currentChildIndex >= state.childStatements.length) {
            console.log(`🔄 RepeatingBlock - Round completed, ${state.remainingRounds - 1} rounds remaining`);
            state.remainingRounds--;
            state.currentChildIndex = 0; // Reset to first child for next round
            
            // Update the BlockKey index to reflect the new round
            this.key.add(1);
        }
        
        // Save the updated state to memory
        this.setLoopState(state);
        
        console.log(`🔄 RepeatingBlock - Advanced to child ${state.currentChildIndex}, rounds remaining: ${state.remainingRounds}`);
    }

    public tick(): IRuntimeEvent[] {
        return [];
    }

    public isDone(): boolean {
        const state = this.getLoopState();
        return state.remainingRounds <= 0;
    }

    public reset(): void {
        // Find rounds metric value
        const roundsMetric = this.getMetrics().find(m => 
            m.values.some(v => v.type === 'rounds')
        );
        const initialRounds = roundsMetric?.values.find(v => v.type === 'rounds')?.value || 1;
        
        // Reset state in memory
        this.setLoopState({
            remainingRounds: initialRounds,
            currentChildIndex: -1,
            childStatements: []
        });
        
        console.log(`🔄 RepeatingBlock reset with ${initialRounds} rounds`);
    }

    public inherit(): IMetricInheritance[] {
        return [];
    }
}