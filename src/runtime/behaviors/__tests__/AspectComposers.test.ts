import { describe, expect, it } from 'bun:test';
import { BlockBuilder } from '../../compiler/BlockBuilder';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import {
    CountdownTimerBehavior,
    CountupTimerBehavior,
    ChildSelectionBehavior,
    CompletionTimestampBehavior
} from '../index';

// Mock runtime
const mockRuntime: IScriptRuntime = {
    clock: { now: new Date(1000) },
    events: { subscribe: () => ({ unsubscribe: () => {} }) },
    compiler: {} as any,
    stack: { count: 0 } as any,
} as any;

describe('BlockBuilder Aspect Composers', () => {
    describe('asTimer()', () => {
        it('should add countdown timer behavior for direction down', () => {
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

            // Should have CountdownTimerBehavior
            expect(behaviors.some((b: any) => b instanceof CountdownTimerBehavior)).toBe(true);
        });

        it('should add countup timer behavior for direction up', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asTimer({
                    direction: 'up',
                    label: 'Session'
                });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Should have CountupTimerBehavior
            expect(behaviors.some((b: any) => b instanceof CountupTimerBehavior)).toBe(true);
        });

        it('should respect completesBlock config in asTimer', () => {
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
            const timer = behaviors.find((b: any) => b instanceof CountdownTimerBehavior) as CountdownTimerBehavior;

            expect(timer).toBeDefined();
            expect((timer as any).config.mode).toBe('reset-interval');
        });
    });

    describe('asRepeater()', () => {
        it('should wire round config into ChildSelectionBehavior when totalRounds is defined', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asRepeater({
                    totalRounds: 5,
                    startRound: 1
                })
                .asContainer({ childGroups: [[1]] });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // Round config is now wired into ChildSelectionBehavior
            const csb = behaviors.find((b: any) => b instanceof ChildSelectionBehavior);
            expect(csb).toBeDefined();
            expect((csb as any).config?.totalRounds).toBe(5);
            expect((csb as any).config?.startRound).toBe(1);
        });

        it('should wire unbounded round config into ChildSelectionBehavior', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asRepeater({
                    totalRounds: undefined,  // Unbounded
                    startRound: 1
                })
                .asContainer({ childGroups: [[1]] });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            const csb = behaviors.find((b: any) => b instanceof ChildSelectionBehavior);
            expect(csb).toBeDefined();
            // Unbounded: startRound is passed but totalRounds is undefined
            expect((csb as any).config?.startRound).toBe(1);
            expect((csb as any).config?.totalRounds).toBeUndefined();
        });

        it('should store round config regardless of addCompletion flag', () => {
            const builder = new BlockBuilder(mockRuntime);
            const context = new BlockContext(mockRuntime, 'test', 'test');
            const key = new BlockKey();

            builder
                .setContext(context)
                .setKey(key)
                .asRepeater({
                    totalRounds: 5,
                    addCompletion: false  // Explicit false - stored but internal to ChildSelectionBehavior
                })
                .asContainer({ childGroups: [[1]] });

            const block = builder.build();
            const behaviors = (block as any).behaviors;

            // ChildSelectionBehavior is still added (round config is stored)
            const csb = behaviors.find((b: any) => b instanceof ChildSelectionBehavior);
            expect(csb).toBeDefined();
            expect((csb as any).config?.totalRounds).toBe(5);
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
            expect(behaviors.some((b: any) => b instanceof CountupTimerBehavior)).toBe(true);
            // Note: asRepeater() alone doesn't add behaviors; ChildSelectionBehavior is only
            // wired when asContainer() is also called (round config is stored in pendingRoundConfig)
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
            expect(behaviors.some((b: any) => b instanceof CountdownTimerBehavior)).toBe(true);
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
            expect(behaviors.some((b: any) => b instanceof CountupTimerBehavior)).toBe(true);
            expect(behaviors.some((b: any) => b instanceof LabelingBehavior)).toBe(true);
        });
    });
});
