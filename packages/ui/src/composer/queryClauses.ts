import { composerRegistry } from './ComposerRegistry';
import {
  WQL_SOURCES,
  WQL_AGGREGATORS,
  WQL_ROLLUP_PERIODS,
  WQL_VIRTUAL_DIMS,
  WQL_TAG_KEYS,
  WQL_METRIC_AGGREGATES,
  WQL_METRIC_FAMILIES,
  WQL_CALC_TARGETS,
  WQL_DISPLAY_UNITS,
  WQL_COMPARISON_OPS,
} from '@wod-wiki/engine';

export type ClauseType =
  | 'source'
  | 'text'
  | 'catalog'
  | 'tag'
  | 'effort'
  | 'discipline'
  | 'intensity'
  | 'origin'
  | 'type'
  | 'has'
  | 'time'
  | 'where'
  | 'agg'
  | 'metric'
  | 'groupby'
  | 'rollup'
  | 'unit'
  | 'result'
  | 'block'
  | 'note'
  | 'output';

export interface QueryClause {
  id: string;
  type: ClauseType | string;
  label: string;
  icon: string;
  placeholder: string;
  value: string;
  prefix?: string;
  required?: boolean;
}

export const CONTENT_SOURCES = WQL_SOURCES.filter((s) => s !== 'metrics');

export function sourcePlane(source: string): 'content' | 'metrics' {
  return source === 'metrics' ? 'metrics' : 'content';
}

export const METRICS_ONLY_TYPES: ReadonlySet<string> = new Set(['agg', 'metric', 'groupby', 'rollup', 'unit']);

export const SOURCE_OPTIONS = [
  { value: 'journal', label: 'Journal' },
  { value: 'collection', label: 'Collections' },
  { value: 'feed', label: 'Feeds' },
  { value: 'all', label: 'All Content' },
  { value: 'notes', label: 'Notes' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'metrics', label: 'Metrics' },
];

export const TIME_OPTIONS = [
  { value: 'last 7d', label: 'Last 7 Days' },
  { value: 'last 30d', label: 'Last 30 Days' },
  { value: 'last 90d', label: 'Last 90 Days' },
  { value: 'last 1w', label: 'Last 1 Week' },
  { value: 'last 4w', label: 'Last 4 Weeks' },
  { value: 'last 12w', label: 'Last 12 Weeks' },
  { value: 'last 52w', label: 'Last Year' },
];

export const AGG_OPTIONS = WQL_AGGREGATORS.map((v) => ({ value: v, label: v }));
export const ROLLUP_OPTIONS = WQL_ROLLUP_PERIODS.map((v) => ({
  value: v,
  label: v === '1d' ? 'Daily (1d)' : v === '1w' ? 'Weekly (1w)' : v,
}));
export const GROUPBY_OPTIONS = [...WQL_VIRTUAL_DIMS, ...WQL_TAG_KEYS].map((v) => ({ value: v, label: v }));
export const METRIC_OPTIONS = [...WQL_METRIC_AGGREGATES, ...WQL_METRIC_FAMILIES, ...WQL_CALC_TARGETS].map((v) => ({
  value: v,
  label: v,
}));
export const UNIT_OPTIONS = WQL_DISPLAY_UNITS.map((v) => ({ value: v, label: v }));

export const WHERE_AGGREGATORS: readonly string[] = WQL_AGGREGATORS;
export const WHERE_METRICS: readonly string[] = [...WQL_METRIC_AGGREGATES, ...WQL_METRIC_FAMILIES, ...WQL_CALC_TARGETS];
export const WHERE_OPERATORS: readonly string[] = WQL_COMPARISON_OPS;

export interface ClauseMeta {
  label: string;
  icon: string;
  placeholder: string;
  prefix?: string;
  required?: boolean;
}

export const CLAUSE_META: Record<ClauseType, ClauseMeta> = {
  source: { label: 'Source', icon: '📍', placeholder: 'Select source...', required: true },
  text: { label: 'Text', icon: '🔍', placeholder: 'Search text...', prefix: 'text:' },
  catalog: { label: 'Catalog', icon: '📚', placeholder: 'Select catalog...', prefix: 'catalog:' },
  tag: { label: 'Tag', icon: '🏷️', placeholder: 'Filter by tag...', prefix: 'tags:' },
  effort: { label: 'Effort', icon: '🏋️', placeholder: 'Filter by effort...', prefix: 'effort:' },
  discipline: { label: 'Discipline', icon: '🏃', placeholder: 'Select discipline...', prefix: 'discipline:' },
  intensity: { label: 'Intensity', icon: '⚡', placeholder: 'Select intensity...', prefix: 'intensity:' },
  origin: { label: 'Origin', icon: '🎯', placeholder: 'Select origin...', prefix: 'origin:' },
  type: { label: 'Block Type', icon: '🧱', placeholder: 'Filter by block type...', prefix: 'type:' },
  has: { label: 'Has Feature', icon: '✨', placeholder: 'Filter by feature...', prefix: 'has:' },
  time: { label: 'Time Window', icon: '⏱️', placeholder: 'Select time window...' },
  where: { label: 'Metric Join', icon: '🔗', placeholder: 'Add metric filter...', prefix: 'where ' },
  agg: { label: 'Aggregate', icon: '📊', placeholder: 'Select aggregate...', prefix: '' },
  metric: { label: 'Metric', icon: '📈', placeholder: 'Select metric...', prefix: '' },
  groupby: { label: 'Group By', icon: '🗂️', placeholder: 'Select group dimension...', prefix: 'by ' },
  rollup: { label: 'Rollup', icon: '🗓️', placeholder: 'Select rollup period...', prefix: 'every ' },
  unit: { label: 'Unit', icon: '⚖️', placeholder: 'Display unit (kg / lb)...', prefix: 'as ' },
  result: { label: 'Result', icon: '🏆', placeholder: 'Filter by result...', prefix: 'result:' },
  block: { label: 'Block', icon: '🧩', placeholder: 'Filter by block id...', prefix: 'block:' },
  note: { label: 'Note', icon: '📝', placeholder: 'Filter by note id...', prefix: 'note:' },
  output: { label: 'Output Type', icon: '📄', placeholder: 'Filter output type...', prefix: 'output:' },
};

const CUSTOM_FALLBACK_ICON = '\u{1F9E9}';

export function getClauseMeta(type: string): ClauseMeta {
  if (type in CLAUSE_META) return CLAUSE_META[type as ClauseType];
  const custom = composerRegistry.getSlot(type);
  if (custom) {
    return {
      label: custom.label,
      icon: custom.icon || CUSTOM_FALLBACK_ICON,
      placeholder: custom.placeholder || custom.placeholderText || 'Configure slot...',
    };
  }
  return {
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: CUSTOM_FALLBACK_ICON,
    placeholder: `Enter ${type}...`,
    prefix: `${type}:`,
  };
}

export function clauseToWql(clause: QueryClause): { key?: string; filterStr?: string } {
  const value = clause.value.trim();
  if (!value) return {};

  const custom = composerRegistry.getSlot(clause.type);
  if (custom) {
    const rawParsed = custom.parseValue ? custom.parseValue(value) : value;
    if (rawParsed !== undefined) {
      const generated = custom.wqlGenerator(rawParsed);
      return { filterStr: generated };
    }
  }

  const meta = getClauseMeta(clause.type);
  if (meta.prefix !== undefined && meta.prefix !== '') {
    return { filterStr: `${meta.prefix}${value}` };
  }
  return { key: clause.type, filterStr: value };
}

export function clausesToWql(clauses: QueryClause[]): string {
  const source = clauseValue(clauses, 'source', 'journal');
  const plane = sourcePlane(source);

  if (plane === 'metrics') {
    const agg = clauseValue(clauses, 'agg', 'sum');
    const metric = clauseValue(clauses, 'metric', '');
    const head = metric ? `${agg}:${metric}` : agg;

    const filters: string[] = [];
    for (const c of clauses) {
      if (['source', 'agg', 'metric', 'groupby', 'rollup', 'unit', 'where'].includes(c.type)) continue;
      const { filterStr } = clauseToWql(c);
      if (filterStr) filters.push(filterStr);
    }
    const filterBlock = filters.length > 0 ? `{${filters.join(', ')}}` : '{}';

    const groupby = clauseValue(clauses, 'groupby');
    const groupbySuffix = groupby ? ` by ${groupby}` : '';
    const rollup = clauseValue(clauses, 'rollup');
    const rollupSuffix = rollup ? ` every ${rollup}` : '';
    const unit = clauseValue(clauses, 'unit');
    const unitSuffix = unit ? ` as ${unit}` : '';
    const time = clauseValue(clauses, 'time');
    const timeSuffix = time ? ` ${time}` : '';
    const where = clauseValue(clauses, 'where');
    const whereSuffix = where ? ` where ${where.replace(/^where\s+/, '')}` : '';

    return `${head}${filterBlock}${groupbySuffix}${rollupSuffix}${unitSuffix}${timeSuffix}${whereSuffix}`.trim();
  }

  const target = source === 'blocks' ? 'block' : 'note';
  const scope = ['all', 'notes', 'blocks'].includes(source) ? '' : ` in ${source}`;
  const head = `find:${target}${scope}`;

  const filters: string[] = [];
  for (const c of clauses) {
    if (['source', 'time', 'where', 'agg', 'metric', 'groupby', 'rollup', 'unit'].includes(c.type)) continue;
    const { filterStr } = clauseToWql(c);
    if (filterStr) filters.push(filterStr);
  }
  const filterBlock = filters.length > 0 ? `{${filters.join(', ')}}` : '';
  const time = clauseValue(clauses, 'time');
  const timeSuffix = time ? ` ${time}` : '';
  const where = clauseValue(clauses, 'where');
  const whereSuffix = where ? ` where ${where.replace(/^where\s+/, '')}` : '';

  return `${head}${filterBlock}${timeSuffix}${whereSuffix}`.trim();
}

export function clauseValue(clauses: QueryClause[], type: string, fallback = ''): string {
  return clauses.find((c) => c.type === type)?.value?.trim() || fallback;
}

export function defaultClauses(): QueryClause[] {
  return [
    { id: 'source', type: 'source', ...CLAUSE_META.source, value: 'journal' },
    { id: 'text', type: 'text', ...CLAUSE_META.text, value: '' },
  ];
}

export function defaultMetricsClauses(): QueryClause[] {
  return [
    { id: 'source', type: 'source', ...CLAUSE_META.source, value: 'metrics' },
    { id: 'agg', type: 'agg', ...CLAUSE_META.agg, value: 'sum' },
    { id: 'metric', type: 'metric', ...CLAUSE_META.metric, value: '' },
  ];
}

export function pivotClauses(clauses: QueryClause[], source: string): QueryClause[] {
  const currentSource = clauseValue(clauses, 'source', 'journal');
  if (sourcePlane(currentSource) === sourcePlane(source)) {
    return clauses.map((c) => (c.type === 'source' ? { ...c, value: source } : c));
  }
  if (sourcePlane(source) === 'metrics') {
    const keep = clauses.filter((c) => !['source', 'text', 'type', 'has'].includes(c.type));
    return [
      { id: 'source', type: 'source', ...CLAUSE_META.source, value: 'metrics' },
      { id: 'agg', type: 'agg', ...CLAUSE_META.agg, value: 'sum' },
      { id: 'metric', type: 'metric', ...CLAUSE_META.metric, value: '' },
      ...keep,
    ];
  }
  const keep = clauses.filter((c) => !METRICS_ONLY_TYPES.has(c.type) && c.type !== 'source');
  return [
    { id: 'source', type: 'source', ...CLAUSE_META.source, value: source },
    { id: 'text', type: 'text', ...CLAUSE_META.text, value: '' },
    ...keep,
  ];
}

export function setMetricClause(clauses: QueryClause[], metric: string): QueryClause[] {
  const pivoted = sourcePlane(clauseValue(clauses, 'source')) === 'metrics'
    ? clauses
    : pivotClauses(clauses, 'metrics');
  return pivoted.map((c) => (c.type === 'metric' ? { ...c, value: metric } : c));
}

function restoreClause(id: string, type: string, value: string): QueryClause {
  return { id, type, ...getClauseMeta(type), value };
}

export function wqlToClauses(wql: string): QueryClause[] | null {
  const trimmed = wql.trim();
  if (!trimmed) return defaultClauses();

  // Simple restore logic for standard queries
  if (trimmed.startsWith('find:')) {
    const clauses: QueryClause[] = [
      restoreClause('source', 'source', 'journal'),
    ];
    return clauses;
  }
  return null;
}
