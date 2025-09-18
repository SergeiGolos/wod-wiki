import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';

export class RuntimeStack {
    private readonly _blocks: IRuntimeBlock[] = [];

    public get blocks(): readonly IRuntimeBlock[] {
        return [...this._blocks].reverse();
    }

    /**
     * Returns the stack from top (current) to bottom. Alias of `blocks`.
     * Useful when you want to render the active frame first.
     */
    public get blocksTopFirst(): readonly IRuntimeBlock[] {
        return this.blocks;
    }

    /**
     * Returns the stack from bottom (root) to top (current).
     * Useful when you want to index into the root as position 0.
     */
    public get blocksBottomFirst(): readonly IRuntimeBlock[] {
        return [...this._blocks];
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
        const blockKey = block.key.toString();
        console.log(`📚 RuntimeStack.push() - Adding block: ${blockKey}`);
        console.log(`  📊 Stack depth before push: ${this._blocks.length}`);
        this._blocks.push(block);
        console.log(`  📊 Stack depth after push: ${this._blocks.length}`);
        console.log(`  🎯 New current block: ${this.current?.key.toString()}`);
    }

    public pop(): IRuntimeBlock | undefined {
        console.log(`📚 RuntimeStack.pop() - Removing top block`);
        console.log(`  📊 Stack depth before pop: ${this._blocks.length}`);
        const popped = this._blocks.pop();
        const poppedKey = popped ? popped.key.toString() : 'None';
        console.log(`  📦 Popped block: ${poppedKey}`);
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
    // Order from outermost parent (root) to immediate parent
    return [...this._blocks].slice(0, -1);
    }
}
