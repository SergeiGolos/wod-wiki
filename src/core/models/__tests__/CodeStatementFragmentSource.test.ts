import { describe, expect, it } from 'bun:test';
import { CodeStatement, ParsedCodeStatement } from '../CodeStatement';
import { ICodeFragment, FragmentType, FragmentOrigin } from '../CodeFragment';
import { IFragmentSource } from '../../contracts/IFragmentSource';
import { CodeMetadata } from '../CodeMetadata';

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

/**
 * Concrete test subclass of CodeStatement for testing
 */
class TestCodeStatement extends CodeStatement {
    id: number;
    parent?: number;
    children: number[][] = [];
    meta: CodeMetadata = { line: 1, columnStart: 1, columnEnd: 10, startOffset: 0, endOffset: 10, length: 10, raw: 'test' } as any;
    fragments: ICodeFragment[];
    isLeaf?: boolean;

    constructor(id: number, fragments: ICodeFragment[]) {
        super();
        this.id = id;
        this.fragments = fragments;
    }
}

describe('CodeStatement implements IFragmentSource', () => {
    it('should implement IFragmentSource interface', () => {
        const stmt = new TestCodeStatement(1, []);
        // Type assertion — verifies compile-time conformance
        const source: IFragmentSource = stmt;
        expect(source.id).toBe(1);
    });

    describe('getDisplayFragments', () => {
        it('should return all fragments when all are parser origin', () => {
            const fragments = [
                frag(FragmentType.Timer, 'parser', 60000),
                frag(FragmentType.Action, 'parser', 'Run'),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            const result = stmt.getDisplayFragments();
            expect(result).toHaveLength(2);
        });

        it('should return empty array for no fragments', () => {
            const stmt = new TestCodeStatement(1, []);
            expect(stmt.getDisplayFragments()).toHaveLength(0);
        });

        it('should apply precedence resolution across different origins', () => {
            // Simulate a scenario where CodeStatement has mixed-origin fragments
            // (unusual for parser output, but possible after merging)
            const fragments = [
                frag(FragmentType.Timer, 'parser', 'plan-10:00'),
                frag(FragmentType.Timer, 'runtime', 'live-07:23'),
                frag(FragmentType.Action, 'parser', 'Run'),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            const result = stmt.getDisplayFragments();

            // Timer should resolve to runtime (higher precedence), Action stays parser
            expect(result).toHaveLength(2);
            const timer = result.find(f => f.fragmentType === FragmentType.Timer);
            expect(timer?.origin).toBe('runtime');
            expect(timer?.value).toBe('live-07:23');
            const action = result.find(f => f.fragmentType === FragmentType.Action);
            expect(action?.origin).toBe('parser');
        });

        it('should apply type filter', () => {
            const fragments = [
                frag(FragmentType.Timer, 'parser'),
                frag(FragmentType.Rep, 'parser'),
                frag(FragmentType.Action, 'parser'),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            const result = stmt.getDisplayFragments({ types: [FragmentType.Timer, FragmentType.Action] });
            expect(result).toHaveLength(2);
            expect(result.every(f => f.fragmentType !== FragmentType.Rep)).toBe(true);
        });

        it('should apply excludeTypes filter', () => {
            const fragments = [
                frag(FragmentType.Timer, 'parser'),
                frag(FragmentType.Rep, 'parser'),
                frag(FragmentType.Action, 'parser'),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            const result = stmt.getDisplayFragments({ excludeTypes: [FragmentType.Timer] });
            expect(result).toHaveLength(2);
            expect(result.every(f => f.fragmentType !== FragmentType.Timer)).toBe(true);
        });

        it('should apply origin filter', () => {
            const fragments = [
                frag(FragmentType.Timer, 'parser'),
                frag(FragmentType.Timer, 'runtime'),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            const result = stmt.getDisplayFragments({ origins: ['parser'] });
            expect(result).toHaveLength(1);
            expect(result[0].origin).toBe('parser');
        });
    });

    describe('getFragment', () => {
        it('should return the highest-precedence fragment for a type', () => {
            const fragments = [
                frag(FragmentType.Timer, 'parser', 'plan'),
                frag(FragmentType.Timer, 'runtime', 'live'),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            const result = stmt.getFragment(FragmentType.Timer);
            expect(result?.origin).toBe('runtime');
            expect(result?.value).toBe('live');
        });

        it('should return undefined when no fragment of type exists', () => {
            const stmt = new TestCodeStatement(1, [frag(FragmentType.Timer, 'parser')]);
            expect(stmt.getFragment(FragmentType.Rep)).toBeUndefined();
        });

        it('should return the only fragment when just one exists', () => {
            const timer = frag(FragmentType.Timer, 'parser', 60000);
            const stmt = new TestCodeStatement(1, [timer]);
            expect(stmt.getFragment(FragmentType.Timer)).toEqual(timer);
        });
    });

    describe('getAllFragmentsByType', () => {
        it('should return all fragments of a type sorted by precedence', () => {
            const fragments = [
                frag(FragmentType.Rep, 'parser', 21),
                frag(FragmentType.Rep, 'user', 19),
                frag(FragmentType.Rep, 'runtime', 20),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            const result = stmt.getAllFragmentsByType(FragmentType.Rep);
            expect(result).toHaveLength(3);
            // user (tier 0) < runtime (tier 1) < parser (tier 3)
            expect(result[0].origin).toBe('user');
            expect(result[1].origin).toBe('runtime');
            expect(result[2].origin).toBe('parser');
        });

        it('should return empty array when type not found', () => {
            const stmt = new TestCodeStatement(1, [frag(FragmentType.Timer, 'parser')]);
            expect(stmt.getAllFragmentsByType(FragmentType.Rep)).toHaveLength(0);
        });

        it('should preserve multiple fragments of same tier', () => {
            const fragments = [
                frag(FragmentType.Rep, 'parser', 21),
                frag(FragmentType.Rep, 'parser', 15),
                frag(FragmentType.Rep, 'parser', 9),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            const result = stmt.getAllFragmentsByType(FragmentType.Rep);
            expect(result).toHaveLength(3);
            expect(result.map(f => f.value)).toEqual([21, 15, 9]);
        });
    });

    describe('hasFragment (IFragmentSource)', () => {
        it('should return true when fragment type exists', () => {
            const stmt = new TestCodeStatement(1, [frag(FragmentType.Timer, 'parser')]);
            expect(stmt.hasFragment(FragmentType.Timer)).toBe(true);
        });

        it('should return false when fragment type is absent', () => {
            const stmt = new TestCodeStatement(1, [frag(FragmentType.Timer, 'parser')]);
            expect(stmt.hasFragment(FragmentType.Rep)).toBe(false);
        });
    });

    describe('rawFragments', () => {
        it('should return all fragments unfiltered', () => {
            const fragments = [
                frag(FragmentType.Timer, 'parser'),
                frag(FragmentType.Rep, 'runtime'),
                frag(FragmentType.Action, 'user'),
            ];
            const stmt = new TestCodeStatement(1, fragments);
            expect(stmt.rawFragments).toHaveLength(3);
        });

        it('should return a copy, not the original array', () => {
            const fragments = [frag(FragmentType.Timer, 'parser')];
            const stmt = new TestCodeStatement(1, fragments);
            const raw = stmt.rawFragments;
            raw.push(frag(FragmentType.Rep, 'parser'));
            // Original should be unchanged
            expect(stmt.rawFragments).toHaveLength(1);
        });

        it('should return empty array when no fragments', () => {
            const stmt = new TestCodeStatement(1, []);
            expect(stmt.rawFragments).toHaveLength(0);
        });
    });

    describe('id property', () => {
        it('should expose numeric id compatible with IFragmentSource', () => {
            const stmt = new TestCodeStatement(42, []);
            const source: IFragmentSource = stmt;
            expect(source.id).toBe(42);
        });
    });
});

describe('ParsedCodeStatement implements IFragmentSource', () => {
    it('should implement IFragmentSource through inheritance', () => {
        const stmt = new ParsedCodeStatement({
            id: 5,
            fragments: [frag(FragmentType.Action, 'parser', 'Thrusters')],
        });
        const source: IFragmentSource = stmt;
        expect(source.id).toBe(5);
        expect(source.getDisplayFragments()).toHaveLength(1);
        expect(source.getFragment(FragmentType.Action)?.value).toBe('Thrusters');
        expect(source.rawFragments).toHaveLength(1);
    });

    it('should handle multi-fragment rep scheme', () => {
        const stmt = new ParsedCodeStatement({
            id: 10,
            fragments: [
                frag(FragmentType.Rep, 'parser', 21),
                frag(FragmentType.Rep, 'parser', 15),
                frag(FragmentType.Rep, 'parser', 9),
                frag(FragmentType.Action, 'parser', 'Thrusters'),
                frag(FragmentType.Action, 'parser', 'Pull-ups'),
            ],
        });

        // getDisplayFragments returns all (all same tier)
        const display = stmt.getDisplayFragments();
        expect(display).toHaveLength(5);

        // getFragment returns first rep (all same tier)
        const firstRep = stmt.getFragment(FragmentType.Rep);
        expect(firstRep?.value).toBe(21);

        // getAllFragmentsByType returns all 3 reps
        const allReps = stmt.getAllFragmentsByType(FragmentType.Rep);
        expect(allReps).toHaveLength(3);
    });
});
