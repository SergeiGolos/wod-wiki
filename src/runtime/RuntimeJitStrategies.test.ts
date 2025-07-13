import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeJitStrategies } from './RuntimeJitStrategies';
import { IRuntimeBlockStrategy } from './IRuntimeBlockStrategy';
import { RuntimeMetric } from './RuntimeMetric';
import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';
import { EventHandler } from './EventHandler';
import { IResultSpanBuilder } from './ResultSpanBuilder';

class MockStrategy implements IRuntimeBlockStrategy {
    constructor(private canHandle: boolean, private block: IRuntimeBlock | undefined) {}

    compile(metrics: RuntimeMetric[]): IRuntimeBlock | undefined {
        return this.canHandle ? this.block : undefined;
    }
}

class MockBlock implements IRuntimeBlock {
    spans: IResultSpanBuilder;
    handlers: EventHandler[];
    metrics: RuntimeMetric[];
    key: BlockKey;
    parent?: IRuntimeBlock | undefined;
    tick(): any {}
    inherit(): any {}
}

describe('RuntimeJitStrategies', () => {
    let strategies: RuntimeJitStrategies;

    beforeEach(() => {
        strategies = new RuntimeJitStrategies();
    });

    it('should return undefined if no strategy can handle the metrics', () => {
        const block = strategies.compile([]);
        expect(block).toBeUndefined();
    });

    it('should return the block from the first strategy that can handle the metrics', () => {
        const block1 = new MockBlock();
        const block2 = new MockBlock();
        const strategy1 = new MockStrategy(false, undefined);
        const strategy2 = new MockStrategy(true, block1);
        const strategy3 = new MockStrategy(true, block2);

        strategies.addStrategy(strategy1);
        strategies.addStrategy(strategy2);
        strategies.addStrategy(strategy3);

        const result = strategies.compile([]);

        expect(result).toBe(block1);
    });

    it('should return a block from a single strategy', () => {
        const block = new MockBlock();
        const strategy = new MockStrategy(true, block);
        strategies.addStrategy(strategy);

        const result = strategies.compile([]);

        expect(result).toBe(block);
    });

    it('should return undefined from a single strategy that cannot handle the metrics', () => {
        const strategy = new MockStrategy(false, undefined);
        strategies.addStrategy(strategy);

        const result = strategies.compile([]);

        expect(result).toBeUndefined();
    });

    it('should return a block from the last of multiple strategies', () => {
        const block = new MockBlock();
        const strategy1 = new MockStrategy(false, undefined);
        const strategy2 = new MockStrategy(false, undefined);
        const strategy3 = new MockStrategy(true, block);

        strategies.addStrategy(strategy1);
        strategies.addStrategy(strategy2);
        strategies.addStrategy(strategy3);

        const result = strategies.compile([]);

        expect(result).toBe(block);
    });

    it('should return undefined when no strategy can handle the metrics', () => {
        const strategy1 = new MockStrategy(false, undefined);
        const strategy2 = new MockStrategy(false, undefined);
        const strategy3 = new MockStrategy(false, undefined);

        strategies.addStrategy(strategy1);
        strategies.addStrategy(strategy2);
        strategies.addStrategy(strategy3);

        const result = strategies.compile([]);

        expect(result).toBeUndefined();
    });
});
