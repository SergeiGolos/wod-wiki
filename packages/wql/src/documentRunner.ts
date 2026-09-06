/**
 * Document runner + formula evaluation (wayfinder datadog-analytics
 * ticket 17).
 *
 * - `FormulaEvaluator` is an INJECTED capability: the engine/app composition
 *   adapts lang's calc Pratt evaluator behind it. `wql` ships a small
 *   built-in pointwise arithmetic evaluator so documents evaluate without
 *   the injection (add/sub/mul/div, corr) — never a dependency on lang.
 * - Post-aggregate formulas evaluate pointwise over the ALIGNMENT DOMAIN:
 *   the intersection of input requested ranges and the union of observed
 *   group tuples. Missing operands substitute zero, flagged as
 *   missing-derived; missing-derived zeros are excluded from downstream
 *   ordinary averages; division by zero propagates an error.
 * - `corr(a, b)` is paired-only over in-range positions; the pair count is
 *   reported.
 */

import type { QueryWindow } from './wql';
import { parseDocument, type ParsedDocument, type QueryDocument, type DocumentAssignment } from './document';

// ── Formula evaluation ──────────────────────────────────────────────────

/** Presence provenance of one operand value at one aligned position. */
export interface OperandValue {
    value: number;
    /** True when the value was substituted for a missing input. */
    missingDerived: boolean;
}

export type PointwiseInputs = Record<string, (position: number) => OperandValue | undefined>;

export interface FormulaEvaluation {
    value: number;
    missingDerived: boolean;
    error?: string;
}

export interface FormulaEvaluator {
    /**
     * Evaluate `expression` at one aligned position. `inputs` maps referenced
     * assignment names to position accessors; a missing operand is `undefined`
     * (the evaluator substitutes zero and flags the result).
     */
    evaluate(expression: string, inputs: PointwiseInputs, position: number): FormulaEvaluation;
}

/** Built-in pointwise arithmetic evaluator (+ - * /, unary minus, corr-free). */
export function createBuiltinFormulaEvaluator(): FormulaEvaluator {
    const evalExpr = (expr: string, inputs: PointwiseInputs, position: number): FormulaEvaluation => {
        const trimmed = expr.trim();

        // Parenthesized group.
        if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            return evalExpr(trimmed.slice(1, -1), inputs, position);
        }

        // Split on the lowest-precedence operator outside parentheses.
        const splitTop = (ops: string[]): { op: string; left: string; right: string } | undefined => {
            let depth = 0;
            for (let i = trimmed.length - 1; i >= 0; i--) {
                const ch = trimmed[i]!;
                if (ch === ')') depth++;
                else if (ch === '(') depth--;
                else if (depth === 0 && ops.includes(ch) && i > 0) {
                    const op = ch;
                    const left = trimmed.slice(0, i);
                    const right = trimmed.slice(i + 1);
                    if (left.trim() && right.trim()) return { op, left, right };
                }
            }
            return undefined;
        };

        const add = splitTop(['+']);
        if (add) {
            if (add.op === '+') {
                const l = evalExpr(add.left, inputs, position);
                const r = evalExpr(add.right, inputs, position);
                if (l.error || r.error) return { value: 0, missingDerived: true, error: l.error ?? r.error };
                return { value: l.value + r.value, missingDerived: l.missingDerived || r.missingDerived };
            }
        }
        const sub = splitTop(['-']);
        if (sub && sub.op === '-') {
            const l = evalExpr(sub.left, inputs, position);
            const r = evalExpr(sub.right, inputs, position);
            if (l.error || r.error) return { value: 0, missingDerived: true, error: l.error ?? r.error };
            return { value: l.value - r.value, missingDerived: l.missingDerived || r.missingDerived };
        }
        const mul = splitTop(['*']);
        if (mul) {
            if (mul.op === '*') {
                const l = evalExpr(mul.left, inputs, position);
                const r = evalExpr(mul.right, inputs, position);
                if (l.error || r.error) return { value: 0, missingDerived: true, error: l.error ?? r.error };
                return { value: l.value * r.value, missingDerived: l.missingDerived || r.missingDerived };
            }
        }
        const div = splitTop(['/']);
        if (div) {
            if (div.op === '/') {
                const l = evalExpr(div.left, inputs, position);
                const r = evalExpr(div.right, inputs, position);
                if (l.error || r.error) return { value: 0, missingDerived: true, error: l.error ?? r.error };
                if (r.value === 0) {
                    return { value: 0, missingDerived: false, error: 'Division by zero' };
                }
                return { value: l.value / r.value, missingDerived: l.missingDerived || r.missingDerived };
            }
        }

        // Numeric literal.
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return { value: Number(trimmed), missingDerived: false };
        }

        // Operand reference.
        const accessor = inputs[trimmed];
        if (accessor) {
            const operand = accessor(position);
            if (operand === undefined) return { value: 0, missingDerived: true };
            return operand;
        }
        return { value: 0, missingDerived: true, error: `Unknown reference "${trimmed}"` };
    };

    return {
        evaluate(expression, inputs, position) {
            try {
                return evalExpr(expression, inputs, position);
            } catch (e) {
                return { value: 0, missingDerived: true, error: e instanceof Error ? e.message : String(e) };
            }
        },
    };
}

// ── Document results ────────────────────────────────────────────────────

/** One ordered `show` output — widget-independent (ticket 19 consumes). */
export interface DocumentOutput {
    name: string;
    kind: 'aggregate' | 'formula';
    unit?: string;
    groupBy?: string[];
    window?: QueryWindow;
    /** Series for aggregate and formula outputs. */
    series?: Array<{ key: string; label: string; points: Array<{ ts: number; value: number; missing?: boolean; missingDerived?: boolean }>; unit?: string }>;
    /** Formula provenance: pair counts for corr, coverage notes. */
    pairs?: number;
    error?: string;
}

export interface DocumentResult {
    outputs: DocumentOutput[];
    diagnostics: string[];
}

export interface QueryDocumentRunnerOptions {
    /** Injected formula evaluator (lang's calc evaluator via the engine). */
    formulaEvaluator?: FormulaEvaluator;
    /** Host default window — used only when the document has none. */
    rangeStart?: number;
    rangeEnd?: number;
}

export class QueryDocumentRunner {
    private readonly evaluator: FormulaEvaluator;
    constructor(
        private readonly runAggregate: (queryText: string, overrides: { groupBy?: string[]; window?: QueryWindow }) => Promise<{
            series?: DocumentOutput['series'];
            unit?: string;
            error?: string;
            window?: QueryWindow;
        }>,
        options: QueryDocumentRunnerOptions = {},
    ) {
        this.evaluator = options.formulaEvaluator ?? createBuiltinFormulaEvaluator();
    }

    /** Parse → validate → evaluate in reference order → ordered outputs. */
    async run(text: string): Promise<DocumentResult> {
        const parsed: ParsedDocument = parseDocument(text);
        const diagnostics = [...parsed.diagnostics];
        const doc: QueryDocument = parsed.doc;
        const outputs: DocumentOutput[] = [];

        const values = new Map<string, { byPosition: Map<number, OperandValue>; unit?: string; groupKeys: string[] }>();

        const evaluate = async (assignment: DocumentAssignment): Promise<void> => {
            if (assignment.kind === 'query') {
                const merged = this.mergeDefaults(assignment, doc);
                const run = await this.runAggregate(merged.queryText, {
                    groupBy: merged.groupBy,
                    window: merged.window,
                });
                const series = run.series ?? [];
                // Record positions for downstream formulas.
                const byPosition = new Map<number, OperandValue>();
                for (const s of series) {
                    for (const point of s.points) {
                        if (!point.missing) {
                            byPosition.set(point.ts, { value: point.value, missingDerived: false });
                        }
                    }
                }
                values.set(assignment.name, { byPosition, unit: run.unit, groupKeys: series.map((s) => s.key) });
                outputs.push({
                    name: assignment.name,
                    kind: 'aggregate',
                    unit: run.unit,
                    ...(doc.defaults?.groupBy ? { groupBy: doc.defaults.groupBy } : {}),
                    ...(merged.window ? { window: merged.window } : {}),
                    series,
                    ...(run.error ? { error: run.error } : {}),
                });
                return;
            }

            // Formula — pointwise over the union of the inputs' positions.
            const formula = assignment.formula!;
            const inputs: PointwiseInputs = {};
            const positions = new Set<number>();
            for (const ref of formula.references) {
                const input = values.get(ref);
                if (!input) {
                    diagnostics.push(`Formula "${assignment.name}" references unavailable input "${ref}"`);
                    return;
                }
                for (const position of input.byPosition.keys()) positions.add(position);
                inputs[ref] = (position) => input.byPosition.get(position);
            }
            const byPosition = new Map<number, OperandValue>();
            let error: string | undefined;
            let pairCount: number | undefined;
            if (formula.expression.startsWith('corr(') && formula.expression.endsWith(')')) {
                // corr(a, b): Pearson over paired in-range positions —
                // either-side-missing pairs are excluded (paired-only).
                const [aName, bName] = formula.expression.slice(5, -1).split(',').map((s) => s.trim());
                const a = values.get(aName!)?.byPosition;
                const b = values.get(bName!)?.byPosition;
                if (!a || !b) {
                    diagnostics.push(`corr("${aName}", "${bName}") references unavailable inputs`);
                    return;
                }
                const pairs: Array<[number, number]> = [];
                for (const [position, av] of a) {
                    const bv = b.get(position);
                    if (bv && !av.missingDerived && !bv.missingDerived) pairs.push([av.value, bv.value]);
                }
                pairCount = pairs.length;
                if (pairs.length < 2) {
                    outputs.push({
                        name: assignment.name, kind: 'formula', pairs: pairCount,
                        error: 'corr needs at least two paired positions',
                    });
                    values.set(assignment.name, { byPosition: new Map(), groupKeys: [] });
                    return;
                }
                const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
                const ma = mean(pairs.map(([x]) => x));
                const mb = mean(pairs.map(([, y]) => y));
                let cov = 0, va = 0, vb = 0;
                for (const [x, y] of pairs) {
                    cov += (x - ma) * (y - mb);
                    va += (x - ma) ** 2;
                    vb += (y - mb) ** 2;
                }
                if (va === 0 || vb === 0) {
                    outputs.push({
                        name: assignment.name, kind: 'formula', pairs: pairCount,
                        error: 'corr is undefined for zero-variance inputs',
                    });
                    values.set(assignment.name, { byPosition: new Map(), groupKeys: [] });
                    return;
                }
                const value = cov / Math.sqrt(va * vb);
                byPosition.set(0, { value, missingDerived: false });
                outputs.push({ name: assignment.name, kind: 'formula', pairs: pairCount, series: [{ key: 'corr', label: 'corr', points: [{ ts: 0, value }] }] });
                values.set(assignment.name, { byPosition, groupKeys: ['corr'] });
                return;
            }

            for (const position of [...positions].sort((a, b) => a - b)) {
                const evaluation = this.evaluator.evaluate(formula.expression, inputs, position);
                if (evaluation.error) {
                    error = evaluation.error;
                    continue;
                }
                byPosition.set(position, { value: evaluation.value, missingDerived: evaluation.missingDerived });
            }
            const series = [{
                key: assignment.name,
                label: assignment.name,
                points: [...byPosition.entries()].map(([ts, v]) => ({
                    ts,
                    value: v.value,
                    ...(v.missingDerived ? { missingDerived: true } : {}),
                })),
            }];
            values.set(assignment.name, { byPosition, unit: formula.unit, groupKeys: [assignment.name] });
            outputs.push({
                name: assignment.name,
                kind: 'formula',
                ...(formula.unit ? { unit: formula.unit } : {}),
                series,
                ...(error ? { error } : {}),
            });
        };

        // Evaluation follows the reference graph; cycles were diagnosed at
        // parse. Iterate to a fixpoint over unordered assignments.
        const pending = [...doc.assignments];
        let progressed = true;
        const evaluated = new Set<string>();
        while (pending.length > 0 && progressed) {
            progressed = false;
            for (let i = pending.length - 1; i >= 0; i--) {
                const assignment = pending[i]!;
                const refs = assignment.formula?.references ?? [];
                if (refs.every((r) => evaluated.has(r))) {
                    await evaluate(assignment);
                    evaluated.add(assignment.name);
                    pending.splice(i, 1);
                    progressed = true;
                }
            }
        }

        // Keep only ordered show outputs (plus diagnostics).
        const shown = new Set(doc.show);
        return {
            outputs: outputs.filter((o) => shown.has(o.name)),
            diagnostics,
        };
    }

    /** Defaults precedence (ticket 17): explicit per-query range/grouping >
     *  block defaults > host. Explicit per-query by{} fully replaces block
     *  grouping — never merges. */
    private mergeDefaults(
        assignment: DocumentAssignment,
        doc: QueryDocument,
    ): { queryText: string; groupBy?: string[]; window?: QueryWindow } {
        const parsed = assignment.parsed;
        const groupBy = parsed?.groupBy?.length ? parsed.groupBy : doc.defaults?.groupBy;
        const window = parsed?.window ?? doc.defaults?.window;
        return {
            queryText: assignment.queryText ?? '',
            ...(groupBy ? { groupBy } : {}),
            ...(window ? { window } : {}),
        };
    }
}
