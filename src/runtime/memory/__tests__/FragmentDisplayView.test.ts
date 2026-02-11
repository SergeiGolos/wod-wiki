import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { FragmentGroupStore } from '../FragmentGroupStore';
import { FragmentDisplayView, FragmentStateView } from '../FragmentDisplayView';
import { FragmentType, ICodeFragment, FragmentOrigin } from '../../../core/models/CodeFragment';

function frag(
    fragmentType: FragmentType,
    origin: FragmentOrigin = 'parser',
    value?: unknown
): ICodeFragment {
    return {
        type: fragmentType,
        fragmentType,
        origin,
        value,
    };
}

describe('FragmentDisplayView', () => {
    let store: FragmentGroupStore;

    beforeEach(() => {
        store = new FragmentGroupStore();
    });

    describe('construction', () => {
        it('creates with empty state when no fragment groups', () => {
            const view = new FragmentDisplayView('test-1', store, []);

            expect(view.id).toBe('test-1');
            expect(view.value.fragments).toEqual([]);
            expect(view.value.resolved).toEqual([]);
            expect(view.rawFragments).toEqual([]);
        });

        it('initializes from store fragment groups', () => {
            store.upsert('frag-0', [frag(FragmentType.Timer, 'parser', 300)], 'public');
            store.upsert('frag-1', [frag(FragmentType.Rep, 'parser', 21)], 'public');

            const view = new FragmentDisplayView('test-2', store, ['frag-0', 'frag-1']);

            expect(view.value.fragments).toHaveLength(2);
            expect(view.value.resolved).toHaveLength(2);
            expect(view.rawFragments).toHaveLength(2);
        });

        it('applies precedence resolution on construction', () => {
            store.upsert('frag-0', [
                frag(FragmentType.Timer, 'parser', 'plan'),
                frag(FragmentType.Timer, 'runtime', 'actual'),
            ], 'public');

            const view = new FragmentDisplayView('test-3', store, ['frag-0']);

            expect(view.value.fragments).toHaveLength(2);
            expect(view.value.resolved).toHaveLength(1);
            expect(view.value.resolved[0].origin).toBe('runtime');
        });
    });

    describe('IFragmentSource interface', () => {
        let view: FragmentDisplayView;

        beforeEach(() => {
            store.upsert('frag-0', [
                frag(FragmentType.Timer, 'parser', 300),
                frag(FragmentType.Timer, 'runtime', 45),
            ], 'public');
            store.upsert('frag-1', [
                frag(FragmentType.Rep, 'compiler', 21),
                frag(FragmentType.Rep, 'compiler', 15),
                frag(FragmentType.Rep, 'compiler', 9),
                frag(FragmentType.Action, 'parser', 'Thrusters'),
            ], 'public');
            view = new FragmentDisplayView('test-source', store, ['frag-0', 'frag-1']);
        });

        it('getDisplayFragments returns precedence-resolved results', () => {
            const result = view.getDisplayFragments();
            const timer = result.find(f => f.fragmentType === FragmentType.Timer);
            expect(timer?.origin).toBe('runtime');
            expect(timer?.value).toBe(45);
        });

        it('getDisplayFragments respects type filter', () => {
            const result = view.getDisplayFragments({ types: [FragmentType.Rep] });
            expect(result).toHaveLength(3);
            expect(result.every(f => f.fragmentType === FragmentType.Rep)).toBe(true);
        });

        it('getDisplayFragments excludeTypes works', () => {
            const result = view.getDisplayFragments({ excludeTypes: [FragmentType.Timer] });
            expect(result.some(f => f.fragmentType === FragmentType.Timer)).toBe(false);
            expect(result.length).toBeGreaterThan(0);
        });

        it('getFragment returns highest-precedence single fragment', () => {
            const timer = view.getFragment(FragmentType.Timer);
            expect(timer).toBeDefined();
            expect(timer!.origin).toBe('runtime');
            expect(timer!.value).toBe(45);
        });

        it('getFragment returns undefined for missing type', () => {
            expect(view.getFragment(FragmentType.Distance)).toBeUndefined();
        });

        it('getAllFragmentsByType returns all sorted by precedence', () => {
            const timers = view.getAllFragmentsByType(FragmentType.Timer);
            expect(timers).toHaveLength(2);
            expect(timers[0].origin).toBe('runtime');
            expect(timers[1].origin).toBe('parser');
        });

        it('getAllFragmentsByType returns empty for missing type', () => {
            expect(view.getAllFragmentsByType(FragmentType.Sound)).toEqual([]);
        });

        it('hasFragment returns true for existing type', () => {
            expect(view.hasFragment(FragmentType.Timer)).toBe(true);
            expect(view.hasFragment(FragmentType.Rep)).toBe(true);
            expect(view.hasFragment(FragmentType.Action)).toBe(true);
        });

        it('hasFragment returns false for missing type', () => {
            expect(view.hasFragment(FragmentType.Distance)).toBe(false);
            expect(view.hasFragment(FragmentType.Sound)).toBe(false);
        });

        it('rawFragments returns all unresolved fragments', () => {
            const raw = view.rawFragments;
            expect(raw).toHaveLength(6);
        });
    });

    describe('reactive updates', () => {
        it('updates when store group changes', () => {
            store.upsert('frag-0', [frag(FragmentType.Timer, 'parser', 300)], 'public');
            const view = new FragmentDisplayView('reactive-1', store, ['frag-0']);

            expect(view.value.fragments).toHaveLength(1);

            // Update the group with an additional fragment
            store.upsert('frag-0', [
                frag(FragmentType.Timer, 'parser', 300),
                frag(FragmentType.Timer, 'runtime', 45),
            ], 'public');

            expect(view.value.fragments).toHaveLength(2);
            expect(view.value.resolved).toHaveLength(1);
            expect(view.value.resolved[0].origin).toBe('runtime');
        });

        it('notifies subscribers on store changes', () => {
            store.upsert('frag-0', [frag(FragmentType.Timer, 'parser', 300)], 'public');
            const view = new FragmentDisplayView('reactive-2', store, ['frag-0']);

            const updates: unknown[] = [];
            view.subscribe((newVal) => {
                if (newVal) updates.push(newVal);
            });

            store.upsert('frag-0', [
                frag(FragmentType.Timer, 'parser', 300),
                frag(FragmentType.Action, 'parser', 'Run'),
            ], 'public');

            expect(updates).toHaveLength(1);
        });
    });

    describe('mutation API', () => {
        it('addFragment appends and re-resolves', () => {
            store.upsert('frag-0', [frag(FragmentType.Timer, 'parser', 300)], 'public');
            const view = new FragmentDisplayView('mutate-1', store, ['frag-0']);

            expect(view.rawFragments).toHaveLength(1);

            view.addFragment(frag(FragmentType.Timer, 'runtime', 45));
            expect(view.rawFragments).toHaveLength(2);
            expect(view.value.resolved).toHaveLength(1);
            expect(view.value.resolved[0].origin).toBe('runtime');
        });

        it('addFragment creates group when none exist', () => {
            const view = new FragmentDisplayView('mutate-2', store, []);

            view.addFragment(frag(FragmentType.Timer, 'parser', 300));
            expect(view.rawFragments).toHaveLength(1);
        });

        it('setFragments replaces all and re-resolves', () => {
            store.upsert('frag-0', [frag(FragmentType.Timer, 'parser', 300)], 'public');
            const view = new FragmentDisplayView('mutate-3', store, ['frag-0']);

            view.setFragments([
                frag(FragmentType.Rep, 'compiler', 21),
                frag(FragmentType.Action, 'parser', 'Run'),
            ]);

            expect(view.rawFragments).toHaveLength(2);
            expect(view.hasFragment(FragmentType.Timer)).toBe(false);
            expect(view.hasFragment(FragmentType.Rep)).toBe(true);
        });
    });

    describe('dispose', () => {
        it('disposes cleanly', () => {
            store.upsert('frag-0', [frag(FragmentType.Timer, 'parser', 300)], 'public');
            const view = new FragmentDisplayView('dispose-1', store, ['frag-0']);

            view.dispose();
            // Should not throw
            view.dispose();
        });
    });
});

describe('FragmentStateView', () => {
    let store: FragmentGroupStore;

    beforeEach(() => {
        store = new FragmentGroupStore();
    });

    it('returns empty groups when no fragment group ids', () => {
        const view = new FragmentStateView(store, []);
        expect(view.value.groups).toEqual([]);
    });

    it('returns groups from store', () => {
        store.upsert('frag-0', [frag(FragmentType.Timer, 'parser', 300)], 'public');
        store.upsert('frag-1', [frag(FragmentType.Rep, 'parser', 21)], 'public');

        const view = new FragmentStateView(store, ['frag-0', 'frag-1']);
        expect(view.value.groups).toHaveLength(2);
        expect(view.value.groups[0]).toHaveLength(1);
        expect(view.value.groups[1]).toHaveLength(1);
    });

    it('subscribes to store changes', () => {
        store.upsert('frag-0', [frag(FragmentType.Timer, 'parser', 300)], 'public');
        const view = new FragmentStateView(store, ['frag-0']);

        const listener = vi.fn();
        view.subscribe(listener);

        store.upsert('frag-0', [
            frag(FragmentType.Timer, 'parser', 300),
            frag(FragmentType.Action, 'parser', 'Run'),
        ], 'public');

        expect(listener).toHaveBeenCalled();
        const newValue = listener.mock.calls[0][0];
        expect(newValue.groups[0]).toHaveLength(2);
    });

    it('has correct type', () => {
        const view = new FragmentStateView(store, []);
        expect(view.type).toBe('fragment');
    });
});
