import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { IDialect } from '@/core/models/Dialect';
import { UnitsDialect } from './UnitsDialect';
import { CrossFitDialect } from './CrossFitDialect';
import { WodDialect } from './WodDialect';
import { CardioDialect } from './CardioDialect';
import { YogaDialect } from './YogaDialect';
import { HabitsDialect } from './HabitsDialect';
import { ClimbDialect } from './ClimbDialect';

/**
 * DialectStack — the single ordered place where the base Units Dialect and
 * the sport/personal Dialects are composed and run.
 *
 * Replaces both:
 * - The parse-time `baseUnits` singleton in `lezer-mapper.ts` (hardcoded to
 *   one Dialect with no extension hook).
 * - The empty compile-time `DialectRegistry` that was removed from `JitCompiler`
 *   in S5a (no production path ever registered a Dialect).
 *
 * Ordering: base Units Dialect runs first (fuses bare Number + unit-word into
 * dimensioned metrics); sport Dialects run after (they observe fused units);
 * personal-overrides run last (a `CONTEXT.md` concept that was previously
 * impossible). Later-wins metric merge and hint accumulation are handled by
 * the per-statement `transform` + `analyze` + append loop.
 */
export class DialectStack {
    private readonly dialects: IDialect[];

    constructor(dialects: IDialect[]) {
        this.dialects = dialects;
    }

    /**
     * Process a single statement through every Dialect in order.
     * Each Dialect's `transform` runs before its `analyze`, and the emitted
     * metrics (hint markers + domain values) are appended onto the statement.
     */
    process(statement: ICodeStatement): void {
        for (const dialect of this.dialects) {
            dialect.transform?.(statement);
            const analysis = dialect.analyze(statement);
            if (analysis.metrics?.length) {
                statement.metrics.add(...analysis.metrics);
            }
        }
    }

    /** Process a batch of statements. */
    processAll(statements: ICodeStatement[]): void {
        for (const statement of statements) {
            this.process(statement);
        }
    }

    /** The ordered Dialect list (for inspection / testing). */
    get list(): readonly IDialect[] {
        return this.dialects;
    }
}

/**
 * The production Dialect Stack: base Units → all sport Dialects.
 *
 * Sport Dialects finally run in production (previously they existed but were
 * never registered). This is a behavior change — new hints may surface in
 * production. The before/after hint snapshot (see `05-dialect-stack.md`
 * Implementation) is the guard.
 *
 * To register a personal-overrides Dialect, use {@link createDialectStack}
 * with a custom list.
 */
export function createDialectStack(overrides: IDialect[] = []): DialectStack {
    return new DialectStack([
        // Base — fuses bare Number + unit-word into dimensioned metrics.
        // Must run first so sport Dialects see fused units.
        new UnitsDialect(),
        // Sport Dialects — emit hints (workout.amrap, workout.emom, etc.)
        // and domain-specific metrics (climb grades, cardio distances).
        new CrossFitDialect(),
        new WodDialect(),
        new CardioDialect(),
        new YogaDialect(),
        new HabitsDialect(),
        new ClimbDialect(),
        // Personal-overrides Dialect last (later wins). A `CONTEXT.md`
        // concept that was impossible before the Stack existed.
        ...overrides,
    ]);
}

/**
 * Module singleton — the default Dialect Stack used by the parse pipeline.
 * Equivalent to the old `const baseUnits = new UnitsDialect()` but with the
 * full sport-Dialect set wired.
 */
export const dialectStack: DialectStack = createDialectStack();
