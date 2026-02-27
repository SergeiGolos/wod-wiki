import { ICodeStatement } from './CodeStatement';
import { ICodeFragment, FragmentType } from './CodeFragment';
import { CodeMetadata } from './CodeMetadata';
import { TimeSpan } from '../../runtime/models/TimeSpan';
import { IFragmentSource, FragmentFilter } from '../contracts/IFragmentSource';
import { resolveFragmentPrecedence, ORIGIN_PRECEDENCE } from '../utils/fragmentPrecedence';

/**
 * Output statement types indicating what kind of result this represents.
 *
 * - 'segment': A timed portion of execution (e.g., a round, an effort interval)
 * - 'milestone': A notable event during execution (e.g., halfway point, personal record)
 * - 'system': Debug/diagnostic output from lifecycle events (push, pop, next, event-action)
 * - 'event': Tracks external stimuli or internal triggers (e.g., 'next', 'timer')
 * - 'group': Identified segment with children
 * - 'load': Initial script state
 * - 'compiler': Behavior configuration and setup
 */
export type OutputStatementType = 'segment' | 'milestone' | 'system' | 'event' | 'group' | 'load' | 'compiler';

/**
 * IOutputStatement extends ICodeStatement to represent runtime-generated output.
 * 
 * This is the **return type** of execution — what "came out" of running a statement.
 * While ICodeStatement represents the input (what was parsed), IOutputStatement
 * represents the output (what was executed, including timing and collected data).
 * 
 * ## Time terminology (docs/architecture/time-terminology.md)
 *
 * The canonical time data lives in the **fragments** array:
 * - `FragmentType.Spans`   — **Time**: raw TimeSpan[] recordings the block tracks
 * - `FragmentType.Elapsed` — **Elapsed**: Σ(end − start) per span (active time)
 * - `FragmentType.Total`   — **Total**: lastEnd − firstStart (wall-clock bracket)
 * - `FragmentType.Duration` — **Duration**: parser-defined planned target
 * - `FragmentType.SystemTime` — **TimeStamp**: system Date.now() when logged
 *
 * The direct properties `spans`, `elapsed`, `total` are **deprecated proxies**
 * kept for backward compatibility. Prefer `getFragment(FragmentType.Elapsed)`,
 * etc., or use `getDisplayFragments()` for UI rendering.
 */
export interface IOutputStatement extends ICodeStatement {
    /** The type of output this statement represents */
    readonly outputType: OutputStatementType;

    /** Execution timing — when this output occurred */
    readonly timeSpan: TimeSpan;

    /**
     * **Time** — raw TimeSpan[] from the block's timer memory.
     * 
     * @deprecated Access via `getFragment(FragmentType.Spans)` or
     * `getAllFragmentsByType(FragmentType.Spans)` instead.
     * This property is a convenience proxy over the SpansFragment.
     * 
     * @see docs/architecture/time-terminology.md
     */
    readonly spans: ReadonlyArray<TimeSpan>;

    /**
     * **Elapsed** — pause-aware active time in milliseconds.
     * 
     * @deprecated Access via `getFragment(FragmentType.Elapsed)?.value` instead.
     * This property is a convenience proxy computed from SpansFragment data.
     * 
     * @see docs/architecture/time-terminology.md
     */
    readonly elapsed: number;

    /**
     * **Total** — wall-clock bracket in milliseconds.
     * 
     * @deprecated Access via `getFragment(FragmentType.Total)?.value` instead.
     * This property is a convenience proxy computed from SpansFragment data.
     * 
     * @see docs/architecture/time-terminology.md
     */
    readonly total: number;

    /** The source statement ID that triggered this output (if any) */
    readonly sourceStatementId?: number;

    /** The block key that produced this output */
    readonly sourceBlockKey: string;

    /**
     * Stack level (depth) when this output was emitted.
     * 0 = root block, 1 = first child, etc.
     * Used for visualizing output hierarchy.
     */
    readonly stackLevel: number;

    /**
     * Fragments on IOutputStatement are runtime-generated.
     * They should have `origin: 'runtime'` or `origin: 'user'`.
     */
    readonly fragments: ICodeFragment[];

    /** Metadata mapping for fragments. Each fragment can have an optional associated meta object. */
    readonly fragmentMeta: Map<ICodeFragment, CodeMetadata>;

    /**
     * The reason this block completed, if applicable.
     * 
     * Propagated from the block's `completionReason` during unmount.
     * Enables downstream consumers to distinguish:
     * - `'user-advance'` — self-pop (user clicked next)
     * - `'forced-pop'` — parent-pop (parent timer expired)
     * - `'timer-expired'` — block's own timer completed
     * - `'rounds-complete'` — all rounds finished
     * 
     * Only present on `'completion'` output type.
     */
    readonly completionReason?: string;
}

/**
 * Options for creating an OutputStatement.
 * 
 * Time data should be provided primarily through `fragments` (SpansFragment,
 * ElapsedFragment, TotalFragment). The `spans` option is a **deprecated**
 * convenience — it populates the legacy `OutputStatement.spans` property
 * and is used to compute the deprecated `.elapsed` / `.total` proxies.
 */
export interface OutputStatementOptions {
    /** Output type classification */
    outputType: OutputStatementType;

    /** Execution timing */
    timeSpan: TimeSpan;

    /**
     * @deprecated Pass time data via SpansFragment in `fragments` instead.
     * Raw time spans from the block's timer memory.
     * When provided, the deprecated `elapsed` and `total` properties are
     * computed from these spans.
     */
    spans?: TimeSpan[];

    /** The block key that produced this output */
    sourceBlockKey: string;

    /** Stack level (depth) when this output was emitted */
    stackLevel: number;

    /** The source statement ID (optional) */
    sourceStatementId?: number;

    /** Runtime-collected fragments */
    fragments?: ICodeFragment[];

    /** Map of fragment to metadata */
    fragmentMeta?: Map<ICodeFragment, CodeMetadata>;

    /** Reason the block completed (e.g., 'user-advance', 'forced-pop') */
    completionReason?: string;

    /** Parent output statement ID (for hierarchy) */
    parent?: number;

    /** Child output statement groups (for hierarchy) */
    children?: number[][];

    /** Optional hints from the source */
    hints?: Set<string>;
}

/**
 * Concrete implementation of IOutputStatement.
 * Created by the runtime when a block unmounts.
 *
 * Direct time properties (`spans`, `elapsed`, `total`) are **deprecated
 * proxies** — canonical data lives in the `fragments` array as
 * SpansFragment, ElapsedFragment, and TotalFragment.
 * Use `getFragment()` / `getDisplayFragments()` for new code.
 */
export class OutputStatement implements IOutputStatement, IFragmentSource {
    private static nextId = 1000000; // Start at a high number to avoid collision with parsed statement IDs

    readonly id: number;
    readonly outputType: OutputStatementType;
    readonly timeSpan: TimeSpan;

    /**
     * @deprecated Use `getFragment(FragmentType.Spans)` instead.
     * Convenience proxy over SpansFragment data.
     */
    readonly spans: ReadonlyArray<TimeSpan>;

    readonly sourceStatementId?: number;
    readonly sourceBlockKey: string;
    readonly stackLevel: number;
    readonly fragments: ICodeFragment[];
    readonly fragmentMeta: Map<ICodeFragment, CodeMetadata>;

    /**
     * @deprecated Use `getFragment(FragmentType.Elapsed)?.value` instead.
     * Convenience proxy computed from SpansFragment data.
     */
    readonly elapsed: number;

    /**
     * @deprecated Use `getFragment(FragmentType.Total)?.value` instead.
     * Convenience proxy computed from SpansFragment data.
     */
    readonly total: number;

    readonly completionReason?: string;
    readonly parent?: number;
    readonly children: number[][];
    readonly isLeaf: boolean;
    readonly hints?: Set<string>;
    readonly meta: CodeMetadata;

    constructor(options: OutputStatementOptions) {
        this.id = OutputStatement.nextId++;
        this.outputType = options.outputType;
        this.timeSpan = options.timeSpan;
        this.spans = options.spans ? [...options.spans] : [];
        this.sourceBlockKey = options.sourceBlockKey;
        this.sourceStatementId = options.sourceStatementId;
        this.stackLevel = options.stackLevel;
        this.fragments = options.fragments ?? [];
        this.fragmentMeta = options.fragmentMeta ?? new Map();
        this.completionReason = options.completionReason;
        this.parent = options.parent;
        this.children = options.children ?? [];
        this.isLeaf = this.children.length === 0;
        this.hints = options.hints;

        this.elapsed = this.calculateElapsed();
        this.total = this.calculateTotal();

        // Placeholder metadata — OutputStatements are runtime-generated, not parsed.
        this.meta = { line: 0, columnStart: 0, columnEnd: 0, startOffset: 0, endOffset: 0, length: 0, raw: '' };
    }

    // ═══════════════════════════════════════════════════════════════
    // IFragmentSource implementation
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get display-ready fragments after precedence resolution.
     * For each FragmentType present, returns fragments from the highest-
     * precedence origin tier.
     */
    getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
        let frags = this.fragments;
        if (filter?.types) {
            const types = new Set(filter.types);
            frags = frags.filter(f => types.has(f.fragmentType));
        }
        if (filter?.excludeTypes) {
            const exclude = new Set(filter.excludeTypes);
            frags = frags.filter(f => !exclude.has(f.fragmentType));
        }
        if (filter?.origins) {
            const origins = new Set(filter.origins);
            frags = frags.filter(f => f.origin !== undefined && origins.has(f.origin));
        }
        return resolveFragmentPrecedence(frags);
    }

    /**
     * Get the highest-precedence single fragment of a given type.
     */
    getFragment(type: FragmentType): ICodeFragment | undefined {
        const matches = this.fragments.filter(f => f.fragmentType === type);
        if (matches.length === 0) return undefined;
        const resolved = resolveFragmentPrecedence(matches);
        return resolved[0];
    }

    /**
     * Get ALL fragments of a given type, sorted by precedence (highest first).
     * Unlike `getFragment()`, this returns every tier, not just the winning one.
     */
    getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
        const matches = this.fragments.filter(f => f.fragmentType === type);
        // Sort by precedence rank (lowest = highest precedence = first)
        return [...matches].sort((a, b) => {
            const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
            const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
            return rankA - rankB;
        });
    }

    /**
     * Check if any fragment of this type exists.
     */
    hasFragment(type: FragmentType): boolean {
        return this.fragments.some(f => f.fragmentType === type);
    }

    /**
     * Raw, unfiltered fragments. No precedence resolution.
     * Returns a defensive copy so mutations don't affect internal state.
     */
    get rawFragments(): ICodeFragment[] {
        return [...this.fragments];
    }

    // ═══════════════════════════════════════════════════════════════
    // Deprecated proxy computation (kept for backward compat)
    // ═══════════════════════════════════════════════════════════════

    private calculateElapsed(): number {
        if (this.spans.length === 0) {
            return this.timeSpan.duration;
        }
        return this.spans.reduce((sum, span) => sum + span.duration, 0);
    }

    private calculateTotal(): number {
        if (this.spans.length === 0) {
            return this.timeSpan.duration;
        }
        const firstStart = this.spans[0].started;
        const lastSpan = this.spans[this.spans.length - 1];
        const lastEnd = lastSpan.ended ?? Date.now();
        return Math.max(0, lastEnd - firstStart);
    }

    /**
     * Reset the ID counter (useful for testing)
     */
    static resetIdCounter(startAt: number = 1000000): void {
        OutputStatement.nextId = startAt;
    }
}
