import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../../core/models/BlockKey';

export type StackEvent =
    | { type: 'push'; block: IRuntimeBlock; depth: number }
    | { type: 'pop'; block: IRuntimeBlock; depth: number }
    | { type: 'initial'; blocks: readonly IRuntimeBlock[] };

export type StackListener = (event: StackEvent) => void;

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
