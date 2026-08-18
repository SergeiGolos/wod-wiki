/**
 * AST for the composed-calculation expression language (spec §2).
 *
 * One expression language across all three scopes; scope only changes how
 * atoms resolve. `wql` atoms are legal in store scope only (executed by
 * QueryService); stream aggregates (`sum(reps)`) are builtin calls resolved
 * by the engine, not by this core.
 */

export type BinaryOp =
  | '+' | '-' | '*' | '/'
  | '==' | '!=' | '<' | '<=' | '>' | '>='
  | 'and' | 'or';

export type ExprNode =
  | { kind: 'literal'; value: number }
  | { kind: 'period'; days: number }
  | { kind: 'string'; value: string }
  /** Metric ref, context node (`session.duration`), or library node ref. */
  | { kind: 'ref'; name: string }
  | { kind: 'call'; name: string; args: ExprNode[] }
  /** Effort-exclusion filter argument: `without: rest|pause|rest-*`. */
  | { kind: 'filter'; value: string }
  | { kind: 'unary'; op: '-' | 'not'; arg: ExprNode }
  | { kind: 'binary'; op: BinaryOp; left: ExprNode; right: ExprNode }
  /** Store-scope WQL selection, e.g. `sum:sessionLoad{} by {day}`. */
  | { kind: 'wql'; aggregator: string; metric: string; filters?: string; groupBy?: string[] };

/** A parsed calc line: `name = expr -> unit when predicate`. */
export interface CalcLine {
  name: string;
  expr: ExprNode;
  unit?: string;
  when?: ExprNode;
}
