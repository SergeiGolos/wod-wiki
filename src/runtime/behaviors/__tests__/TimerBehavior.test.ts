import { describe, expect, it, vi } from 'bun:test';
import { CountdownTimerBehavior } from '../CountdownTimerBehavior';
import { CountupTimerBehavior } from '../CountupTimerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';
import { MemoryTag, MemoryLocation, IMemoryLocation } from '../../memory/MemoryLocation';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryLocations: IMemoryLocation[] = [];

    const ctx = {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            getMemoryByTag: (tag: MemoryTag) => memoryLocations.filter(l => l.tag === tag),
            pushMemory: (loc: IMemoryLocation) => memoryLocations.push(loc),
            getAllMemory: () => [...memoryLocations],
            getBehavior: () => undefined,
        },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(() => vi.fn()),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => {
            const locs = memoryLocations.filter(l => l.tag === type);
            if (locs.length > 0 && locs[0].fragments.length > 0) {
                return locs[0].fragments[0].value;
            }
            return undefined;
        }),
        setMemory: vi.fn((type: string, value: any) => {
            const locs = memoryLocations.filter(l => l.tag === type);
            if (locs.length > 0 && locs[0].fragments.length > 0) {
                (locs[0].fragments[0] as any).value = value;
            }
        }),
        pushMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
        }),
        updateMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            const locs = memoryLocations.filter(l => l.tag === type);
            if (locs.length > 0) {
                locs[0].update(fragments);
            } else {
                memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
            }
        }),
    } as unknown as IBehaviorContext;

    return { ...ctx, ...overrides } as IBehaviorContext;
}

describe('CountdownTimerBehavior', () => {
    it('initializes timer state on mount with countdown direction', () => {
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ durationMs: 30000, label: 'Work' });

        behavior.onMount(ctx);

        expect(ctx.pushMemory).toHaveBeenCalledWith('time', expect.arrayContaining([
            expect.objectContaining({
                value: expect.objectContaining({
                    direction: 'down',
                    durationMs: 30000,
                    label: 'Work',
                    spans: expect.arrayContaining([expect.objectContaining({ started: expect.any(Number) })]),
                }),
            }),
        ]));
    });

    it('subscribes to tick, pause and resume events on mount', () => {
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ durationMs: 30000 });

        behavior.onMount(ctx);

        expect(ctx.subscribe).toHaveBeenCalledTimes(3);
        expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function), { scope: 'bubble' });
    });

    it('onNext is a no-op', () => {
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ durationMs: 30000 });
        behavior.onMount(ctx);

        const actions = behavior.onNext(ctx);

        expect(actions).toEqual([]);
    });

    it('onUnmount closes active span', () => {
        const ctx = createMockContext();
        const behavior = new CountdownTimerBehavior({ durationMs: 30000 });
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(5000);
        behavior.onUnmount(ctx);

        expect(ctx.setMemory).toHaveBeenCalledWith('time', expect.objectContaining({
            spans: expect.arrayContaining([
                expect.objectContaining({ ended: expect.any(Number) })
            ])
        }));
    });

    it('onDispose unsubscribes all listeners', () => {
        const unsubscribers: Array<ReturnType<typeof vi.fn>> = [];
        const ctx = createMockContext({
            subscribe: vi.fn(() => {
                const unsub = vi.fn();
                unsubscribers.push(unsub);
                return unsub;
            })
        });
        const behavior = new CountdownTimerBehavior({ durationMs: 30000 });
        behavior.onMount(ctx);
        expect(unsubscribers.length).toBe(3);

        behavior.onDispose(ctx);

        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});

describe('CountupTimerBehavior', () => {
    it('initializes timer state on mount with countup direction', () => {
        const ctx = createMockContext();
        const behavior = new CountupTimerBehavior({ label: 'Session' });

        behavior.onMount(ctx);

        expect(ctx.pushMemory).toHaveBeenCalledWith('time', expect.arrayContaining([
            expect.objectContaining({
                value: expect.objectContaining({
                    direction: 'up',
                    label: 'Session',
                    spans: expect.arrayContaining([expect.objectContaining({ started: expect.any(Number) })]),
                }),
            }),
        ]));
    });

    it('subscribes to pause and resume events on mount (no tick subscription)', () => {
        const ctx = createMockContext();
        const behavior = new CountupTimerBehavior();

        behavior.onMount(ctx);

        expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        expect(ctx.subscribe).not.toHaveBeenCalledWith('tick', expect.any(Function), expect.anything());
    });

    it('onNext is a no-op', () => {
        const ctx = createMockContext();
        const behavior = new CountupTimerBehavior();
        behavior.onMount(ctx);

        const actions = behavior.onNext(ctx);

        expect(actions).toEqual([]);
    });

    it('onUnmount closes active span', () => {
        const ctx = createMockContext();
        const behavior = new CountupTimerBehavior();
        behavior.onMount(ctx);

        (ctx.clock as any).now = new Date(10000);
        behavior.onUnmount(ctx);

        expect(ctx.setMemory).toHaveBeenCalledWith('time', expect.objectContaining({
            spans: expect.arrayContaining([
                expect.objectContaining({ ended: expect.any(Number) })
            ])
        }));
    });

    it('onDispose unsubscribes all listeners', () => {
        const unsubscribers: Array<ReturnType<typeof vi.fn>> = [];
        const ctx = createMockContext({
            subscribe: vi.fn(() => {
                const unsub = vi.fn();
                unsubscribers.push(unsub);
                return unsub;
            })
        });
        const behavior = new CountupTimerBehavior();
        behavior.onMount(ctx);
        expect(unsubscribers.length).toBe(2);

        behavior.onDispose(ctx);

        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
