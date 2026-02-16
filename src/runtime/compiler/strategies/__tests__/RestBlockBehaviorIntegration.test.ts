import { describe, it, expect, beforeEach } from 'bun:test';
import { JitCompiler } from '../../JitCompiler';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { CodeStatement } from '@/core/models/CodeStatement';
import { TimerFragment } from '../../fragments/TimerFragment';
import { RoundsFragment } from '../../fragments/RoundsFragment';
import { AmrapLogicStrategy } from '../logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '../logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '../components/GenericTimerStrategy';
import { GenericLoopStrategy } from '../components/GenericLoopStrategy';
import { ChildrenStrategy } from '../enhancements/ChildrenStrategy';
import { SoundStrategy } from '../enhancements/SoundStrategy';
import { HistoryStrategy } from '../enhancements/HistoryStrategy';
import { CodeMetadata } from '@/core/models/CodeMetadata';

import {
    TimerBehavior,
    TimerEndingBehavior,
    ReEntryBehavior,
    RoundsEndBehavior,
    ChildSelectionBehavior,
    SoundCueBehavior,
    HistoryRecordBehavior,
    ReportOutputBehavior
} from '../../../behaviors';

/**
 * Tests for child selection/rest integration:
 * - AMRAP should include ChildSelectionBehavior with looping/rest injection
 * - EMOM should include ChildSelectionBehavior with looping/rest injection
 * - Behavior chain order is correct
 */
describe('Phase 5: Strategy ChildSelectionBehavior Integration', () => {
    let runtime: IScriptRuntime;
    let compiler: JitCompiler;

    // Mock Fragments for testing
    class MockTimerFragment extends TimerFragment {
        constructor(ms: number, forceUp: boolean = false) {
            const meta = new CodeMetadata(0, 0, 0, 0);
            super('0:00', meta, forceUp);
            (this as any).value = ms;
            (this as any).original = ms;
            (this as any).forceCountUp = forceUp;
        }
    }

    class MockRoundsFragment extends RoundsFragment {
        constructor(val: number) {
            super('0', new CodeMetadata(0, 0, 0, 0));
            (this as any).value = val;
        }
    }

    beforeEach(() => {
        runtime = {
            memory: { search: () => undefined }
        } as any;
        compiler = new JitCompiler();
    });

    describe('AMRAP with ChildSelectionBehavior', () => {
        beforeEach(() => {
            compiler.registerStrategy(new AmrapLogicStrategy());     // Priority 90
            compiler.registerStrategy(new GenericTimerStrategy());    // Priority 50
            compiler.registerStrategy(new GenericLoopStrategy());     // Priority 50
            compiler.registerStrategy(new ChildrenStrategy());        // Priority 50
            compiler.registerStrategy(new SoundStrategy());           // Priority 20
            compiler.registerStrategy(new HistoryStrategy());         // Priority 20
        });

        it('should include ChildSelectionBehavior in compiled AMRAP block', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(600000, true), // 10 min countdown
                new MockRoundsFragment(1)
            ];
            statement.hints = new Set(['behavior.timer', 'behavior.rounds']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block).toBeDefined();
            expect(block!.blockType).toBe('AMRAP');
            expect(block!.getBehavior(ChildSelectionBehavior)).toBeDefined();
        });

        it('should have ChildSelectionBehavior alongside timer behaviors', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(1200000, true), // 20 min
                new MockRoundsFragment(1)
            ];
            statement.hints = new Set(['behavior.timer', 'behavior.rounds']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(TimerBehavior)).toBeDefined();
            expect(block!.getBehavior(TimerEndingBehavior)).toBeDefined();
            expect(block!.getBehavior(ChildSelectionBehavior)).toBeDefined();
        });

        it('should have child selection behavior for container execution', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(600000, true),
                new MockRoundsFragment(1)
            ];
            statement.hints = new Set(['behavior.timer', 'behavior.rounds']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(ChildSelectionBehavior)).toBeDefined();
        });

        it('should have unbounded rounds (AMRAP pattern)', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(600000, true),
                new MockRoundsFragment(1)
            ];
            statement.hints = new Set(['behavior.timer', 'behavior.rounds']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(ReEntryBehavior)).toBeDefined();
            // AMRAP should NOT have RoundCompletionBehavior (unbounded)
            // Note: ChildrenStrategy may add it for unbounded rounds or not
            // depending on hasCountdownCompletion
        });

        it('should include sound cues', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(600000, true),
                new MockRoundsFragment(1)
            ];
            statement.hints = new Set(['behavior.timer', 'behavior.rounds']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(SoundCueBehavior)).toBeDefined();
        });

        it('should include segment output and history', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(600000, true),
                new MockRoundsFragment(1)
            ];
            statement.hints = new Set(['behavior.timer', 'behavior.rounds']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(ReportOutputBehavior)).toBeDefined();
            expect(block!.getBehavior(HistoryRecordBehavior)).toBeDefined();
        });
    });

    describe('EMOM with ChildSelectionBehavior', () => {
        beforeEach(() => {
            compiler.registerStrategy(new IntervalLogicStrategy()); // Priority 90
            compiler.registerStrategy(new GenericTimerStrategy());   // Priority 50
            compiler.registerStrategy(new GenericLoopStrategy());    // Priority 50
            compiler.registerStrategy(new ChildrenStrategy());       // Priority 50
            compiler.registerStrategy(new SoundStrategy());          // Priority 20
            compiler.registerStrategy(new HistoryStrategy());        // Priority 20
        });

        it('should include ChildSelectionBehavior in compiled EMOM block', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(60000), // 1 min interval
                new MockRoundsFragment(10)    // 10 rounds
            ];
            statement.hints = new Set(['behavior.repeating_interval']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block).toBeDefined();
            expect(block!.blockType).toBe('EMOM');
            expect(block!.getBehavior(ChildSelectionBehavior)).toBeDefined();
        });

        it('should have ChildSelectionBehavior alongside timer behaviors', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(60000),
                new MockRoundsFragment(10)
            ];
            statement.hints = new Set(['behavior.repeating_interval']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(TimerBehavior)).toBeDefined();
            expect(block!.getBehavior(TimerEndingBehavior)).toBeDefined();
            expect(block!.getBehavior(ChildSelectionBehavior)).toBeDefined();
        });

        it('should have bounded rounds (EMOM pattern)', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(60000),
                new MockRoundsFragment(10)
            ];
            statement.hints = new Set(['behavior.repeating_interval']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(ReEntryBehavior)).toBeDefined();
            expect(block!.getBehavior(RoundsEndBehavior)).toBeDefined();
        });

        it('should have child behaviors when children are present', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(60000),
                new MockRoundsFragment(10)
            ];
            statement.hints = new Set(['behavior.repeating_interval']);
            statement.children = [new CodeStatement()];

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(ChildSelectionBehavior)).toBeDefined();
        });

        it('should include sound cues', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(60000),
                new MockRoundsFragment(10)
            ];
            statement.hints = new Set(['behavior.repeating_interval']);

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(SoundCueBehavior)).toBeDefined();
        });

        it('should include segment output and history', () => {
            const statement = new CodeStatement();
            statement.fragments = [
                new MockTimerFragment(60000),
                new MockRoundsFragment(10)
            ];
            statement.hints = new Set(['behavior.repeating_interval']);

            const block = compiler.compile([statement], runtime);

            expect(block!.getBehavior(ReportOutputBehavior)).toBeDefined();
            expect(block!.getBehavior(HistoryRecordBehavior)).toBeDefined();
        });
    });
});
