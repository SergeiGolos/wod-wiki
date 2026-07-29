import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  parseQuery,
  type Aggregator,
  type ParsedQuery,
  type TagFilter,
} from '@/services/analytics/query';
import { serializeQuery } from './explorerQueries';

export interface SimplifiedTagFilter {
  key: string;
  value: string;
  negate: boolean;
}

export interface UseQueryComposerStateOptions {
  initialQuery?: string;
  onChange?: (query: string) => void;
}

export type FactStreamGrain = 'summary' | 'rollup' | 'segment';

export interface QueryComposerState {
  agg: Aggregator;
  metric: string;
  filters: SimplifiedTagFilter[];
  rawFilters: TagFilter[];
  groupBy: string;
  rollup: string;
  query: string;
  parseError?: string;
  humanTranslation: string;
  streamGrain: FactStreamGrain;
  setAgg: (agg: Aggregator) => void;
  setMetric: (metric: string) => void;
  setFilters: (filters: SimplifiedTagFilter[]) => void;
  addFilter: (filter: SimplifiedTagFilter) => void;
  removeFilter: (index: number) => void;
  toggleFilterNegate: (index: number) => void;
  updateFilterKey: (index: number, key: string) => void;
  updateFilterValue: (index: number, value: string) => void;
  setGroupBy: (groupBy: string) => void;
  setRollup: (rollup: string) => void;
  setQuery: (query: string) => boolean;
}

const HUMAN_AGGREGATORS: Record<Aggregator, string> = {
  sum: 'total sum',
  avg: 'average',
  last: 'latest recorded value',
  count: 'frequency count',
  min: 'minimum value',
  max: 'maximum value',
  delta: 'delta / change',
};

const HUMAN_METRICS: Record<string, string> = {
  totalVolume: 'volume (weight moved)',
  tis: 'time-in-motion (seconds)',
  sessionLoad: 'session load strain (RPE × duration)',
  totalReps: 'total repetition count',
  totalDistance: 'total distance (meters)',
  metMinutes: 'energy expenditure (MET-min)',
  'calc.acwr': 'acute-to-chronic workload ratio (ACWR)',
  'calc.monotony': 'daily workload monotony',
  'calc.strain': 'weekly workload strain index',
  elapsed: 'segment duration (seconds)',
  pace: 'realtime pace (sec/km)',
  power: 'realtime power (watts)',
};

export function generateHumanTranslation(parsed: ParsedQuery): string {
  if (parsed.error) return `Invalid WQL query: ${parsed.error}`;

  const aggText = HUMAN_AGGREGATORS[parsed.agg] ?? parsed.agg;
  const metricText = HUMAN_METRICS[parsed.metric] ?? parsed.metric;

  let filterText = ' across all recorded workouts';
  if (parsed.filters.length > 0) {
    const filtersFormatted = parsed.filters.map((f) => {
      const vals = f.values.map((v) => `${v.value}${v.wildcard ? '*' : ''}`).join(' or ');
      return `${f.key} ${f.negate ? 'is not' : 'is'} "${vals}"`;
    });
    filterText = ` for workouts where ${filtersFormatted.join(' and ')}`;
  }

  const groupText = parsed.groupBy.length > 0 ? ` grouped by ${parsed.groupBy.join(', ')}` : '';
  const rollupText = parsed.rollup ? ` into ${parsed.rollup.size}${parsed.rollup.unit} rollup windows` : '';

  return `Calculating ${aggText} of ${metricText}${filterText}${groupText}${rollupText}.`;
}

export function detectStreamGrain(metric: string): FactStreamGrain {
  if (metric.startsWith('calc.')) return 'rollup';
  if (['elapsed', 'pace', 'power'].includes(metric)) return 'segment';
  return 'summary';
}

function tagFilterToSimplified(f: TagFilter): SimplifiedTagFilter {
  const value = f.values.map((v) => `${v.value}${v.wildcard ? '*' : ''}`).join('|');
  return { key: f.key, value, negate: f.negate };
}

function simplifiedToTagFilter(f: SimplifiedTagFilter): TagFilter {
  const values = f.value.split('|').map((v) => ({
    value: v.replace(/\*$/, ''),
    wildcard: v.endsWith('*'),
  }));
  return { key: f.key, negate: f.negate, values };
}

export function useQueryComposerState(
  initialQuery = 'sum:totalVolume{}',
  onChange?: (query: string) => void,
): QueryComposerState {
  const [parsed, setParsed] = useState<ParsedQuery>(() => {
    const raw = initialQuery.trim() || 'sum:totalVolume{}';
    return parseQuery(raw) as ParsedQuery;
  });

  const query = useMemo(() => {
    if (parsed.error) return parsed.raw;
    let serialized = serializeQuery(parsed);
    // Ensure canonical syntax includes {} if no filters
    if (!parsed.filters.length && !serialized.includes('{')) {
      serialized = serialized.replace(`${parsed.agg}:${parsed.metric}`, `${parsed.agg}:${parsed.metric}{}`);
    }
    return serialized;
  }, [parsed]);

  // Re-sync if initialQuery is changed externally by parent component
  useEffect(() => {
    const raw = initialQuery.trim() || 'sum:totalVolume{}';
    if (raw !== query && raw !== parsed.raw) {
      setParsed(parseQuery(raw) as ParsedQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (onChange && !parsed.error) {
      onChange(query);
    }
  }, [query, onChange, parsed.error]);
  const updateParsed = useCallback((updater: (prev: ParsedQuery) => ParsedQuery) => {
    setParsed((prev) => updater(prev));
  }, []);

  const setAgg = useCallback(
    (agg: Aggregator) => {
      updateParsed((prev) => ({ ...prev, agg, error: undefined }));
    },
    [updateParsed],
  );

  const setMetric = useCallback(
    (metric: string) => {
      updateParsed((prev) => ({ ...prev, metric, error: undefined }));
    },
    [updateParsed],
  );

  const setFilters = useCallback(
    (filters: SimplifiedTagFilter[]) => {
      const tagFilters = filters.map(simplifiedToTagFilter);
      updateParsed((prev) => ({ ...prev, filters: tagFilters, error: undefined }));
    },
    [updateParsed],
  );

  const addFilter = useCallback(
    (filter: SimplifiedTagFilter) => {
      const tagFilter = simplifiedToTagFilter(filter);
      updateParsed((prev) => ({
        ...prev,
        filters: [...prev.filters, tagFilter],
        error: undefined,
      }));
    },
    [updateParsed],
  );

  const removeFilter = useCallback(
    (index: number) => {
      updateParsed((prev) => ({
        ...prev,
        filters: prev.filters.filter((_, i) => i !== index),
        error: undefined,
      }));
    },
    [updateParsed],
  );

  const toggleFilterNegate = useCallback(
    (index: number) => {
      updateParsed((prev) => ({
        ...prev,
        filters: prev.filters.map((f, i) => (i === index ? { ...f, negate: !f.negate } : f)),
        error: undefined,
      }));
    },
    [updateParsed],
  );

  const updateFilterKey = useCallback(
    (index: number, key: string) => {
      updateParsed((prev) => ({
        ...prev,
        filters: prev.filters.map((f, i) => (i === index ? { ...f, key } : f)),
        error: undefined,
      }));
    },
    [updateParsed],
  );

  const updateFilterValue = useCallback(
    (index: number, value: string) => {
      const tagFilter = simplifiedToTagFilter({
        key: '',
        value,
        negate: false,
      });
      updateParsed((prev) => ({
        ...prev,
        filters: prev.filters.map((f, i) =>
          i === index ? { ...f, values: tagFilter.values } : f,
        ),
        error: undefined,
      }));
    },
    [updateParsed],
  );

  const setGroupBy = useCallback(
    (groupByStr: string) => {
      const groupBy = groupByStr ? [groupByStr] : [];
      updateParsed((prev) => ({ ...prev, groupBy, error: undefined }));
    },
    [updateParsed],
  );

  const setRollup = useCallback(
    (rollupStr: string) => {
      let rollup: ParsedQuery['rollup'] = undefined;
      if (rollupStr) {
        const match = rollupStr.match(/^(\d+)([dwmy])$/);
        if (match) {
          rollup = { size: parseInt(match[1], 10), unit: match[2] as 'd' | 'w' | 'm' | 'y' };
        }
      }
      updateParsed((prev) => ({ ...prev, rollup, error: undefined }));
    },
    [updateParsed],
  );

  const setQuery = useCallback(
    (rawQuery: string): boolean => {
      const parsedRes = parseQuery(rawQuery) as ParsedQuery;
      setParsed(parsedRes);
      return !parsedRes.error;
    },
    [],
  );

  const filtersSimplified: SimplifiedTagFilter[] = useMemo(() => {
    return parsed.filters.map(tagFilterToSimplified);
  }, [parsed.filters]);

  const humanTranslation = useMemo(() => generateHumanTranslation(parsed), [parsed]);
  const streamGrain = useMemo(() => detectStreamGrain(parsed.metric), [parsed.metric]);

  return {
    agg: parsed.agg,
    metric: parsed.metric,
    filters: filtersSimplified,
    rawFilters: parsed.filters,
    groupBy: parsed.groupBy[0] ?? '',
    rollup: parsed.rollup ? `${parsed.rollup.size}${parsed.rollup.unit}` : '',
    query,
    parseError: parsed.error,
    humanTranslation,
    streamGrain,
    setAgg,
    setMetric,
    setFilters,
    addFilter,
    removeFilter,
    toggleFilterNegate,
    updateFilterKey,
    updateFilterValue,
    setGroupBy,
    setRollup,
    setQuery,
  };
}
