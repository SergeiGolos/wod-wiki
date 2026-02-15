import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { RoundInitBehavior } from '../RoundInitBehavior';
import { RoundAdvanceBehavior } from '../RoundAdvanceBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';
import { MemoryLocation, IMemoryLocation } from '../../memory/MemoryLocation';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { PromoteFragmentBehavior } from '../PromoteFragmentBehavior';

// --- Test Context Setup ---

function createMockContext(overrides: any = {}): IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> } {
    const memoryStore = new Map<string, IMemoryLocation[]>();

    const pushMemory = vi.fn((tag: string, fragments: ICodeFragment[]) => {
        const loc = new MemoryLocation(tag as any, fragments);
        const existing = memoryStore.get(tag) || [];
        existing.push(loc);
        memoryStore.set(tag, existing);
        return loc;
    });

    const updateMemory = vi.fn((tag: string, fragments: ICodeFragment[]) => {
        const matching = memoryStore.get(tag);
        if (matching && matching.length > 0) {
            matching[0].update(fragments);
        }
    });

    const getMemoryByTag = vi.fn((tag: string) => memoryStore.get(tag) || []);

    // Add getFragmentMemoryByVisibility stub if needed
    const getFragmentMemoryByVisibility = vi.fn((visibility: string) => {
        if (visibility === 'promote') {
            return memoryStore.get('fragment:promote') || [];
        }
        return [];
    });

    const mockBlock = {
        key: { toString: () => 'test-block' },
        getMemoryByTag,
        getFragmentMemoryByVisibility,
        getAllMemory: vi.fn(() => Array.from(memoryStore.values()).flat()),
        getBehavior: vi.fn(), // Placeholder
    };

    if (overrides.childRunner) {
        mockBlock.getBehavior.mockImplementation((type) => {
            if (type === ChildRunnerBehavior) return overrides.childRunner;
            return undefined;
        });
    }

    return {
        block: mockBlock as unknown as IRuntimeBlock,
        clock: { now: new Date(1000) },
        stackLevel: 0,
        pushMemory,
        updateMemory,
        memoryStore,
        // ... other unused methods mocked/stubbed
    } as unknown as IBehaviorContext & { memoryStore: Map<string, IMemoryLocation[]> };
}

describe('Round Promotion', () => {

    describe('PromoteFragmentBehavior', () => {
        it('should promote fragment from source tag to "fragment:promote"', () => {
            const ctx = createMockContext();

            // Seed a source fragment
            const roundFragment = {
                fragmentType: FragmentType.Rounds,
                value: { current: 1, total: 5 },
                origin: 'runtime',
                type: 'rounds'
            } as any;
            ctx.pushMemory('round', [roundFragment]);

            const behavior = new PromoteFragmentBehavior({
                fragmentType: FragmentType.Rounds,
                sourceTag: 'round'
            });

            behavior.onMount(ctx);

            // Verify promotion
            const promoted = ctx.memoryStore.get('fragment:promote');
            expect(promoted).toBeDefined();
            expect(promoted!.length).toBe(1);

            const promotedFrag = promoted![0].fragments[0];
            expect(promotedFrag.fragmentType).toBe(FragmentType.Rounds);
            expect(promotedFrag.value).toEqual({ current: 1, total: 5 });
            expect(promotedFrag.origin).toBe('execution'); // Default origin
        });

        it('should update promoted fragment on next() when dynamic updates enabled', () => {
            const ctx = createMockContext();

            // Seed initial state
            const roundLoc = ctx.pushMemory('round', [{
                fragmentType: FragmentType.Rounds,
                value: { current: 1, total: 5 },
                origin: 'runtime',
                type: 'rounds'
            } as any]);

            const behavior = new PromoteFragmentBehavior({
                fragmentType: FragmentType.Rounds,
                sourceTag: 'round',
                enableDynamicUpdates: true
            });

            behavior.onMount(ctx);

            // Change source state
            roundLoc.update([{
                fragmentType: FragmentType.Rounds,
                value: { current: 2, total: 5 },
                origin: 'runtime',
                type: 'rounds'
            } as any]);

            // Execute onNext
            behavior.onNext(ctx);

            // Verify update
            const promoted = ctx.memoryStore.get('fragment:promote');
            expect(promoted![0].fragments[0].value).toEqual({ current: 2, total: 5 });
        });
    });
});
