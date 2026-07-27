import { describe, it, expect, afterEach } from 'bun:test';
import { ChildSelectionBehavior } from '../ChildSelectionBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { TimerState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';
import { CompileAndPushBlockAction } from '../../actions/stack/CompileAndPushBlockAction';
import { PushRestBlockAction } from '../../actions/stack/PushRestBlockAction';
import { MemoryLocation } from '../../memory/MemoryLocation';

describe('ChildSelectionBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    function setup(config: any, opts?: { timerState?: TimerState; clockNow?: number }) {
        harness = new BehaviorTestHarness().withClock(new Date(opts?.clockNow ?? 1000));
        const behavior = new ChildSelectionBehavior(config);
        const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
        if (opts?.timerState) {
            block.pushMemory(new MemoryLocation('time', [{
                type: 0 as any, image: '', origin: 'runtime' as any,
                value: opts.timerState
            }]));
        }
        harness.push(block);
        return block;
    }

    it('dispatches first child on mount and writes children status', () => {
        const block = setup({ childGroups: [[1], [2]] });
        // Mount directly to inspect returned actions without executing them
        const actions = block.mount(harness.runtime);

        expect(actions.some(a => a.type === 'compile-and-push-block')).toBe(true);
        const compileAction = actions.find(a => a.type === 'compile-and-push-block');
        expect((compileAction as CompileAndPushBlockAction).statementIds).toEqual([1]);

        expect(block.recordings.pushMemory.some(p =>
            p.tag === 'children:status' &&
            p.metrics.some((m: any) =>
                m.value?.childIndex === 1 &&
                m.value?.totalChildren === 2 &&
                m.value?.allExecuted === false &&
                m.value?.allCompleted === false
            )
        )).toBe(true);
    });

    it('supports skipOnMount and only sets next preview', () => {
        const block = setup({ childGroups: [[10]], skipOnMount: true });
        const actions = block.mount(harness.runtime);

        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('update-next-preview');
        expect(block.recordings.pushMemory.some(p =>
            p.tag === 'children:status' &&
            p.metrics.some((m: any) =>
                m.value?.childIndex === 0 &&
                m.value?.allExecuted === false
            )
        )).toBe(true);
    });

    it('dispatches next children in sequence on onNext', () => {
        const block = setup({ childGroups: [[1], [2], [3]] });
        block.mount(harness.runtime);
        const actions = block.next(harness.runtime);

        const compileAction = actions.find(a => a.type === 'compile-and-push-block');
        expect(compileAction).toBeDefined();
        expect((compileAction as CompileAndPushBlockAction).statementIds).toEqual([2]);
    });

    it('loops while countdown timer is active when configured', () => {
        const block = setup(
            { childGroups: [[1]], loop: { condition: 'timer-active' } },
            {
                timerState: {
                    direction: 'down',
                    durationMs: 60000,
                    spans: [new TimeSpan(0)],
                    label: 'AMRAP',
                    role: 'primary',
                },
                clockNow: 10000,
            }
        );

        block.mount(harness.runtime);
        const actions = block.next(harness.runtime);

        const compileAction = actions.find(a => a.type === 'compile-and-push-block');
        expect(compileAction).toBeDefined();
        expect((compileAction as CompileAndPushBlockAction).statementIds).toEqual([1]);
    });

    it('does not loop when countdown timer is expired', () => {
        const block = setup(
            { childGroups: [[1]], loop: { condition: 'timer-active' } },
            {
                timerState: {
                    direction: 'down',
                    durationMs: 60000,
                    spans: [new TimeSpan(0)],
                    label: 'AMRAP',
                    role: 'primary',
                },
                clockNow: 70000,
            }
        );

        block.mount(harness.runtime);
        const actions = block.next(harness.runtime);

        expect(block.recordings.markComplete).toHaveLength(1);
        expect(block.recordings.markComplete[0].reason).toBe('rounds-exhausted');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('update-next-preview');
    });

    it('injects rest between loop iterations when enabled', () => {
        const block = setup(
            { childGroups: [[1]], loop: { condition: 'timer-active' }, injectRest: true },
            {
                timerState: {
                    direction: 'down',
                    durationMs: 60000,
                    spans: [new TimeSpan(0)],
                    label: 'EMOM',
                    role: 'primary',
                },
                clockNow: 30000,
            }
        );

        block.mount(harness.runtime);
        const actions = block.next(harness.runtime);

        expect(actions[0].type).toBe('push-rest-block');
        expect((actions[0] as PushRestBlockAction).durationMs).toBe(30000);
        expect((actions[0] as PushRestBlockAction).label).toBe('Rest');

        const afterRestActions = block.next(harness.runtime);
        const compileAction = afterRestActions.find(a => a.type === 'compile-and-push-block');
        expect(compileAction).toBeDefined();
        expect((compileAction as CompileAndPushBlockAction).statementIds).toEqual([1]);
    });

    it('does not inject rest for count-up timers', () => {
        const block = setup(
            { childGroups: [[1]], loop: { condition: 'timer-active' }, injectRest: true },
            {
                timerState: {
                    direction: 'up',
                    spans: [new TimeSpan(0)],
                    label: 'Elapsed',
                    role: 'primary',
                },
                clockNow: 10000,
            }
        );

        block.mount(harness.runtime);
        const actions = block.next(harness.runtime);

        const compileAction = actions.find(a => a.type === 'compile-and-push-block');
        expect(compileAction).toBeDefined();
    });
});
