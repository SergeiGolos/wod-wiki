import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../core/models/BlockKey';
import { NextBlockLogger } from './NextBlockLogger';

const MAX_STACK_DEPTH = 10;

export class RuntimeStack {
    private readonly _blocks: IRuntimeBlock[] = [];

    public get blocks(): readonly IRuntimeBlock[] {
        return [...this._blocks].reverse();
    }

    public get blocksTopFirst(): readonly IRuntimeBlock[] {
        return [...this._blocks].reverse();
    }

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
        
        // Return new array (not reference to internal storage)
        // Top block first (index 0), bottom block last
        const graph = [...this._blocks].reverse();
        
        return graph;
    }
}
