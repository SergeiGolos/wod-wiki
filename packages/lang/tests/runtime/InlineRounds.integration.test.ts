import { describe, it, expect, afterEach } from 'vitest';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { RuntimeStack } from '../../src/runtime/RuntimeStack';
import { EventBus } from '../../src/runtime/events';
import { createMockClock, type MockClock } from '../../src/runtime/RuntimeClock';
import { createParser } from '../../src/parser/parserInstance';
import type { WhiteboardScript } from '../../src/parser/WhiteboardScript';
import { createCompiler } from '../../src/runtime/services/runtimeServices';
import { StartSessionAction } from '../../src/runtime/actions/stack/StartSessionAction';
import { toStoredOutputStatement } from '../../src/conversion/toStoredOutputStatement';
import {
    MetricType,
    type IMetric,
    type IOutputStatement,
} from '@bitcobblers/wod-wiki-core';

/**
 * Inline prescribed rounds with an exercise — `(5) 5 Back Squat @100kg` on
 * one line — must execute through the real parser + createCompiler +
 * ScriptRuntime as a Rounds block with an effort child, recording five
 * exercise segment metric groups. MockClock only; no fake strategies.
 */

const START = new Date('2024-01-01T12:00:00Z');
// Advance-before-dispatch: the completion of child k happens at next k+1,
// so its segment elapsed is exactly advances[k-1].
const ADVANCES = [10_000, 20_000, 30_000, 40_000, 50_000, 60_000];

interface Session {
    runtime: ScriptRuntime;
    script: WhiteboardScript;
    clock: MockClock;
    outputs: IOutputStatement[];
}

const sessions: Session[] = [];

function startSession(script: WhiteboardScript): Session {
    const clock = createMockClock(new Date(START.getTime()));
    const runtime = new ScriptRuntime(
        script,
        createCompiler(),
        { stack: new RuntimeStack(), clock, eventBus: new EventBus() },
    );
    const outputs: IOutputStatement[] = [];
    runtime.subscribeToOutput(o => outputs.push(o));
    runtime.do(new StartSessionAction());
    const session: Session = { runtime, script, clock, outputs };
    sessions.push(session);
    return session;
}

function next(s: Session, advanceMs = 0): void {
    if (advanceMs) s.clock.advance(advanceMs);
    s.runtime.handle({
        name: 'next',
        timestamp: s.clock.currentDate,
        data: { source: 'inline-rounds-test' },
    });
}

function drive(s: Session, advances: number[] = ADVANCES, maxNexts = 16): void {
    for (let i = 0; i < maxNexts && s.runtime.stack.count > 0; i++) {
        next(s, advances[i % advances.length]);
    }
}

function metricOf(metrics: { toArray(): IMetric[] }, type: MetricType): IMetric | undefined {
    return metrics.toArray().find(m => m.type === type);
}

function effortSegments(outputs: IOutputStatement[]): IOutputStatement[] {
    return outputs.filter(
        o => o.outputType === 'segment' && o.metrics.some(m => m.type === MetricType.Effort),
    );
}

function parse(source: string): WhiteboardScript {
    return createParser().read(source) as WhiteboardScript;
}

afterEach(() => {
    for (const s of sessions) s.runtime.dispose();
    sessions.length = 0;
});

describe('Inline rounds with exercise — real runtime integration', () => {

    it('(5) 5 Back Squat @100kg runs as SessionRoot/Rounds/effort with five exercise segments', () => {
        const script = parse('(5) 5 Back Squat @100kg');
        expect(script.statements).toHaveLength(2);
        const [parent, child] = script.statements;
        expect(parent.children).toEqual([[child.id]]);

        const s = startSession(script);

        next(s);
        expect(s.runtime.stack.blocks.map(b => b.blockType)).toEqual([
            'effort',
            'Rounds',
            'SessionRoot',
        ]);
        const roundsParent = s.runtime.stack.blocks[1];
        const parentRounds = roundsParent.getMemoryByTag('metric:display')
            .flatMap(loc => loc.metrics.toArray())
            .find(m => m.type === MetricType.Rounds);
        expect(parentRounds?.value).toBe(5);

        drive(s);
        expect(s.runtime.stack.count).toBe(0);

        const segments = effortSegments(s.outputs);
        expect(segments).toHaveLength(5);

        for (const seg of segments) {
            expect(seg.sourceStatementId).toBe(child.id);
            expect(metricOf(seg.metrics, MetricType.Rep)?.value).toBe(5);
            expect(metricOf(seg.metrics, MetricType.Effort)?.value).toBe('Back Squat');
            expect(metricOf(seg.metrics, MetricType.Resistance)?.value).toEqual({ amount: 100, unit: 'kg' });
        }
        expect(segments.map(seg => metricOf(seg.metrics, MetricType.Elapsed)?.value))
            .toEqual([10_000, 20_000, 30_000, 40_000, 50_000]);
    });

    it('asymmetrical (5) 3 records five segments with rep 3 and no effort', () => {
        const script = parse('(5) 3');
        const child = script.statements[1];

        const s = startSession(script);
        drive(s);
        expect(s.runtime.stack.count).toBe(0);

        const repSegments = s.outputs.filter(
            o => o.outputType === 'segment' && o.metrics.some(m => m.type === MetricType.Rep),
        );
        expect(repSegments).toHaveLength(5);
        for (const seg of repSegments) {
            expect(seg.sourceStatementId).toBe(child.id);
            expect(metricOf(seg.metrics, MetricType.Rep)?.value).toBe(3);
            expect(metricOf(seg.metrics, MetricType.Effort)).toBeUndefined();
        }
    });

    it('ladder (21-15-9) Thruster promotes per-round reps 21, 15, 9', () => {
        const script = parse('(21-15-9) Thruster');
        const child = script.statements[1];

        const s = startSession(script);
        drive(s);
        expect(s.runtime.stack.count).toBe(0);

        const segments = effortSegments(s.outputs);
        expect(segments).toHaveLength(3);
        expect(segments.map(seg => metricOf(seg.metrics, MetricType.Rep)?.value))
            .toEqual([21, 15, 9]);
        for (const seg of segments) {
            expect(seg.sourceStatementId).toBe(child.id);
            expect(metricOf(seg.metrics, MetricType.Effort)?.value).toBe('Thruster');
        }
    });

    it('nested inline with plain sibling lowers without recursion or interference', () => {
        const script = parse('(2)\n  (3) 5 Back Squat @100kg\n  2 Pushup');
        const [outer, innerParent, innerChild, pushup] = script.statements;
        expect(outer.children).toEqual([[innerParent.id], [pushup.id]]);
        expect(innerParent.children).toEqual([[innerChild.id]]);

        const s = startSession(script);

        next(s);
        expect(s.runtime.stack.blocks.map(b => b.blockType)).toEqual([
            'effort',
            'Rounds',
            'Rounds',
            'SessionRoot',
        ]);

        drive(s, Array(9).fill(1_000), 20);
        expect(s.runtime.stack.count).toBe(0);

        const segments = effortSegments(s.outputs);
        expect(segments).toHaveLength(8);

        expect(segments.map(seg => metricOf(seg.metrics, MetricType.Rep)?.value))
            .toEqual([5, 5, 5, 2, 5, 5, 5, 2]);
        const squats = segments.filter(seg => seg.sourceStatementId === innerChild.id);
        expect(squats).toHaveLength(6);
        for (const seg of squats) {
            expect(seg.sourceStatementId).toBe(innerChild.id);
            expect(metricOf(seg.metrics, MetricType.Effort)?.value).toBe('Back Squat');
            expect(metricOf(seg.metrics, MetricType.Resistance)?.value).toEqual({ amount: 100, unit: 'kg' });
            expect(metricOf(seg.metrics, MetricType.Rep)?.value).toBe(5);
        }
        const pushups = segments.filter(seg => seg.sourceStatementId === pushup.id);
        expect(pushups).toHaveLength(2);
        for (const seg of pushups) {
            expect(seg.sourceStatementId).toBe(pushup.id);
            expect(metricOf(seg.metrics, MetricType.Effort)?.value).toBe('Pushup');
            expect(metricOf(seg.metrics, MetricType.Rep)?.value).toBe(2);
            expect(metricOf(seg.metrics, MetricType.Resistance)).toBeUndefined();
        }
        for (const output of s.outputs) {
            if (output.sourceStatementId !== undefined) {
                expect(script.statements.map(stmt => stmt.id)).toContain(output.sourceStatementId);
            }
        }
    });

    it('normalized tree is stable across repeated runtime construction and preserves source line', () => {
        const script = parse('5x5 Back Squat @100kg');
        expect(script.statements).toHaveLength(2);
        const [parent, child] = script.statements;
        expect(parent.line).toBe(1);
        expect(child.line).toBe(1);
        expect(parent.children).toEqual([[child.id]]);
        expect(metricOf(parent.metrics, MetricType.Rounds)?.value).toBe(5);
        expect(metricOf(parent.metrics, MetricType.Rep)?.value).toBe(5);
        expect(metricOf(child.metrics, MetricType.Effort)?.value).toBe('Back Squat');
        expect(metricOf(child.metrics, MetricType.Resistance)?.value)
            .toEqual({ amount: 100, unit: 'kg' });
        const before = JSON.stringify(script.statements);

        const first = startSession(script);
        drive(first);
        const second = startSession(script);
        drive(second);

        expect(effortSegments(first.outputs)).toHaveLength(5);
        expect(effortSegments(second.outputs)).toHaveLength(5);
        expect(JSON.stringify(script.statements)).toBe(before);

        for (const session of [first, second]) {
            for (const seg of effortSegments(session.outputs)) {
                expect(seg.sourceStatementId).toBe(child.id);
                // Segment line survives to stored JSON for legacy line aggregation.
                expect(seg.line).toBe(child.line);
                expect(toStoredOutputStatement(seg).line).toBe(child.line);
            }
        }
    });
});
