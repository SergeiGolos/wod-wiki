import { ICodeStatement } from './CodeStatement';
import { ICodeFragment, FragmentType } from './CodeFragment';
import { TimeSpan } from '../../runtime/models/TimeSpan';
import { IFragmentSource, FragmentFilter } from '../contracts/IFragmentSource';
import { resolveFragmentPrecedence, ORIGIN_PRECEDENCE } from '../utils/fragmentPrecedence';

/**
 * Output statement types indicating what kind of result this represents.
 * 
 * - 'segment': A timed portion of execution (e.g., a round, an effort interval)
 * - 'completion': Block finished executing normally
 * - 'milestone': A notable event during execution (e.g., halfway point, personal record)
 * - 'label': Display-only output (e.g., "Rest" indicator, phase markers)
 * - 'metric': Recorded statistic (e.g., total reps, average pace)
 */
export type OutputStatementType = 'segment' | 'completion' | 'milestone' | 'label' | 'metric';

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
    readonly sourceStatementId?: number;
    readonly sourceBlockKey: string;
    readonly stackLevel: number;
    readonly fragments: ICodeFragment[];
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
        this.sourceBlockKey = options.sourceBlockKey;
        this.sourceStatementId = options.sourceStatementId;
        this.stackLevel = options.stackLevel;
        this.fragments = options.fragments ?? [];
        this.completionReason = options.completionReason;
        this.parent = options.parent;
        this.children = options.children ?? [];
        this.isLeaf = this.children.length === 0;
        this.hints = options.hints;

        // Output statements don't have source code metadata, but we need to satisfy the interface
        this.meta = {
            line: 0,
            columnStart: 0,
            columnEnd: 0,
            startOffset: 0,
            endOffset: 0,
            length: 0,
            raw: ''
        };
    }

    // ── IFragmentSource ─────────────────────────────────────────────

    getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
        return resolveFragmentPrecedence([...this.fragments], filter);
    }

    getFragment(type: FragmentType): ICodeFragment | undefined {
        const all = this.getAllFragmentsByType(type);
        return all.length > 0 ? all[0] : undefined;
    }

    getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
        const ofType = this.fragments.filter(f => f.fragmentType === type);
        if (ofType.length === 0) return [];

        // Sort by precedence (highest first = lowest rank number first)
        return [...ofType].sort((a, b) => {
            const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
            const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
            return rankA - rankB;
        });
    }

    /**
     * Check if a fragment of a given type exists.
     */
    hasFragment(type: FragmentType): boolean {
        return this.fragments.some(f => f.fragmentType === type);
    }

    get rawFragments(): ICodeFragment[] {
        return [...this.fragments];
    }

    /**
     * Reset the ID counter (useful for testing)
     */
    static resetIdCounter(startAt: number = 1000000): void {
        OutputStatement.nextId = startAt;
    }
}
