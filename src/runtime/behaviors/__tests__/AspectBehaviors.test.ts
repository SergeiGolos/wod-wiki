import { describe, expect, it, vi } from 'bun:test';
import { TimerInitBehavior } from '../TimerInitBehavior';
import { TimerCompletionBehavior } from '../TimerCompletionBehavior';
import { RoundInitBehavior } from '../RoundInitBehavior';
import { RoundAdvanceBehavior } from '../RoundAdvanceBehavior';
import { RoundCompletionBehavior } from '../RoundCompletionBehavior';
import { DisplayInitBehavior } from '../DisplayInitBehavior';
import { PopOnEventBehavior } from '../PopOnEventBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: []
        },
        clock: { now: new Date(1000) }, // 1 second epoch
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => memoryStore.get(type)),
        setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
        ...overrides
    } as unknown as IBehaviorContext;
}

describe('Time Aspect Behaviors', () => {
    describe('TimerInitBehavior', () => {
        it('should initialize timer state on mount', () => {
             const ctx = createMockContext();
            const behavior = new TimerInitBehavior({
                direction: 'down',
                durationMs: 30000,
                label: 'Work Timer'
            });

            behavior.onMount(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('timer', expect.objectContaining({
                direction: 'down',
                durationMs: 30000,
                label: 'Work Timer'
            }));
        });

        it('should initialize timer memory with open span (signals timer started)', () => {
            const ctx = createMockContext();
            const behavior = new TimerInitBehavior({ direction: 'up' });

            behavior.onMount(ctx);

            // Timer start is signaled by timer memory with an open span
            expect(ctx.setMemory).toHaveBeenCalledWith('timer', expect.objectContaining({
                direction: 'up',
                spans: expect.arrayContaining([expect.objectContaining({ started: expect.any(Number) })])
            }));
            // No event emission - timer start is implicit from memory
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('TimerCompletionBehavior', () => {
        it('should subscribe to tick events', () => {
            const ctx = createMockContext();
            const behavior = new TimerCompletionBehavior();

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function));
        });
    });
});

describe('Iteration Aspect Behaviors', () => {
    describe('RoundInitBehavior', () => {
        it('should initialize round state with defaults', () => {
            const ctx = createMockContext();
            const behavior = new RoundInitBehavior();

            behavior.onMount(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('round', {
                current: 1,
                total: undefined
            });
        });

        it('should initialize with custom config', () => {
            const ctx = createMockContext();
            const behavior = new RoundInitBehavior({
                totalRounds: 5,
                startRound: 2
            });

            behavior.onMount(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('round', {
                current: 2,
                total: 5
            });
        });
    });

    describe('RoundAdvanceBehavior', () => {
        it('should advance round on next', () => {
            const memoryStore = new Map<string, any>();
            memoryStore.set('round', { current: 2, total: 5 });

            const ctx = createMockContext({
                getMemory: vi.fn((type: string) => memoryStore.get(type)),
                setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value))
            });

            const behavior = new RoundAdvanceBehavior();
            behavior.onNext(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('round', {
                current: 3,
                total: 5
            });
        });

        it('should update round memory (no event emission)', () => {
            const memoryStore = new Map<string, any>();
            memoryStore.set('round', { current: 1, total: 3 });

            const ctx = createMockContext({
                getMemory: vi.fn((type: string) => memoryStore.get(type))
            });

            const behavior = new RoundAdvanceBehavior();
            behavior.onNext(ctx);

            // Round advancement is signaled by memory update, no event
            expect(ctx.setMemory).toHaveBeenCalledWith('round', { current: 2, total: 3 });
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('RoundCompletionBehavior', () => {
        it('should mark complete when rounds exceeded', () => {
            const memoryStore = new Map<string, any>();
            memoryStore.set('round', { current: 4, total: 3 }); // current > total

            const ctx = createMockContext({
                getMemory: vi.fn((type: string) => memoryStore.get(type))
            });

            const behavior = new RoundCompletionBehavior();
            behavior.onNext(ctx);

            expect(ctx.markComplete).toHaveBeenCalledWith('rounds-complete');
        });

        it('should not mark complete when rounds remaining', () => {
            const memoryStore = new Map<string, any>();
            memoryStore.set('round', { current: 2, total: 3 }); // current <= total

            const ctx = createMockContext({
                getMemory: vi.fn((type: string) => memoryStore.get(type))
            });

            const behavior = new RoundCompletionBehavior();
            behavior.onNext(ctx);

            expect(ctx.markComplete).not.toHaveBeenCalled();
        });
    });
});

describe('Display Aspect Behaviors', () => {
    describe('DisplayInitBehavior', () => {
        it('should initialize display state', () => {
            const ctx = createMockContext();
            const behavior = new DisplayInitBehavior({
                mode: 'countdown',
                label: 'Rest'
            });

            behavior.onMount(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('display', expect.objectContaining({
                mode: 'countdown',
                label: 'Rest'
            }));
        });

        it('should use block label as default', () => {
            const ctx = createMockContext();
            const behavior = new DisplayInitBehavior();

            behavior.onMount(ctx);

            expect(ctx.setMemory).toHaveBeenCalledWith('display', expect.objectContaining({
                label: 'Test Block'
            }));
        });
    });
});

describe('Completion Aspect Behaviors', () => {
    describe('PopOnEventBehavior', () => {
        it('should subscribe to specified event types', () => {
            const ctx = createMockContext();
            const behavior = new PopOnEventBehavior(['timer:complete', 'user:skip']);

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        });
    });
});

describe('Controls Aspect Behaviors', () => {
    describe('ControlsInitBehavior', () => {
        it('should emit controls:init event on mount', async () => {
            const { ControlsInitBehavior } = await import('../ControlsInitBehavior');
            const ctx = createMockContext();
            const behavior = new ControlsInitBehavior({
                buttons: [
                    { id: 'next', label: 'Next', variant: 'primary', visible: true, enabled: true }
                ]
            });

            behavior.onMount(ctx);

            expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'controls:init',
                data: expect.objectContaining({
                    buttons: expect.arrayContaining([
                        expect.objectContaining({ id: 'next' })
                    ])
                })
            }));
        });

        it('should emit controls:cleanup on unmount', async () => {
            const { ControlsInitBehavior } = await import('../ControlsInitBehavior');
            const ctx = createMockContext();
            const behavior = new ControlsInitBehavior({ buttons: [] });

            behavior.onUnmount(ctx);

            expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'controls:cleanup'
            }));
        });
    });
});

describe('Output Aspect Behaviors', () => {
    describe('HistoryRecordBehavior', () => {
        it('should emit history:record event on unmount', async () => {
            const { HistoryRecordBehavior } = await import('../HistoryRecordBehavior');
            const ctx = createMockContext();
            const behavior = new HistoryRecordBehavior();

            behavior.onUnmount(ctx);

            expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'history:record',
                data: expect.objectContaining({
                    blockKey: 'test-block'
                })
            }));
        });
    });

    describe('SoundCueBehavior', () => {
        it('should emit sound:play on mount for mount triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });

            behavior.onMount(ctx);

            expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'sound:play',
                data: expect.objectContaining({
                    sound: 'start-beep'
                })
            }));
        });

        it('should subscribe to tick for countdown cues', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }]
            });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function));
        });

        it('should emit sound:play on unmount for complete triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'complete-chime', trigger: 'complete' }]
            });

            behavior.onUnmount(ctx);

            expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'sound:play',
                data: expect.objectContaining({
                    sound: 'complete-chime'
                })
            }));
        });
    });

    describe('TimerPauseBehavior', () => {
        it('should subscribe to pause and resume events', async () => {
            const { TimerPauseBehavior } = await import('../TimerPauseBehavior');
            const ctx = createMockContext();
            const behavior = new TimerPauseBehavior();

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        });
    });
});
