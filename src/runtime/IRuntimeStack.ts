import { IRuntimeBlock } from './IRuntimeBlock';
import { StackObservable } from './StackObservable';
import { BlockKey } from '../core/models/BlockKey';

export interface IRuntimeStack {
    readonly blocks: readonly IRuntimeBlock[];
    readonly count: number;
    readonly current: IRuntimeBlock | undefined;
    readonly keys: BlockKey[];
    readonly updates: StackObservable;

    push(block: IRuntimeBlock): void;
    pop(): IRuntimeBlock | undefined;
    clear(): void;
}
