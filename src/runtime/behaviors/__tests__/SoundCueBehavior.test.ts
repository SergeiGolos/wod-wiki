import { describe, it, expect, vi } from 'bun:test';
import { SoundCueBehavior } from '../SoundCueBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: []
        },
        clock: { now: new Date(1000) },
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

describe('SoundCueBehavior', () => {
    describe('mount trigger', () => {
        it('should emit milestone output for mount trigger sounds', () => {
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'start-beep',
                        trigger: 'mount'
                    })
                ]),
                expect.any(Object)
            );
        });

        it('should not emit events (only outputs)', () => {
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });

        it('should not emit for non-mount triggers during mount', () => {
            const behavior = new SoundCueBehavior({
                cues: [
                    { sound: 'complete-chime', trigger: 'complete' },
                    { sound: 'unmount-beep', trigger: 'unmount' }
                ]
            });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).not.toHaveBeenCalled();
        });
    });

    describe('countdown trigger', () => {
        it('should subscribe to tick events for countdown cues', () => {
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }]
            });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith(
                'tick',
                expect.any(Function),
                { scope: 'bubble' }
            );
        });

        it('should not subscribe to tick when no countdown cues', () => {
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            // subscribe should not be called for tick (only mount trigger present)
            const subscribeCalls = (ctx.subscribe as any).mock.calls;
            const tickCalls = subscribeCalls.filter((c: any[]) => c[0] === 'tick');
            expect(tickCalls.length).toBe(0);
        });
    });

    describe('unmount/complete trigger', () => {
        it('should emit milestone output for complete trigger on unmount', () => {
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'complete-chime', trigger: 'complete' }]
            });
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'complete-chime',
                        trigger: 'complete'
                    })
                ]),
                expect.any(Object)
            );
        });

        it('should emit milestone output for unmount trigger on unmount', () => {
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'unmount-beep', trigger: 'unmount' }]
            });
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'unmount-beep',
                        trigger: 'unmount'
                    })
                ]),
                expect.any(Object)
            );
        });

        it('should emit multiple sound outputs if multiple cues match', () => {
            const behavior = new SoundCueBehavior({
                cues: [
                    { sound: 'complete-chime', trigger: 'complete' },
                    { sound: 'unmount-beep', trigger: 'unmount' }
                ]
            });
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledTimes(2);
        });

        it('should not emit mount triggers during unmount', () => {
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).not.toHaveBeenCalled();
        });
    });

    describe('onNext', () => {
        it('should return no actions on next', () => {
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'beep', trigger: 'mount' }]
            });
            const ctx = createMockContext();
            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
        });
    });

    describe('rest block sound cues', () => {
        it('should support rest-over complete cue', () => {
            const behavior = new SoundCueBehavior({
                cues: [
                    { sound: 'rest-over', trigger: 'complete' },
                    { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] }
                ]
            });
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'rest-over',
                        trigger: 'complete'
                    })
                ]),
                expect.any(Object)
            );
        });
    });
});
