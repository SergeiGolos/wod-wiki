import { describe, it, expect, vi } from 'bun:test';
import { FragmentType, ICodeFragment } from '../../../core/models/CodeFragment';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMemoryLocation, MemoryLocation } from '../../memory/MemoryLocation';
import { FragmentPromotionBehavior } from '../FragmentPromotionBehavior';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> } {
    const memoryStore = new Map<string, IMemoryLocation[]>();

    const pushMemory = vi.fn((tag: string, fragments: ICodeFragment[]) => {
        const location = new MemoryLocation(tag as any, fragments);
        const existing = memoryStore.get(tag) ?? [];
        existing.push(location);
        memoryStore.set(tag, existing);
        return location;
    });

    const updateMemory = vi.fn((tag: string, fragments: ICodeFragment[]) => {
        const existing = memoryStore.get(tag);
        if (!existing || existing.length === 0) {
            const location = new MemoryLocation(tag as any, fragments);
            memoryStore.set(tag, [location]);
            return;
        }

        existing[0].update(fragments);
    });

    const context: IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> } = {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            completionReason: undefined,
            getMemoryByTag: vi.fn((tag: string) => memoryStore.get(tag) ?? []),
            getAllMemory: vi.fn(() => Array.from(memoryStore.values()).flat()),
            getBehavior: vi.fn(),
        } as any,
        clock: { now: new Date('2024-01-01T00:00:00Z') },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((tag: string) => {
            const location = memoryStore.get(tag)?.[0];
            return location?.fragments[0]?.value;
        }),
        setMemory: vi.fn(),
        pushMemory,
        updateMemory,
        memoryStore,
        ...overrides
    } as any;

    return context;
}

describe('FragmentPromotionBehavior', () => {
    it('promotes fragment by type to fragment:promote memory', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1, total: 5 }
        } as ICodeFragment]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [{ fragmentType: FragmentType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments;
        expect(promoted).toBeDefined();
        expect(promoted?.[0].fragmentType).toBe(FragmentType.CurrentRound);
        expect(promoted?.[0].origin).toBe('execution');
    });

    it('uses configured origin override', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1 }
        } as ICodeFragment]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [{
                fragmentType: FragmentType.CurrentRound,
                sourceTag: 'round',
                origin: 'runtime'
            }]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments[0];
        expect(promoted?.origin).toBe('runtime');
    });

    it('skips promotion when source fragment is not found', () => {
        const ctx = createMockContext();
        const behavior = new FragmentPromotionBehavior({
            promotions: [{ fragmentType: FragmentType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);

        expect(ctx.memoryStore.get('fragment:promote')).toBeUndefined();
    });

    it('does not re-promote on next when enableDynamicUpdates is false', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1, total: 3 }
        } as ICodeFragment]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [{ fragmentType: FragmentType.CurrentRound, sourceTag: 'round' }]
        });

        behavior.onMount(ctx);
        roundLocation.update([{ 
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 2, total: 3 }
        } as ICodeFragment]);

        behavior.onNext(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments[0];
        expect(promoted?.value).toEqual({ current: 1, total: 3 });
    });

    it('re-promotes on next when enableDynamicUpdates is true', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1, total: 3 }
        } as ICodeFragment]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [{
                fragmentType: FragmentType.CurrentRound,
                sourceTag: 'round',
                enableDynamicUpdates: true
            }]
        });

        behavior.onMount(ctx);
        roundLocation.update([{ 
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 2, total: 3 }
        } as ICodeFragment]);

        behavior.onNext(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments[0];
        expect(promoted?.value).toEqual({ current: 2, total: 3 });
    });

    it('writes rep scheme to fragment:rep-target and updates on round change', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1, total: 3 }
        } as ICodeFragment]);

        const behavior = new FragmentPromotionBehavior({
            repScheme: [21, 15, 9],
            promotions: []
        });

        behavior.onMount(ctx);
        expect(ctx.memoryStore.get('fragment:rep-target')?.[0]?.fragments[0].value).toBe(21);

        roundLocation.update([{ 
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 2, total: 3 }
        } as ICodeFragment]);

        behavior.onNext(ctx);
        expect(ctx.memoryStore.get('fragment:rep-target')?.[0]?.fragments[0].value).toBe(15);
    });

    it('supports rep scheme round-robin and IRepSource methods', () => {
        const behavior = new FragmentPromotionBehavior({
            repScheme: [21, 15, 9],
            promotions: []
        });

        expect(behavior.getRepsForRound(1)).toBe(21);
        expect(behavior.getRepsForRound(2)).toBe(15);
        expect(behavior.getRepsForRound(3)).toBe(9);
        expect(behavior.getRepsForRound(4)).toBe(21);
        expect(behavior.repScheme).toEqual([21, 15, 9]);
    });

    it('handles multiple promotion rules without duplicate fragment types', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1, total: 2 }
        } as ICodeFragment]);
        ctx.pushMemory('fragment', [{
            fragmentType: FragmentType.Rep,
            type: 'rep',
            origin: 'parser',
            value: 10,
            image: '10'
        } as ICodeFragment]);

        const behavior = new FragmentPromotionBehavior({
            promotions: [
                { fragmentType: FragmentType.CurrentRound, sourceTag: 'round' },
                { fragmentType: FragmentType.Rep, sourceTag: 'fragment' }
            ]
        });

        behavior.onMount(ctx);

        const promoted = ctx.memoryStore.get('fragment:promote')?.[0]?.fragments ?? [];
        expect(promoted.filter(fragment => fragment.fragmentType === FragmentType.CurrentRound)).toHaveLength(1);
        expect(promoted.filter(fragment => fragment.fragmentType === FragmentType.Rep)).toHaveLength(1);
    });
});