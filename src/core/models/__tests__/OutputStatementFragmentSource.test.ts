import { describe, expect, it, beforeEach } from 'bun:test';
import { OutputStatement, OutputStatementOptions } from '../OutputStatement';
import { ICodeFragment, FragmentType, FragmentOrigin } from '../CodeFragment';
import { IFragmentSource } from '../../contracts/IFragmentSource';
import { TimeSpan } from '../../../runtime/models/TimeSpan';

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
 * Helper to create a minimal TimeSpan for testing.
 */
function makeTimeSpan(): TimeSpan {
    const start = new Date('2024-01-01T12:00:00Z');
    const end = new Date('2024-01-01T12:10:00Z');
    return new TimeSpan(start.getTime(), end.getTime());
}

/**
 * Helper to create valid OutputStatementOptions.
 */
function makeOptions(fragments?: ICodeFragment[]): OutputStatementOptions {
    return {
        outputType: 'segment',
        timeSpan: makeTimeSpan(),
        sourceBlockKey: 'block-test-123',
        stackLevel: 0,
        fragments,
    };
}

beforeEach(() => {
    OutputStatement.resetIdCounter();
});

describe('OutputStatement implements IFragmentSource', () => {
    it('should implement IFragmentSource interface', () => {
        const output = new OutputStatement(makeOptions([
            frag(FragmentType.Duration, 'runtime', 45000),
        ]));
        // Type assertion — verifies compile-time conformance
        const source: IFragmentSource = output;
        expect(source.id).toBe(1000000);
        expect(source.getDisplayFragments()).toHaveLength(1);
    });

    describe('getDisplayFragments', () => {
        it('should return all fragments with precedence resolution', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'parser', 600000),
                frag(FragmentType.Duration, 'runtime', 432000),
                frag(FragmentType.Action, 'parser', 'Run'),
            ]));
            const result = output.getDisplayFragments();

            // Timer: runtime wins over parser. Action: only parser exists.
            expect(result).toHaveLength(2);
            const timer = result.find(f => f.fragmentType === FragmentType.Duration);
            expect(timer?.origin).toBe('runtime');
            expect(timer?.value).toBe(432000);
            const action = result.find(f => f.fragmentType === FragmentType.Action);
            expect(action?.origin).toBe('parser');
        });

        it('should return empty array for no fragments', () => {
            const output = new OutputStatement(makeOptions());
            expect(output.getDisplayFragments()).toHaveLength(0);
        });

        it('should apply type filter', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'runtime'),
                frag(FragmentType.Rep, 'runtime'),
                frag(FragmentType.Action, 'parser'),
            ]));
            const result = output.getDisplayFragments({ types: [FragmentType.Rep] });
            expect(result).toHaveLength(1);
            expect(result[0].fragmentType).toBe(FragmentType.Rep);
        });

        it('should apply excludeTypes filter', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'runtime'),
                frag(FragmentType.Rep, 'runtime'),
                frag(FragmentType.Action, 'parser'),
            ]));
            const result = output.getDisplayFragments({ excludeTypes: [FragmentType.Duration] });
            expect(result).toHaveLength(2);
            expect(result.every(f => f.fragmentType !== FragmentType.Duration)).toBe(true);
        });

        it('should apply origin filter', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'parser', 'plan'),
                frag(FragmentType.Duration, 'runtime', 'live'),
            ]));
            const result = output.getDisplayFragments({ origins: ['parser'] });
            expect(result).toHaveLength(1);
            expect(result[0].origin).toBe('parser');
        });

        it('should handle user origin overriding runtime', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Rep, 'parser', 10),
                frag(FragmentType.Rep, 'runtime', 8),
                frag(FragmentType.Rep, 'user', 9),
            ]));
            const result = output.getDisplayFragments();
            // user (tier 0) wins over runtime (tier 1) and parser (tier 3)
            expect(result).toHaveLength(1);
            expect(result[0].origin).toBe('user');
            expect(result[0].value).toBe(9);
        });
    });

    describe('getFragment', () => {
        it('should return highest precedence fragment for a type', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'parser', 'original'),
                frag(FragmentType.Duration, 'runtime', 'elapsed'),
            ]));
            const result = output.getFragment(FragmentType.Duration);
            expect(result?.origin).toBe('runtime');
            expect(result?.value).toBe('elapsed');
        });

        it('should return undefined when no fragment of type exists', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'runtime'),
            ]));
            expect(output.getFragment(FragmentType.Rep)).toBeUndefined();
        });

        it('should return parser fragment as fallback', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Action, 'parser', 'Run'),
            ]));
            const result = output.getFragment(FragmentType.Action);
            expect(result?.origin).toBe('parser');
            expect(result?.value).toBe('Run');
        });
    });

    describe('getAllFragmentsByType', () => {
        it('should return all fragments sorted by precedence', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Rep, 'parser', 21),
                frag(FragmentType.Rep, 'user', 19),
                frag(FragmentType.Rep, 'compiler', 20),
            ]));
            const result = output.getAllFragmentsByType(FragmentType.Rep);
            expect(result).toHaveLength(3);
            // user (0) < compiler (2) < parser (3)
            expect(result[0].origin).toBe('user');
            expect(result[1].origin).toBe('compiler');
            expect(result[2].origin).toBe('parser');
        });

        it('should return empty array when type not found', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'runtime'),
            ]));
            expect(output.getAllFragmentsByType(FragmentType.Action)).toHaveLength(0);
        });

        it('should preserve multiple same-tier fragments in order', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Rep, 'runtime', 21),
                frag(FragmentType.Rep, 'runtime', 15),
                frag(FragmentType.Rep, 'runtime', 9),
            ]));
            const result = output.getAllFragmentsByType(FragmentType.Rep);
            expect(result).toHaveLength(3);
            expect(result.every(f => f.origin === 'runtime')).toBe(true);
        });
    });

    describe('hasFragment', () => {
        it('should return true when fragment type exists', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'runtime'),
            ]));
            expect(output.hasFragment(FragmentType.Duration)).toBe(true);
        });

        it('should return false when fragment type is absent', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'runtime'),
            ]));
            expect(output.hasFragment(FragmentType.Rep)).toBe(false);
        });
    });

    describe('rawFragments', () => {
        it('should return all fragments unfiltered', () => {
            const fragments = [
                frag(FragmentType.Duration, 'runtime'),
                frag(FragmentType.Rep, 'user'),
                frag(FragmentType.Action, 'parser'),
            ];
            const output = new OutputStatement(makeOptions(fragments));
            expect(output.rawFragments).toHaveLength(3);
        });

        it('should return a copy, not the original array', () => {
            const output = new OutputStatement(makeOptions([
                frag(FragmentType.Duration, 'runtime'),
            ]));
            const raw = output.rawFragments;
            raw.push(frag(FragmentType.Rep, 'parser'));
            expect(output.rawFragments).toHaveLength(1);
        });

        it('should return empty array when no fragments', () => {
            const output = new OutputStatement(makeOptions());
            expect(output.rawFragments).toHaveLength(0);
        });
    });

    describe('id property', () => {
        it('should expose auto-incremented id', () => {
            const output1 = new OutputStatement(makeOptions());
            const output2 = new OutputStatement(makeOptions());
            const source1: IFragmentSource = output1;
            const source2: IFragmentSource = output2;
            expect(source2.id).toBe((source1.id as number) + 1);
        });
    });

    describe('real-world scenarios', () => {
        it('should handle segment output with mixed origins', () => {
            // A timer block that ran for 7:23 of a planned 10:00
            const output = new OutputStatement({
                outputType: 'segment',
                timeSpan: makeTimeSpan(),
                sourceBlockKey: 'timer-block-1',
                stackLevel: 1,
                fragments: [
                    frag(FragmentType.Duration, 'parser', 600000),     // 10:00 plan
                    frag(FragmentType.Duration, 'runtime', 443000),    // 7:23 actual
                    frag(FragmentType.Action, 'parser', 'Run'),     // action unchanged
                    frag(FragmentType.Distance, 'parser', 2000),    // 2km plan
                    frag(FragmentType.Distance, 'runtime', 1850),   // 1.85km actual
                ],
            });

            const display = output.getDisplayFragments();
            expect(display).toHaveLength(3); // Timer(runtime), Action(parser), Distance(runtime)

            const timer = output.getFragment(FragmentType.Duration);
            expect(timer?.value).toBe(443000); // runtime wins

            const action = output.getFragment(FragmentType.Action);
            expect(action?.value).toBe('Run'); // parser (only tier)

            const distance = output.getFragment(FragmentType.Distance);
            expect(distance?.value).toBe(1850); // runtime wins
        });

        it('should handle completion output with user overrides', () => {
            const output = new OutputStatement({
                outputType: 'completion',
                timeSpan: makeTimeSpan(),
                sourceBlockKey: 'rep-block-1',
                stackLevel: 0,
                fragments: [
                    frag(FragmentType.Rep, 'parser', 21),     // planned
                    frag(FragmentType.Rep, 'runtime', 21),    // tracked
                    frag(FragmentType.Rep, 'user', 19),       // user says 19
                    frag(FragmentType.Action, 'parser', 'Thrusters'),
                ],
            });

            const display = output.getDisplayFragments();
            expect(display).toHaveLength(2); // Rep(user), Action(parser)

            const rep = output.getFragment(FragmentType.Rep);
            expect(rep?.value).toBe(19); // user override wins
        });
    });
});

describe('OutputStatement time semantics (spans, elapsed, total)', () => {
    beforeEach(() => {
        OutputStatement.resetIdCounter();
    });

    it('should default to empty spans array when none provided', () => {
        const output = new OutputStatement(makeOptions());
        expect(output.spans).toEqual([]);
    });

    it('should store provided spans', () => {
        const spans = [
            new TimeSpan(1000, 4000),
            new TimeSpan(6000, 9000),
        ];
        const output = new OutputStatement({
            ...makeOptions(),
            spans,
        });
        expect(output.spans).toHaveLength(2);
        expect(output.spans[0].started).toBe(1000);
        expect(output.spans[1].ended).toBe(9000);
    });

    it('should compute elapsed as sum of span durations (pause-aware)', () => {
        // Two spans: 3s active, 3s active, with 2s pause between
        const spans = [
            new TimeSpan(1000, 4000), // 3000ms
            new TimeSpan(6000, 9000), // 3000ms
        ];
        const output = new OutputStatement({
            ...makeOptions(),
            spans,
        });
        // elapsed = 3000 + 3000 = 6000ms (excludes the 2s pause)
        expect(output.elapsed).toBe(6000);
    });

    it('should compute total as wall-clock bracket from first start to last end', () => {
        // Two spans: first starts at 1000, last ends at 9000
        const spans = [
            new TimeSpan(1000, 4000),
            new TimeSpan(6000, 9000),
        ];
        const output = new OutputStatement({
            ...makeOptions(),
            spans,
        });
        // total = 9000 - 1000 = 8000ms (includes the 2s pause)
        expect(output.total).toBe(8000);
    });

    it('should fall back to timeSpan.duration when no spans provided', () => {
        const timeSpan = new TimeSpan(5000, 15000); // 10s
        const output = new OutputStatement({
            outputType: 'completion',
            timeSpan,
            sourceBlockKey: 'test-block',
            stackLevel: 0,
        });
        expect(output.elapsed).toBe(10000);
        expect(output.total).toBe(10000);
    });

    it('should handle timestamp (start === end) as zero-duration span', () => {
        // A "timestamp" is a degenerate span with start === end
        const timestamp = new TimeSpan(5000, 5000);
        const output = new OutputStatement({
            ...makeOptions(),
            spans: [timestamp],
        });
        expect(output.elapsed).toBe(0);
        expect(output.total).toBe(0);
    });

    it('should handle multiple timestamps with zero elapsed but nonzero total', () => {
        // Multiple timestamps (point-in-time markers) spread across time
        const spans = [
            new TimeSpan(1000, 1000), // timestamp at t=1s
            new TimeSpan(5000, 5000), // timestamp at t=5s
            new TimeSpan(8000, 8000), // timestamp at t=8s
        ];
        const output = new OutputStatement({
            ...makeOptions(),
            spans,
        });
        // Each timestamp has 0 duration → elapsed = 0
        expect(output.elapsed).toBe(0);
        // total = 8000 - 1000 = 7000ms (wall-clock bracket)
        expect(output.total).toBe(7000);
    });

    it('should handle single continuous span (no pauses)', () => {
        const spans = [new TimeSpan(2000, 12000)]; // 10s
        const output = new OutputStatement({
            ...makeOptions(),
            spans,
        });
        // elapsed === total when there's only one span
        expect(output.elapsed).toBe(10000);
        expect(output.total).toBe(10000);
    });

    it('should handle mix of timestamps and spans', () => {
        const spans = [
            new TimeSpan(1000, 1000), // timestamp (0ms)
            new TimeSpan(2000, 5000), // 3000ms active
            new TimeSpan(7000, 7000), // timestamp (0ms)
            new TimeSpan(8000, 11000), // 3000ms active
        ];
        const output = new OutputStatement({
            ...makeOptions(),
            spans,
        });
        // elapsed = 0 + 3000 + 0 + 3000 = 6000ms
        expect(output.elapsed).toBe(6000);
        // total = 11000 - 1000 = 10000ms
        expect(output.total).toBe(10000);
    });

    it('should be readonly (spans array)', () => {
        const spans = [new TimeSpan(1000, 4000)];
        const output = new OutputStatement({
            ...makeOptions(),
            spans,
        });
        // ReadonlyArray — original array mutations don't affect output
        spans.push(new TimeSpan(5000, 8000));
        expect(output.spans).toHaveLength(1);
    });
});
