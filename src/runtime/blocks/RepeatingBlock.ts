import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IRuntimeBlock } from "../IRuntimeBlock";
import type { IMemoryReference } from "../memory";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";

/**
 * Minimal legacy RepeatingBlock used only by tests to demonstrate child execution.
 * It identifies immediate child statements from the script via indentation, and
 * cycles through them for a fixed number of rounds.
 */
export class RepeatingBlock extends RuntimeBlockWithMemoryBase implements IRuntimeBlock {
    private _loopStateRef?: IMemoryReference<{ remainingRounds: number; currentChildIndex: number; childStatements: any[]; }>

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
    }

    protected initializeMemory(): void {
        const rounds = this.initialMetrics.find(m => m.values.some(v => v.type === 'rounds'))
            ?.values.find(v => v.type === 'rounds')?.value || 1;

        const childStatements = this.identifyChildStatements();
        this._loopStateRef = this.allocateMemory('loop-state', {
            remainingRounds: rounds,
            currentChildIndex: -1,
            childStatements
        }, 'private');
    }

    public getLoopState(): { remainingRounds: number; currentChildIndex: number; childStatements: any[]; } {
        return this._loopStateRef!.get()!;
    }

    private identifyChildStatements(): any[] {
        const sourceId = this.initialMetrics[0]?.sourceId;
        const statements = this.runtime?.script?.statements || [];
        const parent = statements.find((s: any) => s.id?.toString() === sourceId);
        if (!parent) return [];
        const parentCol = parent.meta?.columnStart || 1;
        const idx = statements.indexOf(parent);
        const children: any[] = [];
        for (let i = idx + 1; i < statements.length; i++) {
            const s = statements[i];
            const col = s.meta?.columnStart || 1;
            if (col <= parentCol) break;
            if (col === parentCol + 4 || col === parentCol + 2) children.push(s);
        }
        return children;
    }

    public hasNextChild(): boolean {
        const state = this.getLoopState();
        const len = state.childStatements.length;
        if (len === 0) return false;
        if (state.currentChildIndex === -1) {
            // Starting a round: allowed only if we still have rounds remaining
            return state.remainingRounds > 0;
        }
        // Otherwise, we have a current child to emit if index in range
        return state.currentChildIndex >= 0 && state.currentChildIndex < len;
    }

    public advanceToNextChild(): void {
    const state = this.getLoopState();
    let { currentChildIndex, remainingRounds, childStatements } = state;
        if (currentChildIndex + 1 < childStatements.length) {
            currentChildIndex += 1;
        } else {
            // new round
            if (remainingRounds > 0) remainingRounds -= 1;
            currentChildIndex = 0;
        }
        this._loopStateRef!.set({ remainingRounds, currentChildIndex, childStatements });
    }

    /** Testing helper to simulate JIT and return a mocked child block */
    public getNextChildForTesting(): IRuntimeBlock | undefined {
        if (!this.hasNextChild()) return undefined;
        // move index if starting from -1
        const state = this.getLoopState();
        if (state.currentChildIndex < 0) {
            this.advanceToNextChild();
        }
        const after = this.getLoopState();
        const { currentChildIndex, childStatements } = after;
        const stmt = childStatements[currentChildIndex];
        const mock: IRuntimeBlock = {
            key: new BlockKey(`compiled-${stmt.id}`),
            push: () => [],
            next: () => [],
            pop: () => [],
            inherit: () => [],
        } as any;
        // advance for subsequent calls
        if (currentChildIndex + 1 < childStatements.length) {
            this._loopStateRef!.set({ remainingRounds: after.remainingRounds, currentChildIndex: currentChildIndex + 1, childStatements });
        } else {
            // end of round
            const remainingRounds = after.remainingRounds - 1;
            this._loopStateRef!.set({ remainingRounds, currentChildIndex: -1, childStatements });
        }
        return mock;
    }

    // Abstracts from base - provide minimal no-op implementations
    protected createSpansBuilder(): IResultSpanBuilder {
        return {
            create: () => ({ blockKey: this.key.toString(), timeSpan: { blockKey: this.key.toString() }, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => void 0,
            start: () => void 0,
            stop: () => void 0,
        };
    }
    protected createInitialHandlers(): IEventHandler[] { return []; }
    protected onPush(_runtime: IScriptRuntime): IRuntimeLog[] { return []; }
    protected onNext(_runtime: IScriptRuntime): IRuntimeLog[] { return []; }
    protected onPop(_runtime: IScriptRuntime): IRuntimeLog[] { return []; }
}
