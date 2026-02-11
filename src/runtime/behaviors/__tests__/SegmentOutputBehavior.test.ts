import { describe, it, expect, vi } from 'bun:test';
import { SegmentOutputBehavior } from '../SegmentOutputBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryStore = new Map<string, any>();

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Default Label',
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

describe('SegmentOutputBehavior', () => {
    describe('onMount', () => {
        it('should emit segment output on mount', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'segment',
                expect.any(Array),
                expect.objectContaining({ label: 'Default Label' })
            );
        });

        it('should use custom label when provided', () => {
            const behavior = new SegmentOutputBehavior({ label: 'My Workout' });
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'segment',
                expect.any(Array),
                expect.objectContaining({ label: 'My Workout' })
            );
        });

        it('should fall back to block label when no custom label', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onMount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'segment',
                expect.any(Array),
                expect.objectContaining({ label: 'Default Label' })
            );
        });
    });

    describe('onNext', () => {
        it('should return no actions on next', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();
            const actions = behavior.onNext(ctx);
            expect(actions).toEqual([]);
        });

        it('should not emit any output on next', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();
            behavior.onNext(ctx);
            expect(ctx.emitOutput).not.toHaveBeenCalled();
        });
    });

    describe('onUnmount', () => {
        it('should emit completion output on unmount', () => {
            const behavior = new SegmentOutputBehavior();
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'completion',
                expect.any(Array),
                expect.objectContaining({ label: 'Default Label' })
            );
        });

        it('should use custom label on unmount', () => {
            const behavior = new SegmentOutputBehavior({ label: 'Session Done' });
            const ctx = createMockContext();

            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'completion',
                expect.any(Array),
                expect.objectContaining({ label: 'Session Done' })
            );
        });
    });

    describe('paired output', () => {
        it('should emit segment on mount and completion on unmount', () => {
            const behavior = new SegmentOutputBehavior({ label: 'Workout' });
            const ctx = createMockContext();

            behavior.onMount(ctx);
            behavior.onUnmount(ctx);

            expect(ctx.emitOutput).toHaveBeenCalledTimes(2);
            expect(ctx.emitOutput).toHaveBeenNthCalledWith(1,
                'segment', expect.any(Array), expect.objectContaining({ label: 'Workout' })
            );
            expect(ctx.emitOutput).toHaveBeenNthCalledWith(2,
                'completion', expect.any(Array), expect.objectContaining({ label: 'Workout' })
            );
        });
    });
});
