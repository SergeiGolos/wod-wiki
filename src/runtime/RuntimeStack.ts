import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';

export class RuntimeStack {
    private readonly _blocks: IRuntimeBlock[] = [];

    public get blocks(): readonly IRuntimeBlock[] {
        return this._blocks.reverse();
    }

    public get keys(): BlockKey[] {
        return this._blocks.reverse().map(b => b.key);
    }

    public get current(): IRuntimeBlock | undefined {
        if (this._blocks.length === 0) {
            return undefined;
        }
        return this._blocks[this._blocks.length - 1];
    }

    public push(block: IRuntimeBlock): void {
        this._blocks.push(block);
    }

    public pop(): IRuntimeBlock | undefined {
        return this._blocks.pop();
    }

    public getParentBlocks(): readonly IRuntimeBlock[] {
        if (this._blocks.length <= 1) {
            return [];
        }
        return this._blocks.slice(0, this._blocks.length - 1);
    }
}
