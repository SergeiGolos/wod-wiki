import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';
import { NextBlockLogger } from './NextBlockLogger';

const MAX_STACK_DEPTH = 10;

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
        // Inline validation
        if (block === null || block === undefined) {
            throw new TypeError('Block cannot be null or undefined');
        }
        if (!block.key) {
            throw new TypeError('Block must have a valid key');
        }
        if (!block.sourceIds || !Array.isArray(block.sourceIds)) {
            throw new TypeError(`Block must have a valid sourceIds array (block key: ${block.key})`);
        }
        if (this._blocks.length >= MAX_STACK_DEPTH) {
            throw new TypeError(
                `Stack overflow: maximum depth (${MAX_STACK_DEPTH}) exceeded (current depth: ${this._blocks.length}, block: ${block.key})`
            );
        }
        
        const blockKey = block.key.toString();
        const depthBefore = this._blocks.length;
        
        // Simple push - no initialization calls (constructor-based initialization)
        this._blocks.push(block);
        
        const depthAfter = this._blocks.length;

        // Log stack modification for next block validation
        NextBlockLogger.logStackPush(blockKey, depthBefore, depthAfter);
    }

    public pop(): IRuntimeBlock | undefined {
        // Inline validation - return undefined if empty
        if (this._blocks.length === 0) {
            return undefined;
        }
        
        // Simple pop - no cleanup calls (consumer-managed dispose)
        const popped = this._blocks.pop();
        
        return popped; // Consumer must call dispose()
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

    /**
     * Returns an ordered array representation of the stack.
     * Top block is at index 0, remaining blocks in top-to-bottom order.
     * @returns New array with top-first ordering
     */
    public graph(): IRuntimeBlock[] {
        console.log(`📊 RuntimeStack.graph() - Creating stack visualization`);
        console.log(`  📏 Current stack depth: ${this._blocks.length}`);
        
        // Return new array (not reference to internal storage)
        // Top block first (index 0), bottom block last
        const graph = [...this._blocks].reverse();
        
        if (graph.length > 0) {
            console.log(`  🎯 Top block: ${graph[0].key.toString()}`);
            console.log(`  🏗️  Bottom block: ${graph[graph.length - 1].key.toString()}`);
            console.log(`  📋 Stack order (top→bottom): [${graph.map(b => b.key.toString()).join(' → ')}]`);
        } else {
            console.log(`  📭 Stack is empty`);
        }
        
        console.log(`  ✅ Graph generation completed`);
        return graph;
    }
}
