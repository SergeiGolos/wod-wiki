import { describe, it, expect, vi } from 'bun:test';
import { ChildSelectionBehavior } from '../ChildSelectionBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { TimerState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

function createMockContext(overrides: {
    timerState?: TimerState;
    isComplete?: boolean;
    clockNow?: number;
} = {}): IBehaviorContext {
    const memoryStore = new Map<string, unknown>();
    if (overrides.timerState) {
        memoryStore.set('time', overrides.timerState);
    }

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            isComplete: overrides.isComplete ?? false,
            getMemoryByTag: () => [],
        },
        clock: { now: new Date(overrides.clockNow ?? 1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: unknown) => memoryStore.set(type, value)),
    } as unknown as IBehaviorContext;
}

describe('ChildSelectionBehavior', () => {
    it('dispatches first child on mount and writes children status', () => {
        const behavior = new ChildSelectionBehavior({ childGroups: [[1], [2]] });
        const ctx = createMockContext();

        const actions = behavior.onMount(ctx);

        expect(actions[0].type).toBe('compile-child-block');
        expect(actions[0].payload).toEqual({ statementIds: [1] });
        expect(actions[1].type).toBe('update-next-preview');
        expect(ctx.setMemory).toHaveBeenCalledWith('children:status', expect.objectContaining({
            childIndex: 1,
            totalChildren: 2,
            allExecuted: false,
            allCompleted: false,
        }));
    });

    it('supports skipOnMount and only sets next preview', () => {
        const behavior = new ChildSelectionBehavior({ childGroups: [[10]], skipOnMount: true });
        const ctx = createMockContext();

        const actions = behavior.onMount(ctx);

        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('update-next-preview');
        expect(ctx.setMemory).toHaveBeenCalledWith('children:status', expect.objectContaining({
            childIndex: 0,
            allExecuted: false,
        }));
    });

    it('dispatches next children in sequence on onNext', () => {
        const behavior = new ChildSelectionBehavior({ childGroups: [[1], [2], [3]] });
        const ctx = createMockContext();

        behavior.onMount(ctx);
        const actions = behavior.onNext(ctx);

        expect(actions[0].type).toBe('compile-child-block');
        expect(actions[0].payload).toEqual({ statementIds: [2] });
    });

    it('loops while countdown timer is active when configured', () => {
        const behavior = new ChildSelectionBehavior({
            childGroups: [[1]],
            loop: { condition: 'timer-active' },
        });
        const ctx = createMockContext({
            timerState: {
                direction: 'down',
                durationMs: 60000,
                spans: [new TimeSpan(0)],
                label: 'AMRAP',
                role: 'primary',
            },
            clockNow: 10000,
        });

        behavior.onMount(ctx); // dispatches child 1, index=1 (all executed)
        const actions = behavior.onNext(ctx);

        expect(actions[0].type).toBe('compile-child-block');
        expect(actions[0].payload).toEqual({ statementIds: [1] });
    });

    it('does not loop when countdown timer is expired', () => {
        const behavior = new ChildSelectionBehavior({
            childGroups: [[1]],
            loop: { condition: 'timer-active' },
        });
        const ctx = createMockContext({
            timerState: {
                direction: 'down',
                durationMs: 60000,
                spans: [new TimeSpan(0)],
                label: 'AMRAP',
                role: 'primary',
            },
            clockNow: 70000,
        });

        behavior.onMount(ctx);
        const actions = behavior.onNext(ctx);

        // Timer expired + loop enabled → marks complete
        expect(ctx.markComplete).toHaveBeenCalledWith('rounds-exhausted');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('update-next-preview');
    });

    it('injects rest between loop iterations when enabled', () => {
        const behavior = new ChildSelectionBehavior({
            childGroups: [[1]],
            loop: { condition: 'timer-active' },
            injectRest: true,
        });
        const ctx = createMockContext({
            timerState: {
                direction: 'down',
                durationMs: 60000,
                spans: [new TimeSpan(0)],
                label: 'EMOM',
                role: 'primary',
            },
            clockNow: 30000,
        });

        behavior.onMount(ctx);
        const actions = behavior.onNext(ctx);

        expect(actions[0].type).toBe('push-rest-block');
        expect(actions[0].payload).toEqual({ durationMs: 30000, label: 'Rest' });

        const afterRestActions = behavior.onNext(ctx);
        expect(afterRestActions[0].type).toBe('compile-child-block');
        expect(afterRestActions[0].payload).toEqual({ statementIds: [1] });
    });

    it('does not inject rest for count-up timers', () => {
        const behavior = new ChildSelectionBehavior({
            childGroups: [[1]],
            loop: { condition: 'timer-active' },
            injectRest: true,
        });
        const ctx = createMockContext({
            timerState: {
                direction: 'up',
                spans: [new TimeSpan(0)],
                label: 'Elapsed',
                role: 'primary',
            },
            clockNow: 10000,
        });

        behavior.onMount(ctx);
        const actions = behavior.onNext(ctx);

        expect(actions[0].type).toBe('compile-child-block');
    });
});
