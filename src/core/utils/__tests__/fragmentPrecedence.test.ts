import { describe, it, expect } from 'bun:test';
import { resolveFragmentPrecedence, selectBestTier, ORIGIN_PRECEDENCE } from '../fragmentPrecedence';
import { FragmentType, ICodeFragment, FragmentOrigin } from '../../models/CodeFragment';

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

describe('ORIGIN_PRECEDENCE', () => {
    it('maps user and collected to tier 0', () => {
        expect(ORIGIN_PRECEDENCE['user']).toBe(0);
        expect(ORIGIN_PRECEDENCE['collected']).toBe(0);
    });

    it('maps runtime, tracked, analyzed to tier 1', () => {
        expect(ORIGIN_PRECEDENCE['runtime']).toBe(1);
        expect(ORIGIN_PRECEDENCE['tracked']).toBe(1);
        expect(ORIGIN_PRECEDENCE['analyzed']).toBe(1);
    });

    it('maps compiler and hinted to tier 2', () => {
        expect(ORIGIN_PRECEDENCE['compiler']).toBe(2);
        expect(ORIGIN_PRECEDENCE['hinted']).toBe(2);
    });

    it('maps parser to tier 3', () => {
        expect(ORIGIN_PRECEDENCE['parser']).toBe(3);
    });
});

describe('selectBestTier', () => {
    it('returns single fragment when only one exists', () => {
        const fragments = [frag(FragmentType.Duration, 'parser')];
        const result = selectBestTier(fragments);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('parser');
    });

    it('selects highest precedence (lowest rank) tier', () => {
        const fragments = [
            frag(FragmentType.Duration, 'parser', 'plan'),
            frag(FragmentType.Duration, 'runtime', 'actual'),
        ];
        const result = selectBestTier(fragments);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('runtime');
        expect(result[0].value).toBe('actual');
    });

    it('user overrides everything', () => {
        const fragments = [
            frag(FragmentType.Rep, 'parser', 10),
            frag(FragmentType.Rep, 'compiler', 15),
            frag(FragmentType.Rep, 'runtime', 20),
            frag(FragmentType.Rep, 'user', 25),
        ];
        const result = selectBestTier(fragments);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('user');
        expect(result[0].value).toBe(25);
    });

    it('preserves multiple fragments in the winning tier', () => {
        const fragments = [
            frag(FragmentType.Rep, 'compiler', 21),
            frag(FragmentType.Rep, 'compiler', 15),
            frag(FragmentType.Rep, 'compiler', 9),
            frag(FragmentType.Rep, 'parser', 10),
        ];
        const result = selectBestTier(fragments);
        expect(result).toHaveLength(3);
        expect(result.every(f => f.origin === 'compiler')).toBe(true);
        expect(result.map(f => f.value)).toEqual([21, 15, 9]);
    });

    it('treats undefined origin as parser (tier 3)', () => {
        const noOrigin: ICodeFragment = {
            type: 'duration',
            fragmentType: FragmentType.Duration,
            value: 60,
        };
        const withOrigin = frag(FragmentType.Duration, 'compiler', 120);
        const result = selectBestTier([noOrigin, withOrigin]);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('compiler');
    });

    it('collected has same precedence as user', () => {
        const fragments = [
            frag(FragmentType.Rep, 'runtime', 5),
            frag(FragmentType.Rep, 'collected', 8),
        ];
        const result = selectBestTier(fragments);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('collected');
    });

    it('returns empty array for empty input', () => {
        expect(selectBestTier([])).toEqual([]);
    });
});

describe('resolveFragmentPrecedence', () => {
    it('resolves per-type independently', () => {
        const fragments = [
            frag(FragmentType.Duration, 'runtime', 'elapsed'),
            frag(FragmentType.Duration, 'parser', 'planned'),
            frag(FragmentType.Action, 'parser', 'Thrusters'),
        ];
        const result = resolveFragmentPrecedence(fragments);

        expect(result).toHaveLength(2);

        const timer = result.find(f => f.fragmentType === FragmentType.Duration);
        expect(timer?.origin).toBe('runtime');
        expect(timer?.value).toBe('elapsed');

        const action = result.find(f => f.fragmentType === FragmentType.Action);
        expect(action?.origin).toBe('parser');
        expect(action?.value).toBe('Thrusters');
    });

    it('keeps all fragments when no conflicts', () => {
        const fragments = [
            frag(FragmentType.Duration, 'parser', 300),
            frag(FragmentType.Rep, 'parser', 21),
            frag(FragmentType.Action, 'parser', 'Burpees'),
        ];
        const result = resolveFragmentPrecedence(fragments);
        expect(result).toHaveLength(3);
    });

    it('filters by origin', () => {
        const fragments = [
            frag(FragmentType.Duration, 'runtime', 'live'),
            frag(FragmentType.Duration, 'parser', 'plan'),
            frag(FragmentType.Rep, 'parser', 10),
        ];
        const result = resolveFragmentPrecedence(fragments, { origins: ['parser'] });
        expect(result).toHaveLength(2);
        expect(result.every(f => f.origin === 'parser')).toBe(true);
    });

    it('filters by type', () => {
        const fragments = [
            frag(FragmentType.Duration, 'parser', 300),
            frag(FragmentType.Rep, 'parser', 21),
            frag(FragmentType.Action, 'parser', 'Burpees'),
        ];
        const result = resolveFragmentPrecedence(fragments, {
            types: [FragmentType.Duration, FragmentType.Rep],
        });
        expect(result).toHaveLength(2);
        expect(result.some(f => f.fragmentType === FragmentType.Action)).toBe(false);
    });

    it('excludes types', () => {
        const fragments = [
            frag(FragmentType.Duration, 'parser', 300),
            frag(FragmentType.Rep, 'parser', 21),
            frag(FragmentType.Text, 'parser', 'note'),
        ];
        const result = resolveFragmentPrecedence(fragments, {
            excludeTypes: [FragmentType.Text],
        });
        expect(result).toHaveLength(2);
        expect(result.some(f => f.fragmentType === FragmentType.Text)).toBe(false);
    });

    it('combines filter and precedence', () => {
        const fragments = [
            frag(FragmentType.Duration, 'runtime', 'elapsed'),
            frag(FragmentType.Duration, 'parser', 'planned'),
            frag(FragmentType.Rep, 'compiler', 15),
            frag(FragmentType.Rep, 'parser', 10),
            frag(FragmentType.Action, 'parser', 'Run'),
        ];
        const result = resolveFragmentPrecedence(fragments, {
            excludeTypes: [FragmentType.Action],
        });
        expect(result).toHaveLength(2);

        const timer = result.find(f => f.fragmentType === FragmentType.Duration);
        expect(timer?.origin).toBe('runtime');

        const rep = result.find(f => f.fragmentType === FragmentType.Rep);
        expect(rep?.origin).toBe('compiler');
    });

    it('handles empty input', () => {
        expect(resolveFragmentPrecedence([])).toEqual([]);
    });

    it('preserves multi-fragment winning tier across types', () => {
        const fragments = [
            frag(FragmentType.Rep, 'compiler', 21),
            frag(FragmentType.Rep, 'compiler', 15),
            frag(FragmentType.Rep, 'compiler', 9),
            frag(FragmentType.Rep, 'parser', 10),
            frag(FragmentType.Action, 'compiler', 'Thrusters'),
            frag(FragmentType.Action, 'compiler', 'Pull-ups'),
        ];
        const result = resolveFragmentPrecedence(fragments);

        const reps = result.filter(f => f.fragmentType === FragmentType.Rep);
        expect(reps).toHaveLength(3);
        expect(reps.map(f => f.value)).toEqual([21, 15, 9]);

        const actions = result.filter(f => f.fragmentType === FragmentType.Action);
        expect(actions).toHaveLength(2);
    });

    it('tracked and analyzed map to runtime tier', () => {
        const fragments = [
            frag(FragmentType.Distance, 'parser', 5000),
            frag(FragmentType.Distance, 'tracked', 3200),
        ];
        const result = resolveFragmentPrecedence(fragments);
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('tracked');
    });
});
