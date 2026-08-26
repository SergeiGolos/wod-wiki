/**
 * useAnalyticsRange — URL-backed analytics range selector state.
 *
 * App-side hook (nuqs + react-router URL): the ui package's RangeSelector is
 * state-free, so the weeks value lives in the app's `?weeks=` query param
 * with a 16-week default. Restored during the @bitcobblers/wod-wiki-ui cutover (#970) —
 * the original lived in src/components/molecules/analytics/RangeSelector.tsx.
 */
import { useQueryState } from 'nuqs';

export type AnalyticsRangeWeeks = 4 | 8 | 16;

const VALID_WEEKS: readonly number[] = [4, 8, 16];

const parseAsWeeks = {
  parse(value: string): number | null {
    const n = Number.parseInt(value, 10);
    return VALID_WEEKS.includes(n) ? n : null;
  },
  serialize(value: number): string {
    return String(value);
  },
  withDefault(defaultValue: number) {
    return { ...this, defaultValue };
  },
};

export function useAnalyticsRange(): [number, (weeks: number) => void] {
  return useQueryState('weeks', parseAsWeeks.withDefault(16));
}
