/**
 * WQL serializer (C6 — one structured interface for code).
 *
 * The total serializer over the C5 discriminated query union: code holds the
 * AST; strings live only at document edges (URL `?q=`, ```query``` fences,
 * dashboard bodies). Properties (proven by tests/serialize.test.ts):
 *
 *   1. `serialize(parse(x)) === x` for canonical inputs (fixed-point text), and
 *   2. `parse(serialize(a))` is structurally equal to `a` for every AST —
 *      equal on all query-structure fields; `raw` (provenance text) and
 *      `advisories` (parse-time deprecation notices) are intentionally not
 *      reproduced, since serialization emits modern canonical syntax.
 *
 * Errored ASTs serialize to their original `raw` text — a query that failed
 * to parse has no well-defined structure to re-emit, and echoing the input
 * keeps the function total.
 */

import type { AnyParsedQuery, MetricPredicate, ParsedAggregateQuery, ParsedFindQuery, ParsedRowsQuery, QueryWindow, TagFilter } from './wql';

/** Quote a filter value unless it fits the grammar's bare forms — a `Word`
 * (`[a-zA-Z0-9_-]+`) or a catalog-id `Word:Word`. Quoted phrases
 * (`"[^"]*"`) carry multi-word text; the grammar has no escape, so values
 * containing `"` are outside the text surface entirely. */
function serializeValue(value: string): string {
  if (/^[a-zA-Z0-9_-]+(:[a-zA-Z0-9_-]+)?$/.test(value)) return value;
  return `"${value}"`;
}

/** `{key:val1|val2, !other:val*}` — commas between keys, `|` between a
 * key's OR-alternatives, per-value `*` wildcard, `!` negation. */
function serializeFilters(filters: TagFilter[]): string {
  return filters
    .map((f) => `${f.negate ? '!' : ''}${f.key}:${f.values.map((v) => serializeValue(v.value) + (v.wildcard ? '*' : '')).join('|')}`)
    .join(',');
}

/** `agg:metric{filters}` — aggregate heads always carry braces, matching the
 * canonical corpus (`sum:tis{}`). */
function serializeAggregateHead(a: ParsedAggregateQuery): string {
  return `${a.agg}:${a.metric}{${serializeFilters(a.filters)}}`;
}

/** `find:target{filters}[ last <n><unit>]` — the content half of a cross-store
 * join reuses the find head plus its relative window (range windows are
 * rejected on join halves at parse). */
function serializeFindHalf(target: string, filters: TagFilter[], last?: { size: number; unit: 'd' | 'w' }): string {
  const head = `find:${target}${filters.length ? `{${serializeFilters(filters)}}` : ''}`;
  return last ? `${head} last ${last.size}${last.unit}` : head;
}

/** `<agg>:<metric>{filters} <op> <threshold>` — the metric half of a
 * cross-store join attached to a find query. */
function serializeMetricHalf(j: MetricPredicate): string {
  return `${j.agg}:${j.metric}{${serializeFilters(j.filters)}} ${j.operator} ${j.threshold}`;
}
/** `find:target{filters}` — content heads carry braces only when filters
 * exist (`find:note` is the idiomatic bare form). */
function serializeFindHead(f: ParsedFindQuery): string {
  return `find:${f.target}${f.filters.length ? `{${serializeFilters(f.filters)}}` : ''}`;
}

/** `rows:<target>{filters}` — `all` when the AST has no outputType
 * narrowing (parse normalizes `rows:all` back to undefined). */
function serializeRowsHead(r: ParsedRowsQuery): string {
  return `rows:${r.outputType ?? 'all'}{${serializeFilters(r.filters)}}`;
}
/** Window clause (C1): `last 8w` or `from 2026-01-01 [to 2026-03-31]`.
 * Returns '' when the AST has no window. */
function serializeWindow(w: QueryWindow | undefined): string {
  if (!w) return '';
  if (w.kind === 'relative') return `last ${w.size}${w.unit}`;
  return w.end ? `from ${w.start} to ${w.end}` : `from ${w.start}`;
}

/** Serialize any parsed query to canonical WQL text. Total: never throws. */
export function serialize(parsed: AnyParsedQuery): string {
  if (parsed.error) return parsed.raw;
  if (parsed.family === 'aggregate') {
    const a = parsed;
    let text = serializeAggregateHead(a);
    if (a.groupBy.length) text += ` by {${a.groupBy.join(', ')}}`;
    if (a.rollup) text += `.rollup(${a.rollup.size}${a.rollup.unit})`;
    if (a.displayUnit) text += ` in ${a.displayUnit}`;
    const win = serializeWindow(a.window);
    if (win) text += ` ${win}`;
    if (a.join) text += ` where ${serializeFindHalf(a.join.target, a.join.filters, a.join.last)}`;
    return text;
  }
  if (parsed.family === 'find') {
    const parts = [serializeFindHead(parsed), serializeWindow(parsed.window)];
    if (parsed.join) parts.push(`where ${serializeMetricHalf(parsed.join)}`);
    return parts.filter(Boolean).join(' ');
  }
  if (parsed.family === 'rows') {
    const win = serializeWindow(parsed.window);
    return [serializeRowsHead(parsed), win].filter(Boolean).join(' ');
  }
  // Defensive only — the C5 union is exhaustive (unreachable for typed
  // callers); a cross-version object with an unknown family echoes `raw`.
  const unhandled = parsed as { raw?: string };
  return unhandled.raw ?? '';
}
