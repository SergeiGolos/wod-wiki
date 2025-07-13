import { describe, it, expect } from 'vitest';
import { RuntimeStack } from './RuntimeStack';
import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';
import { ResultSpan, ResultSpanBuilder } from './ResultSpanBuilder';
import { EventHandler, IRuntimeAction } from './EventHandler';
import { IScriptRuntime } from './IScriptRuntime';
import { IMetricInheritance } from './IMetricInheritance';
import { InheritMetricInheritance } from './MetricInheritance';
import { RuntimeMetric } from './RuntimeMetric';

class MockResultSpanBuilder implements ResultSpanBuilder {
    create(blockKey: string, metrics: RuntimeMetric[]): ResultSpan {
        return {
            blockKey,
            metrics,
            timeSpan: {},
            duration: 0,
        };
    }
    getSpans(): ResultSpan[] {
        return [];
    }
    close(): void {}
    start(): void {}
    stop(): void {}
}

class MockRuntimeBlock implements IRuntimeBlock {
    public spans: ResultSpanBuilder = new MockResultSpanBuilder();
    public handlers: EventHandler[] = [];
    public metrics: RuntimeMetric[] = [];
    public parent?: IRuntimeBlock | undefined;

    constructor(public readonly key: BlockKey) {}

    next(runtime: IScriptRuntime): IRuntimeAction[] {
        return [];
    }

    onEnter(runtime: IScriptRuntime): void {
        // no-op
    }

    inherit(): IMetricInheritance {
        return new InheritMetricInheritance([]);
    }
}

describe('RuntimeStack', () => {
    it('should be empty when initialized', () => {
        const stack = new RuntimeStack();
        expect(stack.blocks).toEqual([]);
        expect(stack.current).toBeUndefined();
        expect(stack.keys).toEqual([]);
    });

    it('should push a block onto the stack', () => {
        const stack = new RuntimeStack();
        const block = new MockRuntimeBlock(new BlockKey('key1'));
        stack.push(block);
        expect(stack.blocks).toEqual([block]);
        expect(stack.current).toBe(block);
        expect(stack.keys).toEqual([block.key]);
    });

    it('should pop a block from the stack', () => {
        const stack = new RuntimeStack();
        const block = new MockRuntimeBlock(new BlockKey('key1'));
        stack.push(block);
        const popped = stack.pop();
        expect(popped).toBe(block);
        expect(stack.blocks).toEqual([]);
        expect(stack.current).toBeUndefined();
        expect(stack.keys).toEqual([]);
    });

    it('should return the current block without removing it', () => {
        const stack = new RuntimeStack();
        const block1 = new MockRuntimeBlock(new BlockKey('key1'));
        const block2 = new MockRuntimeBlock(new BlockKey('key2'));
        stack.push(block1);
        stack.push(block2);
        expect(stack.current).toBe(block2);
        expect(stack.blocks.length).toBe(2);
    });

    it('should return the keys in the correct order', () => {
        const stack = new RuntimeStack();
        const block1 = new MockRuntimeBlock(new BlockKey('key1'));
        const block2 = new MockRuntimeBlock(new BlockKey('key2'));
        stack.push(block1);
        stack.push(block2);
        expect(stack.keys).toEqual([block2.key, block1.key]);
    });

    it('should return the blocks in the correct order', () => {
        const stack = new RuntimeStack();
        const block1 = new MockRuntimeBlock(new BlockKey('key1'));
        const block2 = new MockRuntimeBlock(new BlockKey('key2'));
        stack.push(block1);
        stack.push(block2);
        expect(stack.blocks).toEqual([block2, block1]);
    });

    it('should return parent blocks', () => {
        const stack = new RuntimeStack();
        const block1 = new MockRuntimeBlock(new BlockKey('key1'));
        const block2 = new MockRuntimeBlock(new BlockKey('key2'));
        const block3 = new MockRuntimeBlock(new BlockKey('key3'));
        stack.push(block1);
        stack.push(block2);
        stack.push(block3);
        expect(stack.getParentBlocks()).toEqual([block1, block2]);
    });

    it('should return an empty array when there are no parent blocks', () => {
        const stack = new RuntimeStack();
        const block1 = new MockRuntimeBlock(new BlockKey('key1'));
        stack.push(block1);
        expect(stack.getParentBlocks()).toEqual([]);
    });
});