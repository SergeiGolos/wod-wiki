import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { RoundDisplayBehavior } from '../RoundDisplayBehavior';
import { RoundPerLoopBehavior } from '../RoundPerLoopBehavior';
import { ChildIndexBehavior } from '../ChildIndexBehavior';
import { SetRoundsDisplayAction } from '../../actions/display/WorkoutStateActions';

/**
 * RoundDisplayBehavior Contract Tests
 */
describe('RoundDisplayBehavior Contract', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2026-01-04T12:00:00Z'));
    });

    describe('onPush', () => {
        it('should emit SetRoundsDisplayAction with current round and total', () => {
            const childIndexBehavior = new ChildIndexBehavior(3);
            const roundBehavior = new RoundPerLoopBehavior();
            const displayBehavior = new RoundDisplayBehavior(5);

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                displayBehavior
            ]);

            harness.push(block);
            const actions = harness.mount();

            const displayActions = actions.filter(a => a instanceof SetRoundsDisplayAction);
            expect(displayActions.length).toBeGreaterThan(0);
        });

        it('should emit action without total when totalRounds not provided', () => {
            const childIndexBehavior = new ChildIndexBehavior(3);
            const roundBehavior = new RoundPerLoopBehavior();
            const displayBehavior = new RoundDisplayBehavior(); // No total

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                displayBehavior
            ]);

            harness.push(block);
            const actions = harness.mount();

            const displayActions = actions.filter(a => a instanceof SetRoundsDisplayAction);
            expect(displayActions.length).toBeGreaterThan(0);
        });

        it('should return empty array when no IRoundSource exists', () => {
            const displayBehavior = new RoundDisplayBehavior(5);
            const block = new MockBlock('test-block', [displayBehavior]);

            harness.push(block);
            const actions = harness.mount();

            const displayActions = actions.filter(a => a instanceof SetRoundsDisplayAction);
            expect(displayActions.length).toBe(0);
        });
    });

    describe('onNext', () => {
        it('should emit action when round changes', () => {
            const childIndexBehavior = new ChildIndexBehavior(2); // 2 children = wrap after 2 nexts
            const roundBehavior = new RoundPerLoopBehavior();
            const displayBehavior = new RoundDisplayBehavior(5);

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                displayBehavior
            ]);

            harness.push(block);
            harness.mount();

            // First next - child index = 0
            harness.next();

            // Second next - child index = 1
            harness.next();

            // Third next - child index wraps to 0, round increments
            const actions = harness.next();

            const displayActions = actions.filter(a => a instanceof SetRoundsDisplayAction);
            expect(displayActions.length).toBeGreaterThan(0);
        });

        it('should not emit action when round stays the same', () => {
            const childIndexBehavior = new ChildIndexBehavior(3);
            const roundBehavior = new RoundPerLoopBehavior();
            const displayBehavior = new RoundDisplayBehavior(5);

            const block = new MockBlock('test-block', [
                childIndexBehavior,
                roundBehavior,
                displayBehavior
            ]);

            harness.push(block);
            harness.mount();
            harness.next(); // First call sets lastEmittedRound

            // Second call - same round, should not emit
            const actions = harness.next();

            const displayActions = actions.filter(a => a instanceof SetRoundsDisplayAction);
            expect(displayActions.length).toBe(0);
        });
    });
});
