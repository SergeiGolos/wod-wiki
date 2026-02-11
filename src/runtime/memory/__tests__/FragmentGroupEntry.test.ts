import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { FragmentGroupStore } from '../FragmentGroupStore';
import { FragmentGroupEntry } from '../FragmentGroupEntry';

describe('FragmentGroupEntry', () => {
    let store: FragmentGroupStore;

    beforeEach(() => {
        store = new FragmentGroupStore();
    });

    describe('IMemoryEntry interface', () => {
        it('should expose correct type', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            const entry = new FragmentGroupEntry('timer', store, 'timer');

            expect(entry.type).toBe('timer');
        });

        it('should read value from store', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            const entry = new FragmentGroupEntry('timer', store, 'timer');

            expect(entry.value).toEqual({ elapsed: 5000 });
        });

        it('should reflect store updates via value getter', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            const entry = new FragmentGroupEntry('timer', store, 'timer');

            expect(entry.value).toEqual({ elapsed: 5000 });

            store.upsert('timer', { elapsed: 10000 }, 'private');
            expect(entry.value).toEqual({ elapsed: 10000 });
        });

        it('should subscribe to store group changes', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            const entry = new FragmentGroupEntry('timer', store, 'timer');

            const listener = vi.fn();
            entry.subscribe(listener);

            store.upsert('timer', { elapsed: 10000 }, 'private');

            expect(listener).toHaveBeenCalledWith({ elapsed: 10000 }, { elapsed: 5000 });
        });

        it('should unsubscribe correctly', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            const entry = new FragmentGroupEntry('timer', store, 'timer');

            const listener = vi.fn();
            const unsub = entry.subscribe(listener);

            store.upsert('timer', { elapsed: 10000 }, 'private');
            expect(listener).toHaveBeenCalledTimes(1);

            unsub();
            store.upsert('timer', { elapsed: 15000 }, 'private');
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should notify with undefined when group is removed', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            const entry = new FragmentGroupEntry('timer', store, 'timer');

            const listener = vi.fn();
            entry.subscribe(listener);

            store.remove('timer');

            expect(listener).toHaveBeenCalledWith(undefined, { elapsed: 5000 });
        });

        it('should return undefined value when group does not exist', () => {
            const entry = new FragmentGroupEntry('timer', store, 'timer');
            expect(entry.value).toBeUndefined();
        });
    });

    describe('multiple entries for different groups', () => {
        it('should not cross-contaminate subscriptions', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.upsert('round', { current: 1 }, 'private');

            const timerEntry = new FragmentGroupEntry('timer', store, 'timer');
            const roundEntry = new FragmentGroupEntry('round', store, 'round');

            const timerListener = vi.fn();
            const roundListener = vi.fn();

            timerEntry.subscribe(timerListener);
            roundEntry.subscribe(roundListener);

            store.upsert('timer', { elapsed: 10000 }, 'private');

            expect(timerListener).toHaveBeenCalledTimes(1);
            expect(roundListener).not.toHaveBeenCalled();
        });
    });
});
