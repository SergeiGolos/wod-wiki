import { describe, it, expect, vi } from 'bun:test';
import { FragmentType, ICodeFragment } from '../../../core/models/CodeFragment';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMemoryLocation, MemoryLocation, MemoryTag } from '../../memory/MemoryLocation';
import { LabelingBehavior } from '../LabelingBehavior';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryLocations: IMemoryLocation[] = [];

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Fallback Label',
            fragments: [],
            completionReason: undefined,
            getMemoryByTag: (tag: MemoryTag) => memoryLocations.filter(location => location.tag === tag),
            getAllMemory: () => [...memoryLocations],
            getBehavior: () => undefined,
        },
        clock: { now: new Date('2024-01-01T00:00:00Z') },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn(),
        setMemory: vi.fn(),
        pushMemory: vi.fn((tag: MemoryTag, fragments: ICodeFragment[]) => {
            const location = new MemoryLocation(tag, fragments);
            memoryLocations.push(location);
            return location;
        }),
        updateMemory: vi.fn((tag: MemoryTag, fragments: ICodeFragment[]) => {
            const location = memoryLocations.find(loc => loc.tag === tag);
            if (location) {
                location.update(fragments);
                return;
            }

            memoryLocations.push(new MemoryLocation(tag, fragments));
        }),
        ...overrides
    } as unknown as IBehaviorContext;
}

function getDisplayTextByRole(ctx: IBehaviorContext, role: string): string | undefined {
    const location = ctx.block.getMemoryByTag('display')[0];
    if (!location) return undefined;

    const fragment = location.fragments.find(fragment => {
        const value = fragment.value as { role?: string } | undefined;
        return value?.role === role;
    });

    return (fragment?.value as { text?: string } | undefined)?.text;
}

describe('LabelingBehavior', () => {
    it('sets label from config', () => {
        const ctx = createMockContext();
        const behavior = new LabelingBehavior({ label: 'Configured Label' });

        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'label')).toBe('Configured Label');
    });

    it('falls back to block.label when no config.label', () => {
        const ctx = createMockContext();
        const behavior = new LabelingBehavior();

        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'label')).toBe('Fallback Label');
    });

    it('sets subtitle fragment', () => {
        const ctx = createMockContext();
        const behavior = new LabelingBehavior({ subtitle: 'Warm-up' });

        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'subtitle')).toBe('Warm-up');
    });

    it('sets actionDisplay fragment', () => {
        const ctx = createMockContext();
        const behavior = new LabelingBehavior({ actionDisplay: 'Run' });

        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'action')).toBe('Run');
    });

    it('emits all configured labels into display memory on mount', () => {
        const ctx = createMockContext();
        const behavior = new LabelingBehavior({
            label: 'EMOM',
            subtitle: 'Every minute',
            actionDisplay: 'Burpees'
        });

        behavior.onMount(ctx);

        const location = ctx.block.getMemoryByTag('display')[0];
        expect(location).toBeDefined();
        expect(location.fragments).toHaveLength(3);
    });

    it('shows round display when round memory is present', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 2, total: 5 }
        }]);

        const behavior = new LabelingBehavior({ label: 'Rounds' });
        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'round')).toBe('Round 2 of 5');
    });

    it('skips round display when no round memory exists', () => {
        const ctx = createMockContext();
        const behavior = new LabelingBehavior({ label: 'Rounds' });

        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'round')).toBeUndefined();
    });

    it('formats unbounded rounds as "Round X"', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 3 }
        }]);

        const behavior = new LabelingBehavior({ label: 'AMRAP' });
        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'round')).toBe('Round 3');
    });

    it('updates round display on next()', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1, total: 3 }
        }]);

        const behavior = new LabelingBehavior({ label: 'Rounds' });
        behavior.onMount(ctx);

        roundLocation.update([{ 
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 2, total: 3 }
        }]);

        behavior.onNext(ctx);

        expect(getDisplayTextByRole(ctx, 'round')).toBe('Round 2 of 3');
    });

    it('does not accumulate duplicate round fragments', () => {
        const ctx = createMockContext();
        const roundLocation = ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1, total: 3 }
        }]);

        const behavior = new LabelingBehavior({ label: 'Rounds' });
        behavior.onMount(ctx);

        roundLocation.update([{ 
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 2, total: 3 }
        }]);
        behavior.onNext(ctx);

        roundLocation.update([{ 
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 3, total: 3 }
        }]);
        behavior.onNext(ctx);

        const display = ctx.block.getMemoryByTag('display')[0];
        const roundFragments = display.fragments.filter(fragment => {
            const value = fragment.value as { role?: string } | undefined;
            return value?.role === 'round';
        });

        expect(roundFragments).toHaveLength(1);
    });

    it('supports custom round formatter', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 2, total: 4 }
        }]);

        const behavior = new LabelingBehavior({
            roundFormat: (current, total) => `Set ${current}/${total ?? '?'}`
        });

        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'round')).toBe('Set 2/4');
    });

    it('respects showRoundDisplay=false even when round memory exists', () => {
        const ctx = createMockContext();
        ctx.pushMemory('round', [{
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            origin: 'runtime',
            value: { current: 1, total: 5 }
        }]);

        const behavior = new LabelingBehavior({ showRoundDisplay: false });
        behavior.onMount(ctx);

        expect(getDisplayTextByRole(ctx, 'round')).toBeUndefined();
    });
});