import { ICodeStatement } from './CodeStatement';
import { ICodeFragment, FragmentType } from './CodeFragment';
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
 * Key differences from ICodeStatement:
 * - Has execution timing (TimeSpan)
 * - Has an output type classification
 * - Fragments have runtime origins ('runtime' | 'user')
 * - Links back to the source statement that triggered it
 * 
 * @example
 * ```typescript
 * // A completion output for a timer block
 * const output: IOutputStatement = {
 *   id: 1001,
 *   outputType: 'completion',
 *   timeSpan: new TimeSpan(startTime, endTime),
 *   sourceStatementId: 5,
 *   sourceBlockKey: 'block-abc-123',
 *   fragments: [
 *     { type: 'timer-result', origin: 'runtime', value: 45000 }
 *   ],
 *   // ... inherited from ICodeStatement
 * };
 * ```
 */
export interface IOutputStatement extends ICodeStatement {
    /** The type of output this statement represents */
    readonly outputType: OutputStatementType;

    /** Execution timing — when this output occurred */
    readonly timeSpan: TimeSpan;

    /**
     * Raw time spans from the block's timer memory.
     * 
     * Each span represents a continuous period of active (unpaused) execution.
     * A "timestamp" is a degenerate span where `started === ended` (zero duration).
     * 
     * Time semantics derived from spans:
     * - **elapsed** = sum of all span durations (pause-aware active time)
     * - **total** = from start of first span to end of last span (wall-clock bracket)
     * 
     * Empty array when no timer spans are available (e.g., non-timer leaf blocks
     * that only have wall-clock timestamps via `timeSpan`).
     */
    readonly spans: ReadonlyArray<TimeSpan>;

    /**
     * Pause-aware elapsed time in milliseconds.
     * 
     * Computed as the sum of all individual span durations. This excludes
     * any paused time between spans. Falls back to `timeSpan.duration`
     * when no spans are available.
     */
    readonly elapsed: number;

    /**
     * Total wall-clock time in milliseconds from start of first span
     * to end of last span. Includes paused time between spans.
     * 
     * Falls back to `timeSpan.duration` when no spans are available.
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
 * Options for creating an OutputStatement
 */
export interface OutputStatementOptions {
    /** Output type classification */
    outputType: OutputStatementType;

    /** Execution timing */
    timeSpan: TimeSpan;

    /**
     * Raw time spans from the block's timer memory.
     * Each span represents a continuous period of active execution.
     * A timestamp (start === end) has zero duration.
     * When provided, `elapsed` and `total` are computed from these spans.
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
 */
export class OutputStatement implements IOutputStatement, IFragmentSource {
    private static nextId = 1000000; // Start at a high number to avoid collision with parsed statement IDs

    readonly id: number;
    readonly outputType: OutputStatementType;
    readonly timeSpan: TimeSpan;
    readonly spans: ReadonlyArray<TimeSpan>;
    readonly sourceStatementId?: number;
    readonly sourceBlockKey: string;
    readonly stackLevel: number;
    readonly fragments: ICodeFragment[];
    readonly elapsed: number;
    readonly total: number;
    readonly completionReason?: string;
    readonly parent?: number;
    readonly children: number[][];
    readonly isLeaf: boolean;
    readonly hints?: Set<string>;
    readonly meta: { line: number; columnStart: number; columnEnd: number; startOffset: number; endOffset: number; length: number; raw: string };

    constructor(options: OutputStatementOptions) {
        this.id = OutputStatement.nextId++;
        this.outputType = options.outputType;
        this.timeSpan = options.timeSpan;
        this.spans = options.spans ? [...options.spans] : [];
        this.sourceBlockKey = options.sourceBlockKey;
        this.sourceStatementId = options.sourceStatementId;
        this.stackLevel = options.stackLevel;
        this.fragments = options.fragments ?? [];
        this.completionReason = options.completionReason;
        this.parent = options.parent;
        this.children = options.children ?? [];
        this.isLeaf = this.children.length === 0;
        this.hints = options.hints;

        this.elapsed = this.calculateElapsed();
        this.total = this.calculateTotal();
    }

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
