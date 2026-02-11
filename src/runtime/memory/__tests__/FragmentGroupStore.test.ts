import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { FragmentGroupStore } from '../FragmentGroupStore';

describe('FragmentGroupStore', () => {
    let store: FragmentGroupStore;

    beforeEach(() => {
        store = new FragmentGroupStore();
    });

    describe('basic operations', () => {
        it('should start empty', () => {
            expect(store.keys()).toEqual([]);
            expect(store.all()).toEqual([]);
            expect(store.has('timer')).toBe(false);
            expect(store.get('timer')).toBeUndefined();
        });

        it('should upsert and retrieve a group', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');

            expect(store.has('timer')).toBe(true);
            expect(store.get('timer')).toEqual({ elapsed: 5000 });
            expect(store.keys()).toEqual(['timer']);
        });

        it('should retrieve group with metadata', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            const group = store.getGroup('timer');

            expect(group).toBeDefined();
            expect(group!.id).toBe('timer');
            expect(group!.value).toEqual({ elapsed: 5000 });
            expect(group!.visibility).toBe('private');
        });

        it('should overwrite on upsert', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.upsert('timer', { elapsed: 10000 }, 'private');

            expect(store.get('timer')).toEqual({ elapsed: 10000 });
            expect(store.keys()).toHaveLength(1);
        });

        it('should handle multiple groups', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.upsert('round', { current: 2 }, 'private');
            store.upsert('display', { label: 'Test' }, 'public');

            expect(store.keys()).toHaveLength(3);
            expect(store.all()).toHaveLength(3);
        });

        it('should default visibility to public', () => {
            store.upsert('timer', { elapsed: 5000 });

            expect(store.getGroup('timer')!.visibility).toBe('public');
        });
    });

    describe('public() filter', () => {
        it('should return only public groups', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.upsert('display', { label: 'Test' }, 'public');
            store.upsert('controls', { buttons: [] }, 'public');

            const publicGroups = store.public();
            expect(publicGroups).toHaveLength(2);
            expect(publicGroups.map(g => g.id)).toContain('display');
            expect(publicGroups.map(g => g.id)).toContain('controls');
        });
    });

    describe('remove', () => {
        it('should remove a group', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.remove('timer');

            expect(store.has('timer')).toBe(false);
            expect(store.get('timer')).toBeUndefined();
        });

        it('should be a no-op for non-existent groups', () => {
            expect(() => store.remove('nonexistent')).not.toThrow();
        });
    });

    describe('clear', () => {
        it('should remove all groups', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.upsert('round', { current: 2 }, 'private');
            store.clear();

            expect(store.keys()).toEqual([]);
            expect(store.all()).toEqual([]);
        });
    });

    describe('per-group subscriptions', () => {
        it('should notify on upsert', () => {
            const listener = vi.fn();
            store.subscribeGroup('timer', listener);

            store.upsert('timer', { elapsed: 5000 }, 'private');

            expect(listener).toHaveBeenCalledWith({ elapsed: 5000 }, undefined);
        });

        it('should notify with old value on update', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');

            const listener = vi.fn();
            store.subscribeGroup('timer', listener);

            store.upsert('timer', { elapsed: 10000 }, 'private');

            expect(listener).toHaveBeenCalledWith({ elapsed: 10000 }, { elapsed: 5000 });
        });

        it('should notify with undefined on remove', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');

            const listener = vi.fn();
            store.subscribeGroup('timer', listener);

            store.remove('timer');

            expect(listener).toHaveBeenCalledWith(undefined, { elapsed: 5000 });
        });

        it('should unsubscribe correctly', () => {
            const listener = vi.fn();
            const unsub = store.subscribeGroup('timer', listener);

            store.upsert('timer', { elapsed: 5000 }, 'private');
            expect(listener).toHaveBeenCalledTimes(1);

            unsub();
            store.upsert('timer', { elapsed: 10000 }, 'private');
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should not notify listeners for other groups', () => {
            const timerListener = vi.fn();
            store.subscribeGroup('timer', timerListener);

            store.upsert('round', { current: 2 }, 'private');

            expect(timerListener).not.toHaveBeenCalled();
        });
    });

    describe('global subscriptions', () => {
        it('should notify on any upsert', () => {
            const listener = vi.fn();
            store.subscribe(listener);

            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.upsert('round', { current: 2 }, 'private');

            expect(listener).toHaveBeenCalledTimes(2);
        });

        it('should notify on remove', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');

            const listener = vi.fn();
            store.subscribe(listener);

            store.remove('timer');

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should notify on clear', () => {
            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.upsert('round', { current: 2 }, 'private');

            const listener = vi.fn();
            store.subscribe(listener);

            store.clear();

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should unsubscribe correctly', () => {
            const listener = vi.fn();
            const unsub = store.subscribe(listener);

            store.upsert('timer', { elapsed: 5000 }, 'private');
            expect(listener).toHaveBeenCalledTimes(1);

            unsub();
            store.upsert('round', { current: 2 }, 'private');
            expect(listener).toHaveBeenCalledTimes(1);
        });
    });

    describe('dispose', () => {
        it('should clear all groups and listeners', () => {
            const groupListener = vi.fn();
            const globalListener = vi.fn();

            store.upsert('timer', { elapsed: 5000 }, 'private');
            store.subscribeGroup('timer', groupListener);
            store.subscribe(globalListener);

            // Dispose notifies listeners about removal
            store.dispose();

            expect(store.keys()).toEqual([]);

            // After dispose, new upserts should not notify old listeners
            store.upsert('timer', { elapsed: 10000 }, 'private');
            // groupListener was called once during dispose (with undefined)
            // but should not be called again after dispose clears listeners
            expect(groupListener).toHaveBeenCalledTimes(1);
        });
    });
});
