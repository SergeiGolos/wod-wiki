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
import * as terms from '@/grammar/wql.parser.terms';

export type Aggregator = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'last' | 'delta';

export interface TagFilter {
  key: string;
  value: string;
  negate: boolean;
  wildcard: boolean;
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
  error?: string;
}

export interface SeriesPoint { ts: number; value: number }
export interface Series { key: string; label: string; points: SeriesPoint[] }

export const WQL_AGGREGATORS: Aggregator[] = ['sum', 'avg', 'min', 'max', 'count', 'last', 'delta'];

const AGGS: Aggregator[] = WQL_AGGREGATORS;

function cannotParse(text: string): string {
  return `Cannot parse "${text}". Expected agg:metric{filters} by {dims} .rollup(period)`;
}

export function parseQuery(raw: string): ParsedQuery {
  const base: ParsedQuery = { raw, agg: 'sum', metric: '', filters: [], groupBy: [] };
  const text = raw.trim();
  const tree = wqlParser.parse(raw);

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
  const aggText = raw.slice(aggNode.from, aggNode.to);
  if (!AGGS.includes(aggText as Aggregator)) {
    base.error = `Unknown aggregator "${aggText}". Try: ${AGGS.join(', ')}`;
    return base;
  }
  base.agg = aggText as Aggregator;
  base.metric = raw.slice(metricNode.from, metricNode.to);

  // Filters — {key:value, !key:value, key:prefix*}
  const filters = query.getChild(terms.Filters);
  if (filters) {
    for (const filter of filters.getChildren(terms.Filter)) {
      const keyNode = filter.getChild(terms.TagKey);
      const valueNode = filter.getChild(terms.TagValue);
      const wordNode = valueNode?.getChild(terms.Word);
      if (!keyNode || !valueNode || !wordNode) continue;
      base.filters.push({
        key: raw.slice(keyNode.from, keyNode.to),
        value: raw.slice(wordNode.from, wordNode.to),
        negate: filter.getChild(terms.Negate) !== null,
        wildcard: valueNode.getChild(terms.Star) !== null,
      });
    }
  }

  // GroupBy — by {dim, dim}
  const groupBy = query.getChild(terms.GroupBy);
  if (groupBy) {
    for (const dim of groupBy.getChildren(terms.Dimension)) {
      base.groupBy.push(raw.slice(dim.from, dim.to));
    }
  }

  // Rollup — .rollup(<size><unit>); the unit lexes as a word and is
  // validated here.
  const rollup = query.getChild(terms.Rollup);
  if (rollup) {
    const sizeNode = rollup.getChild(terms.Int);
    const unitNode = rollup.getChild(terms.Word);
    const unit = unitNode ? raw.slice(unitNode.from, unitNode.to) : '';
    if (!sizeNode || (unit !== 'd' && unit !== 'w')) {
      return { raw, agg: 'sum', metric: '', filters: [], groupBy: [], error: cannotParse(text) };
    }
    base.rollup = { size: parseInt(raw.slice(sizeNode.from, sizeNode.to), 10), unit };
  }

  return base;
}
