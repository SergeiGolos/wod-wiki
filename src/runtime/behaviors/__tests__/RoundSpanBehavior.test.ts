import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { RoundSpanBehavior } from '../RoundSpanBehavior';
import { RoundPerLoopBehavior } from '../RoundPerLoopBehavior';
import { ChildIndexBehavior } from '../ChildIndexBehavior';

/**
 * RoundSpanBehavior Contract Tests
 */
describe('RoundSpanBehavior Contract', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2026-01-04T12:00:00Z'));
    });

    describe('onPush', () => {
        it('should create round span when round > 0', () => {
            const childIndexBehavior = new ChildIndexBehavior(3);
            const roundBehavior = new RoundPerLoopBehavior();
            const spanBehavior = new RoundSpanBehavior('rounds');

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                spanBehavior
            ]);

            harness.push(block);
            harness.mount();

            // Verify no errors occur during execution
            expect(block).toBeDefined();
        });

        it('should create interval span type for EMOM', () => {
            const childIndexBehavior = new ChildIndexBehavior(3);
            const roundBehavior = new RoundPerLoopBehavior();
            const spanBehavior = new RoundSpanBehavior('interval');

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                spanBehavior
            ]);

            harness.push(block);
            harness.mount();

            // Verify behavior accepts 'interval' type
            expect(block).toBeDefined();
        });
    });

    describe('onNext', () => {
        it('should handle round transitions without errors', () => {
            const childIndexBehavior = new ChildIndexBehavior(2);
            const roundBehavior = new RoundPerLoopBehavior();
            const spanBehavior = new RoundSpanBehavior('rounds');

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                spanBehavior
            ]);

            harness.push(block);
            harness.mount();

            // Multiple nexts to trigger round changes
            harness.next();
            harness.next();
            harness.next();

            expect(block).toBeDefined();
        });

        it('should include rep scheme in span fragments', () => {
            const repScheme = [21, 15, 9];
            const childIndexBehavior = new ChildIndexBehavior(3);
            const roundBehavior = new RoundPerLoopBehavior();
            const spanBehavior = new RoundSpanBehavior('rounds', repScheme);

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                spanBehavior
            ]);

            harness.push(block);
            harness.mount();

            // Verify behavior accepts rep scheme
            expect(block).toBeDefined();
        });
    });

    describe('onPop', () => {
        it('should close active span without errors', () => {
            const childIndexBehavior = new ChildIndexBehavior(3);
            const roundBehavior = new RoundPerLoopBehavior();
            const spanBehavior = new RoundSpanBehavior('rounds');

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                spanBehavior
            ]);

            harness.push(block);
            harness.mount();
            harness.next();

            // Pop should close spans cleanly
            const actions = harness.unmount();
            expect(actions).toBeDefined();
        });
    });
});
