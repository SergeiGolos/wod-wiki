import { describe, expect, it } from 'bun:test';
import { CodeStatement, ParsedCodeStatement } from '../CodeStatement';
import { IMetric, MetricType, MetricOrigin } from '../Metric';
import { IMetricSource } from '../../contracts/IMetricSource';
import { CodeMetadata } from '../CodeMetadata';

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
 * Concrete test subclass of CodeStatement for testing
 */
class TestCodeStatement extends CodeStatement {
    id: number;
    parent?: number;
    children: number[][] = [];
    meta: CodeMetadata = { line: 1, columnStart: 1, columnEnd: 10, startOffset: 0, endOffset: 10, length: 10, raw: 'test' } as any;
    metrics: IMetric[];
    isLeaf?: boolean;

    constructor(id: number, metrics: IMetric[]) {
        super();
        this.id = id;
        this.metrics = metrics;
    }
}

describe('CodeStatement implements IMetricSource', () => {
    it('should implement IMetricSource interface', () => {
        const stmt = new TestCodeStatement(1, []);
        // Type assertion — verifies compile-time conformance
        const source: IMetricSource = stmt;
        expect(source.id).toBe(1);
    });

    describe('getDisplayMetrics', () => {
        it('should return all metrics when all are parser origin', () => {
            const metrics = [
                frag(MetricType.Duration, 'parser', 60000),
                frag(MetricType.Action, 'parser', 'Run'),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            const result = stmt.getDisplayMetrics();
            expect(result).toHaveLength(2);
        });

        it('should return empty array for no metrics', () => {
            const stmt = new TestCodeStatement(1, []);
            expect(stmt.getDisplayMetrics()).toHaveLength(0);
        });

        it('should apply precedence resolution across different origins', () => {
            // Simulate a scenario where CodeStatement has mixed-origin metrics
            // (unusual for parser output, but possible after merging)
            const metrics = [
                frag(MetricType.Duration, 'parser', 'plan-10:00'),
                frag(MetricType.Duration, 'runtime', 'live-07:23'),
                frag(MetricType.Action, 'parser', 'Run'),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            const result = stmt.getDisplayMetrics();

            // Timer should resolve to runtime (higher precedence), Action stays parser
            expect(result).toHaveLength(2);
            const timer = result.find(f => f.type === MetricType.Duration);
            expect(timer?.origin).toBe('runtime');
            expect(timer?.value).toBe('live-07:23');
            const action = result.find(f => f.type === MetricType.Action);
            expect(action?.origin).toBe('parser');
        });

        it('should apply type filter', () => {
            const metrics = [
                frag(MetricType.Duration, 'parser'),
                frag(MetricType.Rep, 'parser'),
                frag(MetricType.Action, 'parser'),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            const result = stmt.getDisplayMetrics({ types: [MetricType.Duration, MetricType.Action] });
            expect(result).toHaveLength(2);
            expect(result.every(f => f.type !== MetricType.Rep)).toBe(true);
        });

        it('should apply excludeTypes filter', () => {
            const metrics = [
                frag(MetricType.Duration, 'parser'),
                frag(MetricType.Rep, 'parser'),
                frag(MetricType.Action, 'parser'),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            const result = stmt.getDisplayMetrics({ excludeTypes: [MetricType.Duration] });
            expect(result).toHaveLength(2);
            expect(result.every(f => f.type !== MetricType.Duration)).toBe(true);
        });

        it('should apply origin filter', () => {
            const metrics = [
                frag(MetricType.Duration, 'parser'),
                frag(MetricType.Duration, 'runtime'),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            const result = stmt.getDisplayMetrics({ origins: ['parser'] });
            expect(result).toHaveLength(1);
            expect(result[0].origin).toBe('parser');
        });
    });

    describe('getFragment', () => {
        it('should return the highest-precedence metrics for a type', () => {
            const metrics = [
                frag(MetricType.Duration, 'parser', 'plan'),
                frag(MetricType.Duration, 'runtime', 'live'),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            const result = stmt.getMetric(MetricType.Duration);
            expect(result?.origin).toBe('runtime');
            expect(result?.value).toBe('live');
        });

        it('should return undefined when no metrics of type exists', () => {
            const stmt = new TestCodeStatement(1, [frag(MetricType.Duration, 'parser')]);
            expect(stmt.getMetric(MetricType.Rep)).toBeUndefined();
        });

        it('should return the only metrics when just one exists', () => {
            const timer = frag(MetricType.Duration, 'parser', 60000);
            const stmt = new TestCodeStatement(1, [timer]);
            expect(stmt.getMetric(MetricType.Duration)).toEqual(timer);
        });
    });

    describe('getAllMetricsByType', () => {
        it('should return all metrics of a type sorted by precedence', () => {
            const metrics = [
                frag(MetricType.Rep, 'parser', 21),
                frag(MetricType.Rep, 'user', 19),
                frag(MetricType.Rep, 'runtime', 20),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            const result = stmt.getAllMetricsByType(MetricType.Rep);
            expect(result).toHaveLength(3);
            // user (tier 0) < runtime (tier 1) < parser (tier 3)
            expect(result[0].origin).toBe('user');
            expect(result[1].origin).toBe('runtime');
            expect(result[2].origin).toBe('parser');
        });

        it('should return empty array when type not found', () => {
            const stmt = new TestCodeStatement(1, [frag(MetricType.Duration, 'parser')]);
            expect(stmt.getAllMetricsByType(MetricType.Rep)).toHaveLength(0);
        });

        it('should preserve multiple metrics of same tier', () => {
            const metrics = [
                frag(MetricType.Rep, 'parser', 21),
                frag(MetricType.Rep, 'parser', 15),
                frag(MetricType.Rep, 'parser', 9),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            const result = stmt.getAllMetricsByType(MetricType.Rep);
            expect(result).toHaveLength(3);
            expect(result.map(f => f.value)).toEqual([21, 15, 9]);
        });
    });

    describe('hasFragment (IMetricSource)', () => {
        it('should return true when metrics type exists', () => {
            const stmt = new TestCodeStatement(1, [frag(MetricType.Duration, 'parser')]);
            expect(stmt.hasMetric(MetricType.Duration)).toBe(true);
        });

        it('should return false when metrics type is absent', () => {
            const stmt = new TestCodeStatement(1, [frag(MetricType.Duration, 'parser')]);
            expect(stmt.hasMetric(MetricType.Rep)).toBe(false);
        });
    });

    describe('rawMetrics', () => {
        it('should return all metrics unfiltered', () => {
            const metrics = [
                frag(MetricType.Duration, 'parser'),
                frag(MetricType.Rep, 'runtime'),
                frag(MetricType.Action, 'user'),
            ];
            const stmt = new TestCodeStatement(1, metrics);
            expect(stmt.rawMetrics).toHaveLength(3);
        });

        it('should return a copy, not the original array', () => {
            const metrics = [frag(MetricType.Duration, 'parser')];
            const stmt = new TestCodeStatement(1, metrics);
            const raw = stmt.rawMetrics;
            raw.push(frag(MetricType.Rep, 'parser'));
            // Original should be unchanged
            expect(stmt.rawMetrics).toHaveLength(1);
        });

        it('should return empty array when no metrics', () => {
            const stmt = new TestCodeStatement(1, []);
            expect(stmt.rawMetrics).toHaveLength(0);
        });
    });

    describe('id property', () => {
        it('should expose numeric id compatible with IMetricSource', () => {
            const stmt = new TestCodeStatement(42, []);
            const source: IMetricSource = stmt;
            expect(source.id).toBe(42);
        });
    });
});

describe('ParsedCodeStatement implements IMetricSource', () => {
    it('should implement IMetricSource through inheritance', () => {
        const stmt = new ParsedCodeStatement({
            id: 5,
            metrics: [frag(MetricType.Action, 'parser', 'Thrusters')],
        });
        const source: IMetricSource = stmt;
        expect(source.id).toBe(5);
        expect(source.getDisplayMetrics()).toHaveLength(1);
        expect(source.getMetric(MetricType.Action)?.value).toBe('Thrusters');
        expect(source.rawMetrics).toHaveLength(1);
    });

    it('should handle multi-metric rep scheme', () => {
        const stmt = new ParsedCodeStatement({
            id: 10,
            metrics: [
                frag(MetricType.Rep, 'parser', 21),
                frag(MetricType.Rep, 'parser', 15),
                frag(MetricType.Rep, 'parser', 9),
                frag(MetricType.Action, 'parser', 'Thrusters'),
                frag(MetricType.Action, 'parser', 'Pull-ups'),
            ],
        });

        // getDisplayMetrics returns all (all same tier)
        const display = stmt.getDisplayMetrics();
        expect(display).toHaveLength(5);

        // getFragment returns first rep (all same tier)
        const firstRep = stmt.getMetric(MetricType.Rep);
        expect(firstRep?.value).toBe(21);

        // getAllMetricsByType returns all 3 reps
        const allReps = stmt.getAllMetricsByType(MetricType.Rep);
        expect(allReps).toHaveLength(3);
    });
});
