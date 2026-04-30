/**
 * useFeedsQueryState — nuqs-backed URL state for the Feeds page.
 *
 * Manages two URL parameters:
 *   `feeds` — active feed names (comma-separated, default: '')
 *   `d`     — date filter (ISO date string, default: '')
 */

import { useQueryState } from 'nuqs';
import { useMemo, useCallback } from 'react';

const FEEDS_SEPARATOR = ',';

function parseFeeds(raw: string): string[] {
  if (!raw) return [];
  return raw.split(FEEDS_SEPARATOR).filter(Boolean);
}

function serializeFeeds(feeds: string[]): string {
  return feeds.filter(Boolean).join(FEEDS_SEPARATOR);
}

export function useFeedsQueryState() {
  // ── Feed filter ───────────────────────────────────────────────────────
  const [feedsParam, setFeedsParam] = useQueryState('feeds', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  const selectedFeeds = useMemo(
    () => parseFeeds(feedsParam),
    [feedsParam],
  );

  const setSelectedFeeds = useCallback(
    (feeds: string[]) => setFeedsParam(serializeFeeds(feeds)),
    [setFeedsParam],
  );

  const toggleFeed = useCallback(
    (name: string) => {
      const next = selectedFeeds.includes(name)
        ? selectedFeeds.filter(f => f !== name)
        : [...selectedFeeds, name];
      setSelectedFeeds(next);
    },
    [selectedFeeds, setSelectedFeeds],
  );

  const clearFeeds = useCallback(
    () => setFeedsParam(''),
    [setFeedsParam],
  );

  // ── Date filter ───────────────────────────────────────────────────────
  const [dateParam, setDateParam] = useQueryState('d', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  const selectedDate = useMemo(() => {
    if (!dateParam) return null;
    const d = new Date(dateParam + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }, [dateParam]);

  const setSelectedDate = useCallback(
    (date: Date | null) => {
      if (!date) {
        setDateParam('');
        return;
      }
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      setDateParam(iso);
    },
    [setDateParam],
  );

  return {
    selectedFeeds,
    setSelectedFeeds,
    toggleFeed,
    clearFeeds,
    dateParam: dateParam || null,
    selectedDate,
    setSelectedDate,
  };
}
