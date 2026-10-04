import { describe, it, expect } from 'vitest';
import { parseScript } from '../../src/parser/parseScript';
import { MetricType, type ICodeStatement, type IMetric } from '@bitcobblers/wod-wiki-core';

function metricOf(stmt: ICodeStatement, type: MetricType): IMetric | undefined {
    return stmt.metrics.toArray().find(m => m.type === type);
}

/**
 * Public parser contract: an inline rounds prescription (`5x5 Back Squat @100kg`,
 * `5 x 5 …`, `(5) 5 …`) produces TWO linked Statements — a parent carrying the
 * Rounds+Rep scheme and a child carrying movement/load — with unique structural
 * ids that are independent of the physical source line. Both statements keep the
 * original content line and per-metric source slices.
 */
describe('inline rounds normalization (parser output)', () => {
    it.each([
        '5x5 Back Squat @100kg',
        '5 x 5 Back Squat @100kg',
        '(5) 5 Back Squat @100kg',
    ])('%s parses to linked parent + child statements', (source) => {
        const script = parseScript(source);
        expect(script.errors ?? []).toHaveLength(0);
        expect(script.statements).toHaveLength(2);

        const [parent, child] = script.statements;
        expect(new Set([parent.id, child.id]).size).toBe(2);
        expect(parent.line).toBe(1);
        expect(child.line).toBe(1);
        expect(parent.children).toEqual([[child.id]]);
        expect(child.parent).toBe(parent.id);
        expect(parent.parent).toBeUndefined();
        expect(parent.isLeaf).toBe(false);

        expect(metricOf(parent, MetricType.Rounds)?.value).toBe(5);
        expect(metricOf(parent, MetricType.Rep)?.value).toBe(5);
        expect(metricOf(parent, MetricType.Effort)).toBeUndefined();
        expect(metricOf(parent, MetricType.Resistance)).toBeUndefined();

        expect(metricOf(child, MetricType.Effort)?.value).toBe('Back Squat');
        expect(metricOf(child, MetricType.Resistance)?.value).toEqual({ amount: 100, unit: 'kg' });
        expect(metricOf(child, MetricType.Rounds)).toBeUndefined();
        expect(child.metricMeta.get(metricOf(child, MetricType.Resistance)!)?.raw).toBe('@100kg');

        const schemeMeta = parent.metricMeta.get(metricOf(parent, MetricType.Rounds)!);
        expect(schemeMeta?.line).toBe(1);
        expect(schemeMeta?.raw).toBe(/^\(5\)|^5 x 5|^5x5/.exec(source)![0]);
        const effortMeta = child.metricMeta.get(metricOf(child, MetricType.Effort)!);
        expect(effortMeta?.raw).toBe('Back Squat');
        expect(effortMeta?.line).toBe(1);
    });

    it('ids are structural: blank lines shift lines, never identity', () => {
        const script = parseScript('\n\n5x5 Back Squat @100kg');
        expect(script.statements).toHaveLength(2);
        const [parent, child] = script.statements;
        expect(new Set([parent.id, child.id]).size).toBe(2);
        expect(script.getId(parent.id)).toBe(parent);
        expect(script.getId(child.id)).toBe(child);
        expect(parent.line).toBe(3);
        expect(child.line).toBe(3);
        expect(parent.children).toEqual([[child.id]]);
        expect(child.parent).toBe(parent.id);
    });

    it('sibling inline rounds keep distinct identities per line', () => {
        const script = parseScript('5x5 Bench Press @60kg\n5x5 Squat @80kg');
        expect(script.statements).toHaveLength(4);
        expect(new Set(script.statements.map(s => s.id)).size).toBe(4);
        expect(script.statements.map(s => s.line)).toEqual([1, 1, 2, 2]);

        const [, , secondParent, secondChild] = script.statements;
        expect(secondParent.children).toEqual([[secondChild.id]]);
        expect(metricOf(secondChild, MetricType.Effort)?.value).toBe('Squat');
        expect(metricOf(secondChild, MetricType.Resistance)?.value).toEqual({ amount: 80, unit: 'kg' });
    });

    it('load choices survive normalization and land on the child', () => {
        const script = parseScript('(5) 5 Back Squat @185 | 125 lb');
        const [parent, child] = script.statements;
        expect(metricOf(parent, MetricType.Rounds)?.value).toBe(5);
        const choice = metricOf(child, MetricType.Choice);
        expect(choice?.value.alternatives?.map((m: IMetric) => m.value)).toEqual([
            { amount: 185, unit: 'lb' },
            { amount: 125, unit: 'lb' },
        ]);
        expect(metricOf(child, MetricType.Effort)?.value).toBe('Back Squat');
        expect(child.metricMeta.get(choice!)?.line).toBe(1);
    });

    it('variable ladder keeps the rep scheme on the parent', () => {
        const script = parseScript('(21-15-9) Thruster');
        expect(script.statements).toHaveLength(2);
        const [parent, child] = script.statements;
        expect(metricOf(parent, MetricType.Rounds)?.value).toBe(3);
        expect(parent.metrics.toArray().filter(m => m.type === MetricType.Rep).map(m => m.value))
            .toEqual([21, 15, 9]);
        expect(metricOf(child, MetricType.Effort)?.value).toBe('Thruster');
        expect(parent.children).toEqual([[child.id]]);
    });

    it('nested inline and plain siblings keep unique ids and grouping', () => {
        const script = parseScript('(2)\n  (3) 5 Back Squat @100kg\n  2 Pushup');
        const [outer, innerParent, innerChild, pushup] = script.statements;
        expect(new Set([outer.id, innerParent.id, innerChild.id, pushup.id]).size).toBe(4);
        expect(outer.children).toEqual([[innerParent.id], [pushup.id]]);
        expect(innerParent.children).toEqual([[innerChild.id]]);
        expect(innerChild.parent).toBe(innerParent.id);
        expect(pushup.parent).toBe(outer.id);
        expect(metricOf(innerChild, MetricType.Effort)?.value).toBe('Back Squat');
        expect(metricOf(pushup, MetricType.Rep)?.value).toBe(2);
        expect(metricOf(pushup, MetricType.Effort)?.value).toBe('Pushup');
    });

    it('timed and rounds-only prescriptions stay single statements', () => {
        const timed = parseScript('(3) 5 Back Squat @100kg 20:00');
        expect(timed.statements).toHaveLength(1);
        expect(metricOf(timed.statements[0], MetricType.Duration)).toBeDefined();

        const roundsOnly = parseScript('(3) Pullups');
        expect(roundsOnly.statements).toHaveLength(1);
        expect(metricOf(roundsOnly.statements[0], MetricType.Rounds)?.value).toBe(3);
    });

    it('repeated parses are deterministic', () => {
        const source = '5x5 Back Squat @100kg\n\n(21-15-9) Thruster';
        expect(JSON.stringify(parseScript(source).statements))
            .toBe(JSON.stringify(parseScript(source).statements));
    });
});
