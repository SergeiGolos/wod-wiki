import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { IDialect } from '@/core/models/Dialect';
import { Registry } from '@/core/Registry';
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
    private readonly dialects?: readonly IDialect[];
    private readonly registry?: Registry<IDialect>;

    /**
     * Accepts either a frozen array (the `createDialectStack(overrides)` /
     * test-fixture case) or a live `Registry<IDialect>` (the production
     * singleton below). When constructed from a registry, every `process()`
     * call re-reads `registry.list()`, so a `dialectRegistry.register(...)`
     * made by a consumer after import is honored on the next parse — a
     * frozen array snapshot taken once at module-load time would not see it.
     */
    constructor(dialects: readonly IDialect[] | Registry<IDialect>) {
        if (dialects instanceof Registry) {
            this.registry = dialects;
        } else {
            this.dialects = dialects;
        }
    }

    private get effectiveDialects(): readonly IDialect[] {
        return this.registry ? this.registry.list() : (this.dialects ?? []);
    }

    /**
     * Process a single statement through every Dialect in order.
     * Each Dialect's `transform` runs before its `analyze`, and the emitted
     * metrics (hint markers + domain values) are appended onto the statement.
     */
    process(statement: ICodeStatement): void {
        for (const dialect of this.effectiveDialects) {
            dialect.transform?.(statement);
            const analysis = dialect.analyze(statement);
            if (analysis?.metrics?.length) {
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

    /** The ordered Dialect list (for inspection / testing). Live when registry-backed. */
    get list(): readonly IDialect[] {
        return this.effectiveDialects;
    }
}

/**
 * Consumer-facing dialect registry, pre-seeded with the built-in dialects.
 *
 * Replaces the previous `createDialectStack(overrides)` parameter as the way
 * to extend the dialect set. Consumer code can call
 * `dialectRegistry.register(new MyDialect())` to add a personal-overrides
 * dialect, and the production `dialectStack` below reads its ordered list
 * from this registry.
 *
 * Built-ins can be removed or overridden by `id`.
 */
export const dialectRegistry = new Registry<IDialect>([
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
]);

/**
 * Build a DialectStack from an explicit list — preserved signature for
 * tests and the `personal-overrides` pattern. Production uses
 * {@link dialectStack} (which reads the registry) via `extractStatements`.
 */
export function createDialectStack(overrides: IDialect[] = []): DialectStack {
    return new DialectStack([
        // Base — fuses bare Number + unit-word into dimensioned metrics.
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
 *
 * Registry-backed (not a frozen array snapshot): every `process()`/`processAll()`
 * call re-reads {@link dialectRegistry} live, so a consumer `dialectRegistry.register(...)`
 * call is honored on the very next parse, no matter when it happens relative to
 * module load. Equivalent to the old `const baseUnits = new UnitsDialect()` but
 * with the full sport-Dialect set wired, and genuinely extensible.
 */
export const dialectStack: DialectStack = new DialectStack(dialectRegistry);
