import { describe, it, expect, vi } from 'bun:test';
import { ChildSelectionBehavior } from '../ChildSelectionBehavior';
import { CountdownTimerBehavior } from '../CountdownTimerBehavior';
import { IBehaviorContext } from '../../contracts/events/IEventHandler';
import { TimerState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

function createMockContext(overrides: {
    timerState?: TimerState;
    isComplete?: boolean;
    clockNow?: number;
    behaviors?: any[];
} = {}): any {
    const memoryStore = new Map<string, unknown>();
    if (overrides.timerState) {
        memoryStore.set('time', overrides.timerState);
    }

    const ctx = {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            isComplete: overrides.isComplete ?? false,
            getMemoryByTag: () => [],
            behaviors: overrides.behaviors ?? [],
        },
        clock: { now: new Date(overrides.clockNow ?? 1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: unknown) => {
            memoryStore.set(type, value);
        }),
        updateMemory: vi.fn((type: string, value: unknown) => {
             memoryStore.set(type, value);
        }),
        pushMemory: vi.fn((type: string, value: unknown) => {
             memoryStore.set(type, value);
        }),
    };
    return ctx;
}

describe('Reproduction: AMRAP Rest Injection', () => {
    it('should NOT inject an extra rest block when both ChildSelectionBehavior and CountdownTimerBehavior are present', () => {
        const amrapTimer = new CountdownTimerBehavior({
            durationMs: 600000, // 10 min
            label: 'AMRAP',
            restBlockFactory: (ms) => [{ type: 'push-rest-block', payload: { durationMs: ms } } as any]
        });
        
        const childSelection = new ChildSelectionBehavior({
            childGroups: [[101]],
            loop: { condition: 'timer-active' },
            injectRest: false, // AMRAP doesn't have rest between rounds
        });
        
        const behaviors = [amrapTimer, childSelection];
        const ctx = createMockContext({
            clockNow: 1000,
            behaviors: behaviors,
            timerState: {
                direction: 'down',
                durationMs: 600000,
                spans: [new TimeSpan(1000)],
                label: 'AMRAP',
                role: 'primary'
            }
        });

        // Simulating the AMRAP block onNext call
        // RuntimeBlock calls onNext for ALL behaviors
        
        console.log('--- Triggering onNext for AMRAP behaviors ---');
        const actions: any[] = [];
        
        // 1. First child finished, index was 1, all executed.
        (childSelection as any).childIndex = 1;
        
        // Simulate behavior chain call
        actions.push(...amrapTimer.onNext(ctx));
        actions.push(...childSelection.onNext(ctx));
        
        console.log('Combined Actions:', JSON.stringify(actions, null, 2));
        
        const restActions = actions.filter(a => a.type === 'push-rest-block');
        expect(restActions.length).toBe(0);
        
        const compileActions = actions.filter(a => a.type === 'compile-child-block');
        expect(compileActions.length).toBe(1);
    });
});
