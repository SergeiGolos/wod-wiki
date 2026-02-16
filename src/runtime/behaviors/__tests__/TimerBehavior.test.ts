import { describe, expect, it, vi } from 'bun:test';
import { TimerBehavior } from '../TimerBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { ICodeFragment } from '../../../core/models/CodeFragment';
import { IMemoryLocation, MemoryLocation, MemoryTag } from '../../memory/MemoryLocation';

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
        subscribe: vi.fn(() => () => {}),
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
        setMemory: vi.fn(),
        pushMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            const loc = new MemoryLocation(tag as MemoryTag, fragments);
            memoryLocations.push(loc);
            return loc;
        }),
        updateMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            const locs = memoryLocations.filter(l => l.tag === tag);
            if (locs.length > 0) {
                locs[0].update(fragments);
            } else {
                memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
            }
        }),
    } as unknown as IBehaviorContext;

    return { ...ctx, ...overrides } as IBehaviorContext;
}

describe('TimerBehavior', () => {
    it('initializes timer state on mount', () => {
        const ctx = createMockContext();
        const behavior = new TimerBehavior({ direction: 'down', durationMs: 30000, label: 'Work' });

        behavior.onMount(ctx);

        expect(ctx.pushMemory).toHaveBeenCalledWith('timer', expect.arrayContaining([
            expect.objectContaining({
                value: expect.objectContaining({
                    direction: 'down',
                    durationMs: 30000,
                    label: 'Work',
                    spans: expect.arrayContaining([expect.objectContaining({ started: expect.any(Number) })]),
                }),
            }),
        ]));
        expect(ctx.subscribe).toHaveBeenCalledTimes(2);
    });

    it('onNext rotates span boundary when running', () => {
        const ctx = createMockContext();
        const behavior = new TimerBehavior({ direction: 'up' });
        behavior.onMount(ctx);

        behavior.onNext(ctx);

        expect(ctx.updateMemory).toHaveBeenCalledWith('timer', expect.arrayContaining([
            expect.objectContaining({
                value: expect.objectContaining({
                    spans: expect.arrayContaining([expect.objectContaining({ ended: expect.any(Number) })]),
                }),
            }),
        ]));
    });

    it('onUnmount closes active span and writes elapsed/total to fragment:result', () => {
        const ctx = createMockContext();
        const behavior = new TimerBehavior({ direction: 'up' });
        behavior.onMount(ctx);

        behavior.onUnmount(ctx);

        expect(ctx.updateMemory).toHaveBeenCalledWith('timer', expect.any(Array));
        expect(ctx.pushMemory).toHaveBeenCalledWith('fragment:result', expect.arrayContaining([
            expect.objectContaining({ type: 'elapsed' }),
            expect.objectContaining({ type: 'total' }),
        ]));
    });
});
