import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../../core/models/BlockKey';

export type StackEvent =
    | { type: 'push'; block: IRuntimeBlock; depth: number; blocks: readonly IRuntimeBlock[] }
    | { type: 'pop'; block: IRuntimeBlock; depth: number; blocks: readonly IRuntimeBlock[] }
    | { type: 'initial'; blocks: readonly IRuntimeBlock[] };

export type StackListener = (event: StackEvent) => void;

/**
 * Unsubscribe function returned by subscription methods.
 */
export type Unsubscribe = () => void;

/**
 * Snapshot of the runtime stack state at the time of a stack mutation.
 * 
 * Pushed to UI observers via `IScriptRuntime.subscribeToStack()` on every
 * push/pop/clear operation. Contains everything the UI needs to render
 * the current state in a single object.
 */
export interface StackSnapshot {
    /** The event that caused this snapshot */
    type: 'push' | 'pop' | 'clear' | 'initial';

    /** Current stack blocks (bottom-to-top), frozen at event time */
    blocks: readonly IRuntimeBlock[];

    /** The block that was pushed/popped (undefined on 'clear'/'initial') */
    affectedBlock?: IRuntimeBlock;

    /** Stack depth after the event */
    depth: number;

    /** Timestamp from the runtime clock */
    clockTime: Date;
}

export type StackObserver = (snapshot: StackSnapshot) => void;

export interface IRuntimeStack {
    readonly blocks: readonly IRuntimeBlock[];
    readonly count: number;
    readonly current: IRuntimeBlock | undefined;
    readonly keys: BlockKey[];

    push(block: IRuntimeBlock): void;
    pop(): IRuntimeBlock | undefined;
    clear(): void;

    /**
     * Subscribe to stack changes.
     * New subscribers will immediately receive an 'initial' event with the current stack state.
     */
    subscribe(listener: StackListener): () => void;
}
