import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { GroupNextHandler } from "../handlers/GroupNextHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IRuntimeBlock } from "../IRuntimeBlock";
import type { IMemoryReference } from "../memory";
import { IRepeatingBlockBehavior, LoopState } from "../behaviors/IRepeatingBlockBehavior";

export class RepeatingBlock extends RuntimeBlockWithMemoryBase implements IRepeatingBlockBehavior {
    private _loopStateRef?: IMemoryReference<LoopState>;
    private _segmentsTotalRef?: IMemoryReference<number>;
    private _segmentsPerRoundRef?: IMemoryReference<number>;
    private _segmentsRoundIndexRef?: IMemoryReference<number>;
    private _segmentsTotalIndexRef?: IMemoryReference<number>;
    private _currentRoundRef?: IMemoryReference<number>; // public if children need to see round index

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`🔄 RepeatingBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Find rounds metric value from initial metrics
        const roundsMetric = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'rounds')
        );
        const initialRounds = roundsMetric?.values.find(v => v.type === 'rounds')?.value || 1;

        // Allocate memory for loop state (private)
        this._loopStateRef = this.allocateMemory<LoopState>('loop-state', {
            remainingRounds: initialRounds,
            currentChildIndex: -1,
            childStatements: []
        }, 'private');

        // Allocate memory for segments tracking (private)
        this._segmentsTotalRef = this.allocateMemory<number>('segments.total', 0, 'private');
        this._segmentsPerRoundRef = this.allocateMemory<number>('segments.per-round', 0, 'private');
        this._segmentsRoundIndexRef = this.allocateMemory<number>('segments.round-index', 0, 'private');
        this._segmentsTotalIndexRef = this.allocateMemory<number>('segments.total-index', 0, 'private');

        // Optional: make current round public if children need to see the round index
        const needsPublicRound = this.shouldExposeCurrentRound();
        if (needsPublicRound) {
            this._currentRoundRef = this.allocateMemory<number>('current-round', 1, 'public');
        }

        console.log(`🔄 RepeatingBlock initialized with ${initialRounds} rounds in memory`);
    }

    /**
     * Determine if current round should be exposed publicly for children
     * Override in subclasses if needed
     */
    protected shouldExposeCurrentRound(): boolean {
        return false; // Default: keep round private
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

    public getLoopState(): LoopState {
        if (!this._loopStateRef || !this._loopStateRef.isValid()) {
            throw new Error(`RepeatingBlock ${this.key.toString()} loop state not initialized`);
        }
        const state = this._loopStateRef.get();
        if (!state) {
            throw new Error(`RepeatingBlock ${this.key.toString()} loop state is null`);
        }
        return state;
    }

    public setLoopState(state: LoopState): void {
        if (!this._loopStateRef || !this._loopStateRef.isValid()) {
            throw new Error(`RepeatingBlock ${this.key.toString()} loop state not initialized`);
        }
        this._loopStateRef.set(state);

        // Update current round if it's being tracked publicly
        if (this._currentRoundRef) {
            const totalRounds = this.initialMetrics.find(m =>
                m.values.some(v => v.type === 'rounds')
            )?.values.find(v => v.type === 'rounds')?.value || 1;
            const currentRound = totalRounds - state.remainingRounds + 1;
            this._currentRoundRef.set(currentRound);
        }
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
        }
        
        // Save the updated state to memory
        this.setLoopState(state);
        
        console.log(`🔄 RepeatingBlock - Advanced to child ${state.currentChildIndex}, rounds remaining: ${state.remainingRounds}`);
    }


    public reset(): void {
        // Find rounds metric value from initial metrics
        const roundsMetric = this.initialMetrics.find(m =>
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

    protected onPush(): IRuntimeEvent[] {
        console.log(`🔄 RepeatingBlock.onPush() - Block pushed to stack`);
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        console.log(`🔄 RepeatingBlock.onNext() - Determining next block after child completion`);

        if (this.hasNextChild()) {
            this.advanceToNextChild();
            // Return a placeholder - actual implementation would create the next child block
            return undefined; // TODO: Implement actual child block creation
        }

        // No more children, signal completion
        return undefined;
    }

    protected onPop(): void {
        console.log(`🔄 RepeatingBlock.onPop() - Block popped from stack, cleaning up`);
        // Handle completion logic for repeating block
    }
}