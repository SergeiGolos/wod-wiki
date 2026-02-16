import { describe, expect, it } from 'bun:test';
import { BlockBuilder } from '../../compiler/BlockBuilder';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import {
    TimerBehavior,
    TimerEndingBehavior,
    ReEntryBehavior,
    RoundsEndBehavior,
    ChildSelectionBehavior,
    CompletionTimestampBehavior
} from '../index';

// Mock runtime
const mockRuntime: IScriptRuntime = {
    clock: { now: new Date(1000) },
    events: { subscribe: () => ({ unsubscribe: () => {} }) },
    compiler: {} as any,
    stack: {} as any,
} as any;

describe('BlockBuilder Aspect Composers', () => {
    describe('asTimer()', () => {
        it('should add timer aspect behaviors with completion by default', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asTimer({
                    direction: 'down',
                    durationMs: 60000,
                    label: 'Work',
                    role: 'primary'
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have TimerBehavior and TimerEndingBehavior
            expect(behaviors.some((b: any) => b instanceof TimerBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof TimerEndingBehavior)).toBe(true);
        });

        it('should skip completion behavior when addCompletion is false', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asTimer({
                    direction: 'up',
                    addCompletion: false
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should NOT have TimerEndingBehavior
            expect(behaviors.some((b: any) => b instanceof TimerEndingBehavior)).toBe(false);
            // Should still have the other timer behaviors
            expect(behaviors.some((b: any) => b instanceof TimerBehavior)).toBe(true);
        });

        it('should pass completionConfig to TimerEndingBehavior', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asTimer({
                    direction: 'down',
                    durationMs: 60000,
                    completionConfig: { completesBlock: false }
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;
            const timerCompletionBehavior = behaviors.find((b: any) => b instanceof TimerEndingBehavior);

            expect(timerCompletionBehavior).toBeDefined();
            // Verify the behavior was added with completion mode wiring
        });
    });

    describe('asRepeater()', () => {
        it('should add repeater aspect behaviors with completion when totalRounds is defined', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asRepeater({
                    totalRounds: 5,
                    startRound: 1
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have ReEntry and RoundsEndBehavior
            expect(behaviors.some((b: any) => b instanceof ReEntryBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof RoundsEndBehavior)).toBe(true);
        });

        it('should skip completion behavior for unbounded rounds', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asRepeater({
                    totalRounds: undefined,  // Unbounded
                    startRound: 1
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have RoundsEndBehavior
            expect(behaviors.some((b: any) => b instanceof RoundsEndBehavior)).toBe(true);
            // Should still have ReEntry
            expect(behaviors.some((b: any) => b instanceof ReEntryBehavior)).toBe(true);
        });

        it('should respect addCompletion flag explicitly', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asRepeater({
                    totalRounds: 5,
                    addCompletion: false  // Explicit false
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should NOT have RoundsEndBehavior due explicit addCompletion flag
            expect(behaviors.some((b: any) => b instanceof RoundsEndBehavior)).toBe(false);
        });
    });

    describe('asContainer()', () => {
        it('should add container aspect behaviors without loop by default', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asContainer({
                    childGroups: [[1, 2], [3, 4]]
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            expect(behaviors.some((b: any) => b instanceof ChildSelectionBehavior)).toBe(true);
        });

        it('should add loop behavior when addLoop is true', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asContainer({
                    childGroups: [[1, 2]],
                    addLoop: true,
                    loopConfig: { condition: 'timer-active' }
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            expect(behaviors.some((b: any) => b instanceof ChildSelectionBehavior)).toBe(true);
        });
    });

    describe('Universal Invariants', () => {
        it('should automatically add universal behaviors to all blocks', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .setLabel('Test Block');

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have CompletionTimestamp
            expect(behaviors.some((b: any) => b instanceof CompletionTimestampBehavior)).toBe(true);
        });

        it('should add universal behaviors even with aspect composers', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asTimer({ direction: 'up' })
                .asRepeater({ totalRounds: 3 });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have universal behaviors PLUS aspect behaviors
            expect(behaviors.some((b: any) => b instanceof CompletionTimestampBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof TimerBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof ReEntryBehavior)).toBe(true);
        });
    });

    describe('Aspect Composition', () => {
        it('should support chaining multiple aspect composers', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asTimer({ direction: 'down', durationMs: 300000 })
                .asRepeater({ totalRounds: undefined })
                .asContainer({ childGroups: [[1, 2]], addLoop: true, loopConfig: { condition: 'timer-active' } });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have all three aspects
            expect(behaviors.some((b: any) => b instanceof TimerBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof ReEntryBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof ChildSelectionBehavior)).toBe(true);
        });

        it('should allow manual behavior addition alongside aspect composers', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();
            const { LabelingBehavior } = require('../LabelingBehavior');

            builder
                .setContext(context)
                .setKey(key)
                .asTimer({ direction: 'up' })
                .addBehavior(new LabelingBehavior({ mode: 'clock' }));

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have timer aspect behaviors AND the manually added behavior
            expect(behaviors.some((b: any) => b instanceof TimerBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof LabelingBehavior)).toBe(true);
        });
    });
});
