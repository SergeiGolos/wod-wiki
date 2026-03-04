import { describe, expect, it, beforeEach } from 'bun:test';
import { OutputStatement, OutputStatementOptions } from '../OutputStatement';
import { IMetric, MetricType, MetricOrigin } from '../Metric';
import { IMetricSource } from '../../contracts/IMetricSource';
import { TimeSpan } from '../../../runtime/models/TimeSpan';

/**
 * Helper to create a minimal IMetric for testing.
 */
function frag(
    metricType: MetricType,
    origin: MetricOrigin = 'parser',
    value?: unknown
): IMetric {
    return {
        type: metricType,
        metricType,
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
function makeOptions(metrics?: IMetric[]): OutputStatementOptions {
    return {
        outputType: 'segment',
        timeSpan: makeTimeSpan(),
        sourceBlockKey: 'block-test-123',
        stackLevel: 0,
        metrics,
    };
}

beforeEach(() => {
    OutputStatement.resetIdCounter();
});

describe('OutputStatement implements IMetricSource', () => {
    it('should implement IMetricSource interface', () => {
        const output = new OutputStatement(makeOptions([
            frag(MetricType.Duration, 'runtime', 45000),
        ]));
        // Type assertion — verifies compile-time conformance
        const source: IMetricSource = output;
        expect(source.id).toBe(1000000);
        expect(source.getDisplayMetrics()).toHaveLength(1);
    });

    describe('getDisplayMetrics', () => {
        it('should return all metric with precedence resolution', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'parser', 600000),
                frag(MetricType.Duration, 'runtime', 432000),
                frag(MetricType.Action, 'parser', 'Run'),
            ]));
            const result = output.getDisplayMetrics();

            // Timer: runtime wins over parser. Action: only parser exists.
            expect(result).toHaveLength(2);
            const timer = result.find(f => f.metricType === MetricType.Duration);
            expect(timer?.origin).toBe('runtime');
            expect(timer?.value).toBe(432000);
            const action = result.find(f => f.metricType === MetricType.Action);
            expect(action?.origin).toBe('parser');
        });

        it('should return empty array for no metrics', () => {
            const output = new OutputStatement(makeOptions());
            expect(output.getDisplayMetrics()).toHaveLength(0);
        });

        it('should apply type filter', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'runtime'),
                frag(MetricType.Rep, 'runtime'),
                frag(MetricType.Action, 'parser'),
            ]));
            const result = output.getDisplayMetrics({ types: [MetricType.Rep] });
            expect(result).toHaveLength(1);
            expect(result[0].metricType).toBe(MetricType.Rep);
        });

        it('should apply excludeTypes filter', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'runtime'),
                frag(MetricType.Rep, 'runtime'),
                frag(MetricType.Action, 'parser'),
            ]));
            const result = output.getDisplayMetrics({ excludeTypes: [MetricType.Duration] });
            expect(result).toHaveLength(2);
            expect(result.every(f => f.metricType !== MetricType.Duration)).toBe(true);
        });

        it('should apply origin filter', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'parser', 'plan'),
                frag(MetricType.Duration, 'runtime', 'live'),
            ]));
            const result = output.getDisplayMetrics({ origins: ['parser'] });
            expect(result).toHaveLength(1);
            expect(result[0].origin).toBe('parser');
        });

        it('should handle user origin overriding runtime', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Rep, 'parser', 10),
                frag(MetricType.Rep, 'runtime', 8),
                frag(MetricType.Rep, 'user', 9),
            ]));
            const result = output.getDisplayMetrics();
            // user (tier 0) wins over runtime (tier 1) and parser (tier 3)
            expect(result).toHaveLength(1);
            expect(result[0].origin).toBe('user');
            expect(result[0].value).toBe(9);
        });
    });

    describe('getFragment', () => {
        it('should return highest precedence metrics for a type', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'parser', 'original'),
                frag(MetricType.Duration, 'runtime', 'elapsed'),
            ]));
            const result = output.getMetric(MetricType.Duration);
            expect(result?.origin).toBe('runtime');
            expect(result?.value).toBe('elapsed');
        });

        it('should return undefined when no metrics of type exists', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'runtime'),
            ]));
            expect(output.getMetric(MetricType.Rep)).toBeUndefined();
        });

        it('should return parser metrics as fallback', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Action, 'parser', 'Run'),
            ]));
            const result = output.getMetric(MetricType.Action);
            expect(result?.origin).toBe('parser');
            expect(result?.value).toBe('Run');
        });
    });

    describe('getAllMetricsByType', () => {
        it('should return all metric sorted by precedence', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Rep, 'parser', 21),
                frag(MetricType.Rep, 'user', 19),
                frag(MetricType.Rep, 'compiler', 20),
            ]));
            const result = output.getAllMetricsByType(MetricType.Rep);
            expect(result).toHaveLength(3);
            // user (0) < compiler (2) < parser (3)
            expect(result[0].origin).toBe('user');
            expect(result[1].origin).toBe('compiler');
            expect(result[2].origin).toBe('parser');
        });

        it('should return empty array when type not found', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'runtime'),
            ]));
            expect(output.getAllMetricsByType(MetricType.Action)).toHaveLength(0);
        });

        it('should preserve multiple same-tier metrics in order', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Rep, 'runtime', 21),
                frag(MetricType.Rep, 'runtime', 15),
                frag(MetricType.Rep, 'runtime', 9),
            ]));
            const result = output.getAllMetricsByType(MetricType.Rep);
            expect(result).toHaveLength(3);
            expect(result.every(f => f.origin === 'runtime')).toBe(true);
        });
    });

    describe('hasFragment', () => {
        it('should return true when metrics type exists', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'runtime'),
            ]));
            expect(output.hasMetric(MetricType.Duration)).toBe(true);
        });

        it('should return false when metrics type is absent', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'runtime'),
            ]));
            expect(output.hasMetric(MetricType.Rep)).toBe(false);
        });
    });

    describe('rawMetrics', () => {
        it('should return all metric unfiltered', () => {
            const metrics = [
                frag(MetricType.Duration, 'runtime'),
                frag(MetricType.Rep, 'user'),
                frag(MetricType.Action, 'parser'),
            ];
            const output = new OutputStatement(makeOptions(metrics));
            expect(output.rawMetrics).toHaveLength(3);
        });

        it('should return a copy, not the original array', () => {
            const output = new OutputStatement(makeOptions([
                frag(MetricType.Duration, 'runtime'),
            ]));
            const raw = output.rawMetrics;
            raw.push(frag(MetricType.Rep, 'parser'));
            expect(output.rawMetrics).toHaveLength(1);
        });

        it('should return empty array when no metrics', () => {
            const output = new OutputStatement(makeOptions());
            expect(output.rawMetrics).toHaveLength(0);
        });
    });

    describe('id property', () => {
        it('should expose auto-incremented id', () => {
            const output1 = new OutputStatement(makeOptions());
            const output2 = new OutputStatement(makeOptions());
            const source1: IMetricSource = output1;
            const source2: IMetricSource = output2;
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
                metrics: [
                    frag(MetricType.Duration, 'parser', 600000),     // 10:00 plan
                    frag(MetricType.Duration, 'runtime', 443000),    // 7:23 actual
                    frag(MetricType.Action, 'parser', 'Run'),     // action unchanged
                    frag(MetricType.Distance, 'parser', 2000),    // 2km plan
                    frag(MetricType.Distance, 'runtime', 1850),   // 1.85km actual
                ],
            });

            const display = output.getDisplayMetrics();
            expect(display).toHaveLength(3); // Timer(runtime), Action(parser), Distance(runtime)

            const timer = output.getMetric(MetricType.Duration);
            expect(timer?.value).toBe(443000); // runtime wins

            const action = output.getMetric(MetricType.Action);
            expect(action?.value).toBe('Run'); // parser (only tier)

            const distance = output.getMetric(MetricType.Distance);
            expect(distance?.value).toBe(1850); // runtime wins
        });

        it('should handle completion output with user overrides', () => {
            const output = new OutputStatement({
                outputType: 'completion',
                timeSpan: makeTimeSpan(),
                sourceBlockKey: 'rep-block-1',
                stackLevel: 0,
                metrics: [
                    frag(MetricType.Rep, 'parser', 21),     // planned
                    frag(MetricType.Rep, 'runtime', 21),    // tracked
                    frag(MetricType.Rep, 'user', 19),       // user says 19
                    frag(MetricType.Action, 'parser', 'Thrusters'),
                ],
            });

            const display = output.getDisplayMetrics();
            expect(display).toHaveLength(2); // Rep(user), Action(parser)

            const rep = output.getMetric(MetricType.Rep);
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
