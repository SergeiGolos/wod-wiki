/**
 * Parser Compliance: Parse-Then-Run Integration
 *
 * Demonstrates the "parse first, validate tree, then pass to runtime" pattern.
 * This test file uses BOTH the parser harness and the runtime session harness
 * to validate the full pipeline: parse → dialects → JIT compile → runtime.
 *
 * This is the pattern from the proposal §2.7.
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { parse } from '../helpers/parser-test-utils';
import { MetricType } from '@/core/models/Metric';
import {
    createSessionContext,
    startSession,
    userNext,
    advanceClock,
    disposeSession,
} from '../jit-compilation/helpers/session-test-utils';
import type { SessionTestContext } from '../jit-compilation/helpers/session-test-utils';

// ── Helper: current block type from runtime stack ─────────────────

function currentBlockType(ctx: SessionTestContext): string | undefined {
    return ctx.runtime.stack.current?.blockType;
}

// ── Single Effort: parse then run ─────────────────────────────────

describe('🔗 Parse-Then-Run: Single Effort (10 Pullups)', () => {
    const SCRIPT = '10 Pullups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('parser: produces correct statement tree', () => {
        parse(SCRIPT)
            .hasStatementCount(1)
            .hasNoErrors()
            .roots()[0]
                .isLeaf()
                .hasMetric(MetricType.Rep)
                .hasMetricValue(MetricType.Rep, 10)
                .hasMetric(MetricType.Effort)
                .hasMetricValue(MetricType.Effort, 'Pullups');
    });

    it('runtime: executes effort correctly', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Effort' });

        // SessionRoot + WaitingToStart
        expect(ctx.runtime.stack.count).toBe(2);

        // userNext mounts the effort
        userNext(ctx);
        expect(currentBlockType(ctx)).toMatch(/effort/i);

        // Second userNext completes the effort
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ── Countdown Timer: parse then run ───────────────────────────────

describe('🔗 Parse-Then-Run: Countdown Timer (5:00 Run)', () => {
    const SCRIPT = '5:00 Run';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('parser: produces Duration + Effort metrics', () => {
        parse(SCRIPT)
            .hasStatementCount(1)
            .hasNoErrors()
            .roots()[0]
                .hasMetric(MetricType.Duration)
                .hasMetric(MetricType.Effort)
                .hasMetricValue(MetricType.Effort, 'Run');
    });

    it('runtime: timer starts and expires', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Timer' });
        userNext(ctx);

        expect(currentBlockType(ctx)).toMatch(/timer/i);

        // Advance past halfway — timer still active
        advanceClock(ctx, 150_000);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);

        // Advance past end — timer expires
        advanceClock(ctx, 150_000);
        expect(ctx.runtime.stack.count).toBe(0);
    });
});

// ── AMRAP: parse then run ─────────────────────────────────────────

describe('🔗 Parse-Then-Run: AMRAP (10:00 AMRAP + children)', () => {
    const SCRIPT = '10:00 AMRAP\n  5 Pullups\n  10 Pushups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('parser: produces parent with 2 children + dialect hints', () => {
        const tree = parse(SCRIPT);
        tree.hasStatementCount(3).hasNoErrors();

        tree.roots()[0]
            .hasChildren(2)
            .hasMetric(MetricType.Duration)
            .hasMetric(MetricType.Effort)
            .hasMetricValue(MetricType.Effort, 'AMRAP')
            .hasHint('workout.amrap');

        tree.roots()[0].children()[0]
            .hasMetricValue(MetricType.Rep, 5)
            .hasMetricValue(MetricType.Effort, 'Pullups');

        tree.roots()[0].children()[1]
            .hasMetricValue(MetricType.Rep, 10)
            .hasMetricValue(MetricType.Effort, 'Pushups');
    });

    it('runtime: compiles and starts AMRAP session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'AMRAP' });

        // SessionRoot + WaitingToStart
        expect(ctx.runtime.stack.count).toBe(2);

        // userNext starts the AMRAP
        userNext(ctx);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
    });
});

// ── Rounds: parse then run ────────────────────────────────────────

describe('🔗 Parse-Then-Run: Rounds (3 rounds + 2 movements)', () => {
    const SCRIPT = '(3)\n  10 Air Squats\n  10 Push Ups';
    let ctx: SessionTestContext;

    afterEach(() => { if (ctx) disposeSession(ctx); });

    it('parser: produces parent with 2 children + rounds metric', () => {
        const tree = parse(SCRIPT);
        tree.hasStatementCount(3).hasNoErrors();

        const parent = tree.roots()[0];
        parent
            .hasChildren(2)
            .hasMetric(MetricType.Rounds)
            .hasMetricValue(MetricType.Rounds, 3);

        // Verify children reference parent
        for (const child of parent.children()) {
            child.hasParent(parent);
        }
    });

    it('runtime: compiles and starts rounds session', () => {
        ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'Rounds' });
        expect(ctx.runtime.stack.count).toBe(2);

        userNext(ctx);
        expect(ctx.runtime.stack.count).toBeGreaterThan(0);
    });
});
