import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { GroupNextHandler } from "../handlers/GroupNextHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import type { IMemoryReference } from "../memory";
import { IRepeatingBlockBehavior, LoopState } from "../behaviors/IRepeatingBlockBehavior";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";

export class RepeatingBlock extends RuntimeBlockWithMemoryBase implements IRepeatingBlockBehavior {
    private _loopStateRef?: IMemoryReference<LoopState>;
    // Removed unused segment counters; can be reintroduced when needed
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

        // Identify child statements for this block using the same pattern as RootNextHandler
        const childStatements = this.identifyChildStatements();

        this._loopStateRef = this.allocateMemory<LoopState>('loop-state', {
            remainingRounds: initialRounds,
            currentChildIndex: -1,
            childStatements: childStatements
        }, 'private');

    // Allocate other tracking state here in future as needed

        // Optional: make current round public if children need to see the round index
        const needsPublicRound = this.shouldExposeCurrentRound();
        if (needsPublicRound) {
            this._currentRoundRef = this.allocateMemory<number>('current-round', 1, 'public');
        }

        console.log(`🔄 RepeatingBlock initialized with ${initialRounds} rounds in memory`);
    }

    /**
     * Identify child statements for this repeating block from the script.
     * Child statements are those that are indented (higher columnStart) 
     * and appear after this block's statement in the script.
     */
    private identifyChildStatements(): any[] {
        if (!this.runtime || !this.runtime.script) {
            console.log(`🔄 RepeatingBlock - No runtime or script available for child identification`);
            return [];
        }

        // Get this block's source statement from the runtime by matching sourceId
        const sourceId = this.initialMetrics[0]?.sourceId;
        if (!sourceId) {
            console.log(`🔄 RepeatingBlock - No source ID available for child identification`);
            return [];
        }

        const statements = this.runtime.script.statements || [];
        const parentStatement = statements.find(stmt => stmt.id.toString() === sourceId);
        if (!parentStatement) {
            console.log(`🔄 RepeatingBlock - Parent statement not found for sourceId: ${sourceId}`);
            return [];
        }

        const parentColumnStart = parentStatement.meta?.columnStart || 1;
        const parentIndex = statements.indexOf(parentStatement);

        // Find child statements that:
        // 1. Appear after the parent statement in the script
        // 2. Have greater columnStart (are indented relative to parent)
        // 3. Are not children of other statements at the same or deeper level
        const childStatements: any[] = [];
        
        for (let i = parentIndex + 1; i < statements.length; i++) {
            const stmt = statements[i];
            const stmtColumnStart = stmt.meta?.columnStart || 1;
            
            // If we encounter a statement at the same or lesser indentation level, 
            // we've moved out of this block's children
            if (stmtColumnStart <= parentColumnStart) {
                break;
            }
            
            // If this is a direct child (immediately one level deeper)
            if (stmtColumnStart === parentColumnStart + 4) { // Assuming 4-space indentation
                childStatements.push(stmt);
            }
        }

        console.log(`🔄 RepeatingBlock - Identified ${childStatements.length} child statements for block ${this.key.toString()}: [${childStatements.map(s => s.id).join(', ')}]`);
        return childStatements;
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

    protected createInitialHandlers(): IEventHandler[] {
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

        if (state.remainingRounds <= 0) return false;

        const childCount = state.childStatements.length;
        if (childCount === 0) {
            console.log(`🔄 RepeatingBlock - No child statements found, no next child available`);
            return false;
        }

        // If there are children remaining in this round
        if (state.currentChildIndex < childCount - 1) return true;

        // If we've reached end-of-children but still have more rounds
        return state.remainingRounds > 1;
    }

    /**
     * Public testing method to get the next child block that would be executed.
     * This is for testing purposes only and mimics the old behavior.
     * @deprecated Use the runtime system for actual execution
     */
    public getNextChildForTesting(): IRuntimeBlock | undefined {
        if (!this.hasNextChild()) return undefined;
        
        const state = this.getLoopState();
        
        // Get the NEXT child that would be executed (currentChildIndex + 1)
        let nextChildIndex = state.currentChildIndex + 1;
        
        // If we're at the end of current round but have more rounds, wrap to first child
        if (nextChildIndex >= state.childStatements.length && state.remainingRounds > 1) {
            nextChildIndex = 0;
        }
        
        const nextChild = state.childStatements[nextChildIndex];
        
        if (!nextChild) return undefined;
        
        // For testing purposes, create a simple mock block with the expected key
        const mockBlock: IRuntimeBlock = {
            key: new BlockKey(`compiled-${nextChild.id}`),
            sourceId: [nextChild.id],
            push: () => [],
            next: () => [],
            pop: () => []
        };
        
        // Advance the state for next call
        this.advanceToNextChild();
        
        return mockBlock;
    }

    public advanceToNextChild(): void {
        const state = this.getLoopState();
        const childCount = state.childStatements.length;

        if (state.remainingRounds <= 0 || childCount <= 0) {
            // Nothing to do
            this.setLoopState(state);
            return;
        }

        if (state.currentChildIndex < childCount - 1) {
            // Advance within the current round
            state.currentChildIndex++;
        } else {
            // End of current round
            console.log(`🔄 RepeatingBlock - Round completed, ${state.remainingRounds - 1} rounds remaining`);
            state.remainingRounds--;
            if (state.remainingRounds > 0) {
                // Start next round at first child
                state.currentChildIndex = 0;
            }
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

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 RepeatingBlock.onPush() - Block pushed to stack`);
        void runtime;
        return [{ level: 'info', message: 'repeating push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 RepeatingBlock.onNext() - Determining next block after child completion`);
        // Scheduling and JIT compilation are handled by runtime/handlers now; just log progression
        void runtime;
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 RepeatingBlock.onPop() - Block popped from stack, cleaning up`);
        void runtime;
        // Handle completion logic for repeating block
        return [{ level: 'info', message: 'repeating pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}