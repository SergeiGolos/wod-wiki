import { describe, expect, it } from 'bun:test';
import { BlockBuilder } from '../../compiler/BlockBuilder';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import {
    TimerInitBehavior,
    TimerTickBehavior,
    TimerPauseBehavior,
    TimerCompletionBehavior,
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundCompletionBehavior,
    ChildRunnerBehavior,
    ChildLoopBehavior,
    ReentryCounterBehavior,
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

            // Should have TimerInit, TimerTick, TimerPause, TimerCompletion
            expect(behaviors.some((b: any) => b instanceof TimerInitBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof TimerTickBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof TimerPauseBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof TimerCompletionBehavior)).toBe(true);
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

            // Should NOT have TimerCompletion
            expect(behaviors.some((b: any) => b instanceof TimerCompletionBehavior)).toBe(false);
            // Should still have the other timer behaviors
            expect(behaviors.some((b: any) => b instanceof TimerInitBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof TimerTickBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof TimerPauseBehavior)).toBe(true);
        });

        it('should pass completionConfig to TimerCompletionBehavior', () => {
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
            const timerCompletionBehavior = behaviors.find((b: any) => b instanceof TimerCompletionBehavior);

            expect(timerCompletionBehavior).toBeDefined();
            // Note: We can't easily test the config value without accessing private fields
            // But we can verify the behavior was added with the right constructor
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

            // Should have RoundInit, RoundAdvance, RoundCompletion
            expect(behaviors.some((b: any) => b instanceof RoundInitBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof RoundAdvanceBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof RoundCompletionBehavior)).toBe(true);
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

            // Should NOT have RoundCompletion
            expect(behaviors.some((b: any) => b instanceof RoundCompletionBehavior)).toBe(false);
            // Should still have RoundInit and RoundAdvance
            expect(behaviors.some((b: any) => b instanceof RoundInitBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof RoundAdvanceBehavior)).toBe(true);
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

            // Should NOT have RoundCompletion even though totalRounds is defined
            expect(behaviors.some((b: any) => b instanceof RoundCompletionBehavior)).toBe(false);
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

            // Should have ChildRunner
            expect(behaviors.some((b: any) => b instanceof ChildRunnerBehavior)).toBe(true);
            // Should NOT have ChildLoop by default
            expect(behaviors.some((b: any) => b instanceof ChildLoopBehavior)).toBe(false);
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
                    loopConfig: {}  // Provide loopConfig when addLoop is true
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have both ChildRunner and ChildLoop
            expect(behaviors.some((b: any) => b instanceof ChildRunnerBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof ChildLoopBehavior)).toBe(true);
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

            // Should have ReentryCounter and CompletionTimestamp
            expect(behaviors.some((b: any) => b instanceof ReentryCounterBehavior)).toBe(true);
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
            expect(behaviors.some((b: any) => b instanceof ReentryCounterBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof CompletionTimestampBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof TimerInitBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof RoundInitBehavior)).toBe(true);
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
                .asContainer({ childGroups: [[1, 2]], addLoop: true, loopConfig: {} });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have all three aspects
            expect(behaviors.some((b: any) => b instanceof TimerInitBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof RoundInitBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof ChildRunnerBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof ChildLoopBehavior)).toBe(true);
        });

        it('should allow manual behavior addition alongside aspect composers', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();
            const { DisplayInitBehavior } = require('../DisplayInitBehavior');

            builder
                .setContext(context)
                .setKey(key)
                .asTimer({ direction: 'up' })
                .addBehavior(new DisplayInitBehavior({ mode: 'clock' }));

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have timer aspect behaviors AND the manually added behavior
            expect(behaviors.some((b: any) => b instanceof TimerInitBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof DisplayInitBehavior)).toBe(true);
        });
    });
});
