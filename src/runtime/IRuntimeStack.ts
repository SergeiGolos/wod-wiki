import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../core/models/BlockKey';

export interface IRuntimeStack {
    readonly blocks: readonly IRuntimeBlock[];
    readonly count: number;
    readonly current: IRuntimeBlock | undefined;
    readonly keys: BlockKey[];

    push(block: IRuntimeBlock): void;
    pop(): IRuntimeBlock | undefined;
    clear(): void;
}
