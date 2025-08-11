import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';

export class RuntimeStack {
    private readonly _blocks: IRuntimeBlock[] = [];

    public get blocks(): readonly IRuntimeBlock[] {
        return [...this._blocks].reverse();
    }

    public get keys(): BlockKey[] {
        return [...this._blocks].reverse().map(b => b.key);
    }

    public get current(): IRuntimeBlock | undefined {
        if (this._blocks.length === 0) {
            return undefined;
        }
        return this._blocks[this._blocks.length - 1];
    }

    public push(block: IRuntimeBlock): void {
        console.log(`📚 RuntimeStack.push() - Adding block: ${block.key.toString()}`);
        console.log(`  📊 Stack depth before push: ${this._blocks.length}`);
        this._blocks.push(block);
        console.log(`  📊 Stack depth after push: ${this._blocks.length}`);
        console.log(`  🎯 New current block: ${this.current?.key.toString()}`);
    }

    public pop(): IRuntimeBlock | undefined {
        console.log(`📚 RuntimeStack.pop() - Removing top block`);
        console.log(`  📊 Stack depth before pop: ${this._blocks.length}`);
        const popped = this._blocks.pop();
        console.log(`  📦 Popped block: ${popped?.key.toString() || 'None'}`);
        console.log(`  📊 Stack depth after pop: ${this._blocks.length}`);
        console.log(`  🎯 New current block: ${this.current?.key.toString() || 'None'}`);
        return popped;
    }

    public setBlocks(blocks: IRuntimeBlock[]): void {
        this._blocks.length = 0;
        this._blocks.push(...blocks);
    }

    public getParentBlocks(): IRuntimeBlock[] {
        // Return all blocks except the current one (all parent blocks)
        if (this._blocks.length <= 1) {
            return [];
        }
        return [...this._blocks].slice(0, -1).reverse();
    }
}
