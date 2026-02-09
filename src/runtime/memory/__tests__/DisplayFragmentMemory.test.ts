import { describe, it, expect, beforeEach } from 'bun:test';
import { DisplayFragmentMemory } from '../DisplayFragmentMemory';
import { FragmentMemory } from '../FragmentMemory';
import { FragmentType, ICodeFragment, FragmentOrigin } from '../../../core/models/CodeFragment';

/**
 * Helper to create a minimal ICodeFragment for testing.
 */
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

describe('DisplayFragmentMemory', () => {
    describe('construction', () => {
        it('creates with empty state when no source', () => {
            const display = new DisplayFragmentMemory('test-1');
            expect(display.id).toBe('test-1');
            expect(display.value.fragments).toEqual([]);
            expect(display.value.resolved).toEqual([]);
            expect(display.rawFragments).toEqual([]);
        });

        it('initializes from FragmentMemory groups', () => {
            const source = new FragmentMemory([
                [frag(FragmentType.Timer, 'parser', 300)],
                [frag(FragmentType.Rep, 'parser', 21)],
            ]);
            const display = new DisplayFragmentMemory('test-2', source);

            expect(display.value.fragments).toHaveLength(2);
            expect(display.value.resolved).toHaveLength(2);
            expect(display.rawFragments).toHaveLength(2);
        });

        it('applies precedence resolution on construction', () => {
            const source = new FragmentMemory([
                [
                    frag(FragmentType.Timer, 'parser', 'plan'),
                    frag(FragmentType.Timer, 'runtime', 'actual'),
                ],
            ]);
            const display = new DisplayFragmentMemory('test-3', source);

            // Raw has both
            expect(display.value.fragments).toHaveLength(2);
            // Resolved keeps only runtime (higher precedence)
            expect(display.value.resolved).toHaveLength(1);
            expect(display.value.resolved[0].origin).toBe('runtime');
        });
    });

    describe('IFragmentSource interface', () => {
        let source: FragmentMemory;
        let display: DisplayFragmentMemory;

        beforeEach(() => {
            source = new FragmentMemory([
                [
                    frag(FragmentType.Timer, 'parser', 300),
                    frag(FragmentType.Timer, 'runtime', 45),
                ],
                [
                    frag(FragmentType.Rep, 'compiler', 21),
                    frag(FragmentType.Rep, 'compiler', 15),
                    frag(FragmentType.Rep, 'compiler', 9),
                    frag(FragmentType.Action, 'parser', 'Thrusters'),
                ],
            ]);
            display = new DisplayFragmentMemory('test-source', source);
        });

        it('getDisplayFragments returns precedence-resolved results', () => {
            const result = display.getDisplayFragments();
            const timer = result.find(f => f.fragmentType === FragmentType.Timer);
            expect(timer?.origin).toBe('runtime');
            expect(timer?.value).toBe(45);
        });

        it('getDisplayFragments respects filter', () => {
            const result = display.getDisplayFragments({
                types: [FragmentType.Rep],
            });
            expect(result).toHaveLength(3);
            expect(result.every(f => f.fragmentType === FragmentType.Rep)).toBe(true);
        });

        it('getDisplayFragments excludeTypes works', () => {
            const result = display.getDisplayFragments({
                excludeTypes: [FragmentType.Timer],
            });
            expect(result.some(f => f.fragmentType === FragmentType.Timer)).toBe(false);
            expect(result.length).toBeGreaterThan(0);
        });

        it('getFragment returns highest-precedence single fragment', () => {
            const timer = display.getFragment(FragmentType.Timer);
            expect(timer).toBeDefined();
            expect(timer!.origin).toBe('runtime');
            expect(timer!.value).toBe(45);
        });

        it('getFragment returns undefined for missing type', () => {
            expect(display.getFragment(FragmentType.Distance)).toBeUndefined();
        });

        it('getAllFragmentsByType returns all sorted by precedence', () => {
            const timers = display.getAllFragmentsByType(FragmentType.Timer);
            expect(timers).toHaveLength(2);
            // Runtime (tier 1) comes before parser (tier 3)
            expect(timers[0].origin).toBe('runtime');
            expect(timers[1].origin).toBe('parser');
        });

        it('getAllFragmentsByType returns empty for missing type', () => {
            expect(display.getAllFragmentsByType(FragmentType.Sound)).toEqual([]);
        });

        it('hasFragment returns true for existing type', () => {
            expect(display.hasFragment(FragmentType.Timer)).toBe(true);
            expect(display.hasFragment(FragmentType.Rep)).toBe(true);
            expect(display.hasFragment(FragmentType.Action)).toBe(true);
        });

        it('hasFragment returns false for missing type', () => {
            expect(display.hasFragment(FragmentType.Distance)).toBe(false);
            expect(display.hasFragment(FragmentType.Sound)).toBe(false);
        });

        it('rawFragments returns all unresolved fragments', () => {
            const raw = display.rawFragments;
            expect(raw).toHaveLength(6); // 2 timers + 3 reps + 1 action
        });
    });

    describe('reactive sync with FragmentMemory', () => {
        it('updates when source FragmentMemory changes', () => {
            const source = new FragmentMemory([
                [frag(FragmentType.Timer, 'parser', 300)],
            ]);
            const display = new DisplayFragmentMemory('reactive-1', source);
            expect(display.value.fragments).toHaveLength(1);

            // Add a runtime timer to the source
            source.addFragment(frag(FragmentType.Timer, 'runtime', 45), 0);

            // Display should auto-update
            expect(display.value.fragments).toHaveLength(2);
            expect(display.value.resolved).toHaveLength(1);
            expect(display.value.resolved[0].origin).toBe('runtime');
        });

        it('updates when source adds a new group', () => {
            const source = new FragmentMemory([
                [frag(FragmentType.Timer, 'parser', 300)],
            ]);
            const display = new DisplayFragmentMemory('reactive-2', source);
            expect(display.rawFragments).toHaveLength(1);

            source.addGroup([
                frag(FragmentType.Rep, 'compiler', 21),
                frag(FragmentType.Rep, 'compiler', 15),
            ]);

            expect(display.rawFragments).toHaveLength(3);
            expect(display.hasFragment(FragmentType.Rep)).toBe(true);
        });

        it('clears when source clears', () => {
            const source = new FragmentMemory([
                [frag(FragmentType.Timer, 'parser', 300)],
            ]);
            const display = new DisplayFragmentMemory('reactive-3', source);
            expect(display.rawFragments).toHaveLength(1);

            source.clear();
            expect(display.rawFragments).toEqual([]);
            expect(display.value.resolved).toEqual([]);
        });
    });

    describe('mutation API', () => {
        it('addFragment appends and re-resolves', () => {
            const display = new DisplayFragmentMemory('mutate-1');
            display.addFragment(frag(FragmentType.Timer, 'parser', 300));
            expect(display.rawFragments).toHaveLength(1);

            display.addFragment(frag(FragmentType.Timer, 'runtime', 45));
            expect(display.rawFragments).toHaveLength(2);
            expect(display.value.resolved).toHaveLength(1);
            expect(display.value.resolved[0].origin).toBe('runtime');
        });

        it('setFragments replaces all and re-resolves', () => {
            const display = new DisplayFragmentMemory('mutate-2');
            display.addFragment(frag(FragmentType.Timer, 'parser', 300));

            display.setFragments([
                frag(FragmentType.Rep, 'compiler', 21),
                frag(FragmentType.Action, 'parser', 'Run'),
            ]);

            expect(display.rawFragments).toHaveLength(2);
            expect(display.hasFragment(FragmentType.Timer)).toBe(false);
            expect(display.hasFragment(FragmentType.Rep)).toBe(true);
        });
    });

    describe('dispose', () => {
        it('disposes cleanly and unsubscribes from source', () => {
            const source = new FragmentMemory([
                [frag(FragmentType.Timer, 'parser', 300)],
            ]);
            const display = new DisplayFragmentMemory('dispose-1', source);

            display.dispose();

            // After dispose, source changes should not update display
            // (no errors thrown, just no update)
            source.addFragment(frag(FragmentType.Rep, 'parser', 10), 0);
            // Display still has old data (or undefined after dispose)
        });

        it('can be called multiple times safely', () => {
            const display = new DisplayFragmentMemory('dispose-2');
            display.dispose();
            display.dispose(); // Should not throw
        });
    });

    describe('subscription', () => {
        it('notifies subscribers on updates', () => {
            const display = new DisplayFragmentMemory('sub-1');
            const updates: unknown[] = [];

            display.subscribe((newVal) => {
                if (newVal) updates.push(newVal);
            });

            display.addFragment(frag(FragmentType.Timer, 'parser', 300));
            display.addFragment(frag(FragmentType.Rep, 'compiler', 21));

            expect(updates).toHaveLength(2);
        });

        it('unsubscribe stops notifications', () => {
            const display = new DisplayFragmentMemory('sub-2');
            const updates: unknown[] = [];

            const unsub = display.subscribe((newVal) => {
                if (newVal) updates.push(newVal);
            });

            display.addFragment(frag(FragmentType.Timer, 'parser', 300));
            unsub();
            display.addFragment(frag(FragmentType.Rep, 'compiler', 21));

            expect(updates).toHaveLength(1);
        });
    });
});
