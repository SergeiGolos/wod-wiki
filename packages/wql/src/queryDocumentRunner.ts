/**
 * QueryDocumentRunner — the ONE execution path for query documents
 * (wayfinder datadog-analytics ticket 19, per the shared query execution
 * contract). Explorer, dashboard route, embedded note queries, and CodeMirror
 * previews all evaluate through this runner; no surface runs queries itself.
 *
 * Per document run:
 *   1. token substitution (`$name` → active parameter values, raw text);
 *   2. parse as a QueryDocument (degenerate single query = legacy body);
 *   3. AST rollup inspection — `calc.*`-class targets trigger the host's
 *      rollup-ensure ONCE per run (never string matching over query text);
 *   4. one captured execution context threads every window resolution;
 *   5. family dispatch: aggregate → aggregate run, find → runFind,
 *      rows → runRows (cross-workout → TabularResult, scoped → RowsQueryResult).
 *
 * Zero browser dependencies — stores, catalog, and evaluator are injected.
 */

import { QueryDocumentRunner as FormulaAwareRunner, type DocumentResult, type DocumentOutput, type FormulaEvaluator } from './documentRunner';
import { parseDocument, serializeDocument } from './document';
import type { ExecutionContext } from './calendar';
import type { DocumentAssignment } from './document';
import type { ParsedAggregateQuery } from './wql';

export interface RollupTarget {
    /** The calc target key, e.g. `calc.acwr`. */
    key: string;
}

export interface QueryDocumentRunnerHost {
    runAggregate(queryText: string, overrides: {
        groupBy?: string[];
        window?: import('./wql').QueryWindow;
        context?: ExecutionContext;
    }): Promise<{
        series?: DocumentOutput['series'];
        unit?: string;
        error?: string;
    }>;
    runRows?(queryText: string, context?: ExecutionContext): Promise<{
        kind: 'rows';
        table?: import('./QueryService').TabularResult;
        runs?: unknown[];
        error?: string;
    }>;
    runFind?(queryText: string, context?: ExecutionContext): Promise<{
        kind: 'find';
        notes?: unknown[];
        blocks?: unknown[];
        efforts?: unknown[];
        error?: string;
    }>;
    /** Host rollup driver: recompute-on-open for `calc.*` facts. Must skip
     *  already-up-to-date prerequisites (no ensure→refresh loop). */
    rollupEnsure?: () => Promise<void>;
}

export interface SharedRunnerOptions {
    formulaEvaluator?: FormulaEvaluator;
    /** One captured execution context per document run (ticket 12). */
    context?: ExecutionContext;
    /** Host default range — applies only when the document has no window. */
    rangeStart?: number;
    rangeEnd?: number;
    /** Active token values (frontmatter controls, dashboard controls). */
    tokens?: Record<string, string>;
}

const ROLLUP_TARGETS = ['calc.acwr', 'calc.monotony', 'calc.strain'];

export class QueryDocumentRunner {
    private readonly formulaRunner: FormulaAwareRunner;
    private readonly host: QueryDocumentRunnerHost;
    private readonly initialOptions: SharedRunnerOptions;
    private captured: SharedRunnerOptions;

    constructor(host: QueryDocumentRunnerHost, options: SharedRunnerOptions = {}) {
        this.host = host;
        this.initialOptions = options;
        this.captured = options;
        // The formula-aware document evaluation (ticket 17) drives the
        // document semantics; this runner adds tokens, rollup ensure,
        // context capture, and family dispatch around it.
        this.formulaRunner = new FormulaAwareRunner(async (queryText, overrides) => {
            if (overrides.window) {
                queryText = appendSuffixes(queryText, overrides.window, overrides.groupBy);
            }
            return this.host.runAggregate(queryText, { context: this.captured?.context, window: overrides.window });
        }, {
            formulaEvaluator: (host as { formulaEvaluator?: FormulaEvaluator }).formulaEvaluator,
            // Ticket 19 family dispatch — host hooks surface the tabular and
            // find results through the document outputs.
            runRows: (queryText) => (host.runRows?.(queryText, this.captured?.context) ?? Promise.resolve({})) as Promise<{ table?: unknown; runs?: unknown[]; error?: string }>,
            runFind: (queryText) => (host.runFind?.(queryText, this.captured?.context) ?? Promise.resolve({})) as Promise<{ notes?: unknown[]; blocks?: unknown[]; error?: string }>,
        });
    }

    /**
     * Run one document. `runOptions` override construction-time captures
     * (tokens, context) — one capture per run either way.
     */
    async run(text: string, runOptions: SharedRunnerOptions = {}): Promise<DocumentResult> {
        this.captured = {
            ...this.initialOptions,
            ...runOptions,
            tokens: { ...this.initialOptions.tokens, ...runOptions.tokens },
        };

        // 1. Token substitution — raw text at execution time.
        const substituted = substituteTokens(text, this.captured.tokens ?? {});

        // 3. AST rollup inspection on the substituted text: a calc.* target
        // in the parsed head triggers the host ensure exactly once.
        const parsed = parseDocument(substituted);
        if (parsed.doc.assignments.some(
            (a: DocumentAssignment) => a.parsed?.family === 'aggregate' && consumesRollupFacts(a.parsed),
        )) {
            await this.host.rollupEnsure?.();
        }

        // 4+5. Document evaluation — family dispatch flows through the host
        // hooks (rows/find queries run in the aggregate hook, which the host
        // implements by dispatching on the parsed family).
        return this.formulaRunner.run(substituted);
    }
}

/** Append defaults window/groupBy as textual suffixes when merging down. */
function appendSuffixes(queryText: string, window: import('./wql').QueryWindow, groupBy?: string[]): string {
    let text = queryText;
    if (groupBy && groupBy.length > 0 && !/by\s*\{/.test(text)) {
        text += ` by {${groupBy.join(', ')}}`;
    }
    if (window.kind === 'relative' && !/\blast\b/.test(text)) {
        text += ` last ${window.size}${window.unit}`;
    } else if (window.kind === 'range' && !/\bfrom\b/.test(text)) {
        text += ` from ${window.start}${window.end ? ` to ${window.end}` : ''}`;
    }
    return text;
}

/** Substitute `$name` tokens with active parameter values (raw text). */
export function substituteTokens(text: string, tokens: Record<string, string>): string {
    return text.replace(/\$([A-Za-z_][\w-]*)/g, (match, name: string) => {
        const value = tokens[name];
        return value !== undefined ? value : match;
    });
}

/**
 * AST rollup inspection (replaces `.includes('calc.')` string sniffing):
 * true when the parsed aggregate head's metric is a calc target whose
 * derivation depends on workload rollup facts.
 */
export function consumesRollupFacts(parsed: ParsedAggregateQuery): boolean {
    return ROLLUP_TARGETS.includes(parsed.metric);
}

/** Re-export for surface parity with the ticket-17 module. */
export { parseDocument, serializeDocument };
