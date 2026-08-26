/**
 * queryAst — the composer's projection layer (ticket 013, C6 ui half).
 *
 * Composer state IS the C6 AST. Restore is `parseQuery` + `astToPills`
 * (structural projection); emit is `pillsToAst` + the engine serializer —
 * no hand-rolled strings leave the composer. The one private text builder
 * (`buildCandidateText`) exists to turn pill edits back into an AST through
 * the real parser, so composer state can never diverge from the text
 * surface; an unparseable edit yields an error AST, which the serializer
 * echoes verbatim (its totality clause) and diagnostics report.
 *
 * Round-trip property (pinned in test/queryAst.test.ts):
 *   pillsToWql(wqlToPills(q)) === serialize(parseQuery(q))
 * for every composer-expressible query q.
 *
 * Composer-expressible = the pill model covers the AST 1:1: no negated
 * filters, relative windows only (ranges stay in raw-text editing), no C3
 * conflicts, targets inside the C7 closed enums, custom fragments that a
 * registered slot round-trips verbatim.
 */

import {
  parseQuery,
  serialize,
  isAggregateQuery,
  isFindQuery,
  isRowsQuery,
  type AnyParsedQuery,
  type TagFilter,
} from '@bitcobblers/wod-wiki-wql';
import { composerRegistry } from './ComposerRegistry';
import { getClauseMeta, sourcePlane, type QueryClause } from './queryClauses';

// ── Filter pills ↔ TagFilter ────────────────────────────────────────────────

/** Built-in filter pill type → AST filter key. */
const PILL_KEY: Record<string, string> = {
  text: 'text',
  catalog: 'catalog',
  tag: 'tags',
  effort: 'effort',
  discipline: 'discipline',
  intensity: 'intensity',
  origin: 'origin',
  type: 'type',
  has: 'has',
  result: 'result',
  block: 'block',
  note: 'note',
};

/** AST filter key → built-in filter pill type (inverse of PILL_KEY). */
const KEY_PILL: Record<string, string> = Object.fromEntries(
  Object.entries(PILL_KEY).map(([pill, key]) => [key, pill]),
);

function pillValueToFilter(type: string, rawValue: string): TagFilter | null {
  const key = PILL_KEY[type];
  if (!key) return null; // custom slots compile through their wqlGenerator below
  const values = rawValue
    .split('|')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => ({
      value: v.endsWith('*') ? v.slice(0, -1) : v,
      wildcard: v.endsWith('*'),
    }));
  if (values.length === 0) return null;
  return { key, negate: false, values };
}

/** Render one TagFilter the way the candidate builder needs it — quoted
 * when the value leaves the grammar's bare-word domain. */
function filterFragment(f: TagFilter): string {
  const render = (v: { value: string; wildcard: boolean }) => {
    const bare = /^[a-zA-Z0-9_-]+(:[a-zA-Z0-9_-]+)?$/.test(v.value);
    return `${bare ? v.value : `"${v.value}"`}${v.wildcard ? '*' : ''}`;
  };
  return `${f.negate ? '!' : ''}${f.key}:${f.values.map(render).join('|')}`;
}

/** Project one TagFilter to a pill. Null when not composer-expressible
 * (negation; unknown key no registered slot round-trips). */
function filterToPill(f: TagFilter, index: number): QueryClause | null {
  if (f.negate) return null;
  const pillValue = f.values
    .map((v) => `${v.value}${v.wildcard ? '*' : ''}`)
    .join('|');
  if (!pillValue.trim()) return null;

  if (f.key === 'source') {
    return restorePill(`c-source-${index}`, 'source', pillValue);
  }

  const builtin = KEY_PILL[f.key];
  if (builtin) {
    // Unquote the text pill so the chip shows the spaced form, not the
    // `"…"` literal (#867).
    const value =
      builtin === 'text' && f.values.length === 1 && /\s/.test(f.values[0]!.value)
        ? f.values[0]!.value
        : pillValue;
    return restorePill(`c-${builtin}-${index}`, builtin, value);
  }

  // Custom slot: the generator must reproduce the fragment verbatim.
  const fragment = filterFragment(f);
  for (const slot of composerRegistry.getAllSlots()) {
    if (!slot.parseValue || !slot.formatValue) continue;
    const typed = slot.parseValue(pillValue);
    if (typed !== undefined && slot.wqlGenerator(typed) === fragment) {
      return restorePill(`c-${slot.type}-${index}`, slot.type, slot.formatValue(typed));
    }
  }
  return null;
}

function restorePill(id: string, type: string, value: string): QueryClause {
  return { id, type, ...getClauseMeta(type), value };
}

// ── astToPills ──────────────────────────────────────────────────────────────

/** Project a parsed AST onto the pill list — the composer's view model.
 * Null when the AST is not composer-expressible (see module header). */
export function astToPills(ast: AnyParsedQuery): QueryClause[] | null {
  if (ast.error) return null;

  if (isRowsQuery(ast)) {
    if (ast.window?.kind === 'range') return null;
    // The rows source pill is the plane selector — a source: filter has no
    // pill home here, so the query is not composer-expressible.
    if (ast.filters.some((f) => f.key === 'source')) return null;
    const filterPills: QueryClause[] = [];
    for (let i = 0; i < ast.filters.length; i++) {
      const p = filterToPill(ast.filters[i]!, i);
      if (!p) return null;
      filterPills.push(p);
    }
    return [
      restorePill('c-source', 'source', 'rows'),
      restorePill('c-time', 'time', windowPillValue(ast.window)),
      restorePill('c-output', 'output', ast.outputType ?? 'all'),
      ...filterPills,
    ];
  }

  if (isFindQuery(ast)) {
    if (ast.window?.kind === 'range') return null;
    const sourceFilter = ast.filters.find((f) => f.key === 'source' && !f.negate);
    // Blocks/efforts pills name the target and cannot carry provenance — a
    // source: filter there is not composer-expressible.
    if ((ast.target === 'block' || ast.target === 'effort') && sourceFilter) return null;
    const sourceValue =
      ast.target === 'block'
        ? 'blocks'
        : ast.target === 'effort'
          ? 'efforts'
          : !sourceFilter || sourceFilter.values.every((v) => v.value === 'all')
            ? 'notes'
            : sourceFilter.values.map((v) => v.value).join('|');
    const rest = ast.filters.filter((f) => f !== sourceFilter);
    const filterPills: QueryClause[] = [];
    for (let i = 0; i < rest.length; i++) {
      const p = filterToPill(rest[i]!, i);
      if (!p) return null;
      filterPills.push(p);
    }
    const pills = [
      restorePill('c-source', 'source', sourceValue),
      restorePill('c-time', 'time', windowPillValue(ast.window)),
      ...filterPills,
    ];
    if (ast.join) {
      // The metric half: reuse the serializer on a fabricated aggregate AST.
      const j = ast.join;
      const head = serialize({
        family: 'aggregate', raw: '', agg: j.agg, metric: j.metric, filters: j.filters, groupBy: [],
      });
      pills.push(restorePill('c-where', 'where', `${head} ${j.operator} ${j.threshold}`));
    }
    return pills;
  }

  if (isAggregateQuery(ast)) {
    if (ast.window?.kind === 'range') return null;
    const filterPills: QueryClause[] = [];
    for (let i = 0; i < ast.filters.length; i++) {
      const p = filterToPill(ast.filters[i]!, i);
      if (!p) return null;
      filterPills.push(p);
    }
    const pills: QueryClause[] = [
      restorePill('c-source', 'source', 'metrics'),
      restorePill('c-agg', 'agg', ast.agg),
      restorePill('c-metric', 'metric', ast.metric),
      ...filterPills,
      ...ast.groupBy.map((d, i) => restorePill(`c-groupby-${i}`, 'groupby', d)),
    ];
    if (ast.rollup) pills.push(restorePill('c-rollup', 'rollup', `${ast.rollup.size}${ast.rollup.unit}`));
    if (ast.displayUnit) pills.push(restorePill('c-unit', 'unit', ast.displayUnit));
    if (ast.window) pills.push(restorePill('c-time', 'time', windowPillValue(ast.window)));
    if (ast.join) {
      pills.push(
        restorePill(
          'c-where',
          'where',
          serialize({
            family: 'find', raw: '', target: ast.join.target, filters: ast.join.filters,
            window: ast.join.last ? { kind: 'relative', size: ast.join.last.size, unit: ast.join.last.unit } : undefined,
          }),
        ),
      );
    }
    return pills;
  }

  return null;
}

function windowPillValue(w: { kind: string; size?: number; unit?: string } | undefined): string {
  if (!w) return 'all';
  return `last ${w.size}${w.unit}`;
}

/** Restore pills from WQL text — `parseQuery` owns text→AST; the projection
 * owns AST→pills. Null when the text doesn't parse or isn't
 * composer-expressible.
 *
 * One bounded salvage: the composer-native empty-metric aggregate
 * (`sum:{} …`, placeholder guidance while the user picks a metric) is not
 * parseable as text. It is probed with a placeholder metric through the real
 * parser, projected, and the metric pill blanked back. */
export function wqlToPills(wql: string): QueryClause[] | null {
  const direct = astToPills(parseQuery(wql.trim()));
  if (direct) return direct;
  const probed = wql.trim().replace(/^([a-zA-Z_]\w*):(\s*\{)/, '$1:__placeholder__$2');
  if (probed === wql.trim()) return null;
  const salvaged = astToPills(parseQuery(probed));
  if (!salvaged) return null;
  return salvaged.map((p) => (p.type === 'metric' ? { ...p, value: '' } : p));
}

// ── pills → candidate text → AST ────────────────────────────────────────────

function timePillText(raw: string): string {
  const v = raw.trim();
  if (!v || v === 'all') return '';
  if (v.startsWith('last') || v.startsWith('from')) return v;
  return `last ${v}`;
}

/** Build the modern-canonical candidate text from pills. Private: this is
 * the edit path INTO the parser, never an emit path — outbound strings are
 * the serializer's. */
function buildCandidateText(pills: QueryClause[]): string {
  const source = pillValue(pills, 'source', 'notes');
  const filterParts: string[] = [];
  for (const pill of pills) {
    const v = pill.value.trim();
    if (!v) continue;
    const builtin = pillValueToFilter(pill.type, v);
    if (builtin) {
      filterParts.push(filterFragment(builtin));
      continue;
    }
    // Custom slot — the registry generator owns the fragment.
    const def = composerRegistry.getSlot(pill.type);
    if (!def?.parseValue) continue;
    const typed = def.parseValue(v);
    if (typed === undefined) continue;
    const fragment = def.wqlGenerator(typed).trim();
    if (fragment) filterParts.push(fragment);
  }

  const timePill = pills.find((c) => c.type === 'time');
  const timeText = timePill ? timePillText(timePill.value) : '';
  const wherePill = pills.find((c) => c.type === 'where');
  const whereText = wherePill?.value.trim() ? `where ${wherePill.value.trim()}` : '';

  if (source === 'rows') {
    const output = pillValue(pills, 'output', 'all') || 'all';
    return [`rows:${output}{${filterParts.join(',')}}`, timeText].filter(Boolean).join(' ').trim();
  }

  if (sourcePlane(source) === 'metrics') {
    const agg = pillValue(pills, 'agg', 'sum');
    const metric = pillValue(pills, 'metric', '');
    const dims = pills.filter((c) => c.type === 'groupby' && c.value.trim()).map((c) => c.value.trim());
    const rollup = pillValue(pills, 'rollup', '');
    const unit = pillValue(pills, 'unit', '');
    return [
      `${agg}:${metric}{${filterParts.join(',')}}`,
      dims.length ? `by {${dims.join(', ')}}` : '',
      rollup ? `.rollup(${rollup})` : '',
      unit ? `in ${unit}` : '',
      timeText,
      whereText,
    ].filter(Boolean).join(' ').trim();
  }

  // Content plane — source pill folds into target + source: filter (C2).
  const target = source === 'blocks' ? 'block' : source === 'efforts' ? 'effort' : 'note';
  const withSource =
    source === 'notes' || source === 'blocks' || source === 'efforts'
      ? filterParts
      : [`source:${source}`, ...filterParts];
  const braces = withSource.length ? `{${withSource.join(',')}}` : '';
  return [`find:${target}${braces}`, timeText, whereText].filter(Boolean).join(' ').trim();
}

/** Compile pills to the AST — the composer's state. An unparseable edit
 * yields the parser's error AST (diagnostics report it; the serializer
 * echoes the raw candidate). */
export function pillsToAst(pills: QueryClause[]): AnyParsedQuery {
  return parseQuery(buildCandidateText(pills));
}

/** Emit pills as WQL text — the serializer only. */
export function pillsToWql(pills: QueryClause[]): string {
  return serialize(pillsToAst(pills));
}

// ── Pivots & defaults (view-model operations on the pill list) ──────────────

const METRICS_HEAD_TYPES = new Set(['agg', 'metric', 'groupby', 'rollup', 'unit']);

/**
 * Re-base the pill list on a new source value: shared filter pills survive;
 * the time pill survives every pivot (C1 — one window clause on every
 * family); kind-specific pills drop (metrics head on content pivots, the
 * where join always — its half-type is plane-specific). Pivoting to metrics
 * seeds the head slots (agg=sum, metric empty for placeholder guidance);
 * pivoting to rows seeds output=all.
 */
export function pivotPills(pills: QueryClause[], source: string): QueryClause[] {
  const next = pills
    .filter((c) => !METRICS_HEAD_TYPES.has(c.type) && c.type !== 'where')
    .map((c) => (c.type === 'source' ? { ...c, value: source } : c));

  if (source === 'metrics') {
    const sourceIdx = next.findIndex((c) => c.type === 'source');
    const head: QueryClause[] = [];
    if (!next.some((c) => c.type === 'agg')) head.push(restorePill('c-agg', 'agg', 'sum'));
    if (!next.some((c) => c.type === 'metric')) head.push(restorePill('c-metric', 'metric', ''));
    next.splice(sourceIdx >= 0 ? sourceIdx + 1 : next.length, 0, ...head);
  }
  if (source === 'rows' && !next.some((c) => c.type === 'output')) {
    const sourceIdx = next.findIndex((c) => c.type === 'source');
    next.splice(sourceIdx >= 0 ? sourceIdx + 1 : next.length, 0, restorePill('c-output', 'output', 'all'));
  }
  return next;
}

/**
 * Set the aggregate metric, re-basing on the metrics plane when needed
 * (sidebar / launcher flows, issue #839): content planes pivot via
 * `pivotPills` (shared filters and the window survive), a missing source or
 * metric pill is seeded, and the metric value lands on the first metric pill.
 */
export function setMetricPill(pills: QueryClause[], metric: string): QueryClause[] {
  const withSource = pills.some((c) => c.type === 'source')
    ? pills
    : [restorePill('c-source', 'source', 'metrics'), ...pills];
  const pivoted = pillValue(withSource, 'source') === 'metrics'
    ? withSource
    : pivotPills(withSource, 'metrics');
  return pivoted.some((c) => c.type === 'metric')
    ? pivoted.map((c) => (c.type === 'metric' ? { ...c, value: metric } : c))
    : [...pivoted, restorePill('c-metric', 'metric', metric)];
}

export function defaultPills(): QueryClause[] {
  return [
    restorePill('c-source', 'source', 'notes'),
    restorePill('c-time', 'time', 'last 2w'),
  ];
}

/** Default pills for aggregate/metrics queries (source=metrics, agg=sum, empty metric). */
export function defaultMetricsPills(): QueryClause[] {
  return [
    restorePill('c-source', 'source', 'metrics'),
    restorePill('c-agg', 'agg', 'sum'),
    restorePill('c-metric', 'metric', ''),
  ];
}

/** Value of the first pill of `type`, trimmed, or `fallback` when absent or
 * empty — the lookup/defaulting the compiler performs, shared with consumers. */
export function pillValue(pills: QueryClause[], type: string, fallback = ''): string {
  return pills.find((c) => c.type === type)?.value?.trim() || fallback;
}
