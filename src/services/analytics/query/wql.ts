/**
 * WQL — Wod Query Language (Datadog-flavored). See CONTEXT.md glossary.
 *
 *   <aggregator>:<metric.namespace>{<tag filters>} by {<dimensions>} .rollup(<period>)
 *
 *   sum:totalVolume{discipline:strength} by {week}.rollup(1w)
 *   avg:tis{effort:thruster,!discipline:recovery} by {session}
 *
 * This module holds the AST contract the Query Service executes and the
 * Lezer-backed `parseQuery` front-end over src/grammar/wql.grammar (house
 * pattern). The grammar accepts the full WQL surface with error recovery;
 * this mapper validates the recovered tree and produces the AST below.
 *
 * Semantics reference: the dashboard POC's hand-rolled engine
 * (wod-wiki-dashboard-poc/app/src/lib/wql.ts) — behavior locked there,
 * retargeted here at Canonical Metric Keys and real fact rows.
 */

import { parser as wqlParser } from '@/grammar/wql.parser';
import type { SyntaxNode } from '@lezer/common';
import * as terms from '@/grammar/wql.parser.terms';

export type Aggregator = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'last' | 'delta';

export interface TagValue {
  value: string;
  wildcard: boolean;
}

export interface TagFilter {
  key: string;
  negate: boolean;
  values: TagValue[];
}

export interface ParsedQuery {
  raw: string;
  agg: Aggregator;
  /** Canonical Metric Key (fact row `metricKey`). */
  metric: string;
  filters: TagFilter[];
  /** Tag keys, or virtual dims: day | week | session | round. */
  groupBy: string[];
  rollup?: { size: number; unit: 'd' | 'w' };
  /** Optional display unit directive — `in kg` / `in lb`. */
  displayUnit?: string;
  error?: string;
}

/** Result of parsing a content-discovery query (`find:target{filters} in scope`). */
export interface ParsedFindQuery {
  raw: string;
  /** Content target: 'note' or 'block'. */
  target: string;
  filters: TagFilter[];
  /** Where to look: journal | collections | feeds | all. */
  scope?: string;
  /** Time window: last 8w, last 4d. */
  last?: { size: number; unit: 'd' | 'w' };
  error?: string;
}

export type AnyParsedQuery = ParsedQuery | ParsedFindQuery;

/** Type guard: true for content-discovery queries. */
export function isFindQuery(parsed: AnyParsedQuery): parsed is ParsedFindQuery {
  return 'target' in parsed;
}

export interface SeriesPoint { ts: number; value: number }
export interface Series { key: string; label: string; points: SeriesPoint[]; unit?: string }

export const WQL_AGGREGATORS: Aggregator[] = ['sum', 'avg', 'min', 'max', 'count', 'last', 'delta'];
const AGGS: Aggregator[] = WQL_AGGREGATORS;

function cannotParse(text: string): string {
  return `Cannot parse "${text}". Expected agg:metric{filters} by {dims} .rollup(period)`;
}

const DISPLAY_UNIT_RE = /\s+in\s+([a-zA-Z0-9_-]+)\s*$/;
/**
 * Parse a WQL query string into either an analytics ParsedQuery or a content
 * ParsedFindQuery. Dispatch is textual: a leading `find:` routes to the
 * content path, everything else to analytics.
 */
export function parseQuery(raw: string): AnyParsedQuery {
  if (raw.trimStart().startsWith('find:')) {
    return parseFindQuery(raw);
  }
  return parseAnalyticsQuery(raw);
}

/** Shared filter extraction from a Lezer Query top node. */
function extractFilters(query: SyntaxNode, text: string): TagFilter[] {
  const out: TagFilter[] = [];
  const filters = query.getChild(terms.Filters);
  if (!filters) return out;
  for (const filter of filters.getChildren(terms.Filter)) {
    const keyNode = filter.getChild(terms.TagKey);
    const valueNode = filter.getChild(terms.TagValue);
    if (!keyNode || !valueNode) continue;
    const values: { value: string; wildcard: boolean }[] = [];
    for (const wordNode of valueNode.getChildren(terms.Word)) {
      values.push({
        value: text.slice(wordNode.from, wordNode.to),
        wildcard: wordNode.nextSibling?.name === 'Star',
      });
    }
    if (values.length === 0) continue;
    out.push({
      key: text.slice(keyNode.from, keyNode.to),
      negate: filter.getChild(terms.Negate) !== null,
      values,
    });
  }
  return out;
}

function parseAnalyticsQuery(raw: string): ParsedQuery {
  // Display unit directive is parsed at the WQL surface so the Lezer grammar
  // does not need a keyword token that would shadow `in` as a word elsewhere.
  let queryText = raw;
  let displayUnit: string | undefined;
  const unitMatch = DISPLAY_UNIT_RE.exec(raw.trimEnd());
  if (unitMatch) {
    displayUnit = unitMatch[1];
    queryText = raw.slice(0, unitMatch.index).trimEnd();
  }

  const base: ParsedQuery = { raw, agg: 'sum', metric: '', filters: [], groupBy: [], displayUnit };
  const text = queryText.trim();
  const tree = wqlParser.parse(queryText);

  // Lezer recovers from malformed input by inserting ⚠ nodes — any of them
  // means the query is not the WQL surface.
  let syntaxError = false;
  tree.iterate({ enter(node) { if (node.type.isError) syntaxError = true; } });
  if (syntaxError) {
    base.error = cannotParse(text);
    return base;
  }

  const query = tree.topNode;

  // Head — agg:metric. Unknown aggregators are a semantic error, reported
  // exactly like the reference parser (metric left empty).
  const head = query.getChild(terms.Head);
  const aggNode = head?.getChild(terms.Aggregator);
  const metricNode = head?.getChild(terms.Metric);
  if (!head || !aggNode || !metricNode) {
    base.error = cannotParse(text);
    return base;
  }
  const aggText = queryText.slice(aggNode.from, aggNode.to);
  if (!AGGS.includes(aggText as Aggregator)) {
    base.error = `Unknown aggregator "${aggText}". Try: ${AGGS.join(', ')}`;
    return base;
  }
  base.agg = aggText as Aggregator;
  base.metric = queryText.slice(metricNode.from, metricNode.to);

  base.filters = extractFilters(query, queryText);

  // GroupBy — by {dim, dim}
  const groupBy = query.getChild(terms.GroupBy);
  if (groupBy) {
    for (const dim of groupBy.getChildren(terms.Dimension)) {
      base.groupBy.push(queryText.slice(dim.from, dim.to));
    }
  }

  // Rollup — .rollup(<size><unit>); the unit lexes as a word and is
  // validated here.
  const rollup = query.getChild(terms.Rollup);
  if (rollup) {
    const sizeNode = rollup.getChild(terms.Int);
    const unitNode = rollup.getChild(terms.Word);
    const unit = unitNode ? queryText.slice(unitNode.from, unitNode.to) : '';
    if (!sizeNode || (unit !== 'd' && unit !== 'w')) {
      return { raw, agg: 'sum', metric: '', filters: [], groupBy: [], error: cannotParse(text), displayUnit };
    }
    base.rollup = { size: parseInt(queryText.slice(sizeNode.from, sizeNode.to), 10), unit };
  }

  return base;
}

// ── Find query parsing ──────────────────────────────────────────────

/** Strip `last <n><unit>` and `in <scope>` suffixes (parsed in JS, same
  * pattern as DISPLAY_UNIT_RE — avoids Lezer token-overlap conflicts). */
const LAST_RE = /\s+last\s+(\d+)([dw])\s*$/i;
const IN_SCOPE_RE = /\s+in\s+(\w+)\s*$/;

function cannotParseFind(text: string): string {
  return `Cannot parse "${text}". Expected find:target{filters} in scope last 8w`;
}

function parseFindQuery(raw: string): ParsedFindQuery {
  const result: ParsedFindQuery = { raw, target: '', filters: [] };
  let text = raw.trim();

  // Strip time window: "last 8w" / "last 4d"
  const lastMatch = LAST_RE.exec(text);
  if (lastMatch) {
    result.last = { size: parseInt(lastMatch[1], 10), unit: lastMatch[2].toLowerCase() as 'd' | 'w' };
    text = text.slice(0, lastMatch.index).trim();
  }

  // Strip scope: "in journal"
  const inMatch = IN_SCOPE_RE.exec(text);
  if (inMatch) {
    result.scope = inMatch[1];
    text = text.slice(0, inMatch.index).trim();
  }

  // Parse structural part: find:target{filters}
  const tree = wqlParser.parse(text);
  let syntaxError = false;
  tree.iterate({ enter(node) { if (node.type.isError) syntaxError = true; } });
  if (syntaxError) {
    result.error = cannotParseFind(text);
    return result;
  }

  const query = tree.topNode;
  const head = query.getChild(terms.Head);
  const aggNode = head?.getChild(terms.Aggregator);
  const metricNode = head?.getChild(terms.Metric);
  if (!head || !aggNode || !metricNode) {
    result.error = cannotParseFind(text);
    return result;
  }

  // The first word must be "find" (the dispatch keyword).
  const aggText = text.slice(aggNode.from, aggNode.to);
  if (aggText !== 'find') {
    result.error = `Expected "find:" but got "${aggText}:"`;
    return result;
  }

  result.target = text.slice(metricNode.from, metricNode.to);
  result.filters = extractFilters(query, text);

  return result;
}
