/**
 * useFeedsQueryState — nuqs-backed URL state for the Feeds page.
 *
 * Manages two URL parameters:
 *   `s`     — selected date (YYYY-MM-DD), mirrors the journal `s` param convention
 *   `feeds` — active feed-name filters (comma-separated feed IDs)
 *
 * Both the FeedsNavPanel (writer) and FeedsPage (reader) share this hook
 * so the URL is always the source of truth.
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
  // ── Date parameter ────────────────────────────────────────────────────
  const [dateParam, setDateParam] = useQueryState('s', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  const selectedDate = useMemo(() => {
    if (dateParam) {
      const d = new Date(dateParam + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }, [dateParam]);

  const setSelectedDate = useCallback(
    (date: Date | null) => {
      if (!date) {
        setDateParam('');
      } else {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        setDateParam(`${y}-${m}-${d}`);
      }
    },
    [setDateParam],
  );

  // ── Feed filter parameter ─────────────────────────────────────────────
  const [feedsParam, setFeedsParam] = useQueryState('feeds', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  const selectedFeeds = useMemo(() => parseFeeds(feedsParam), [feedsParam]);

  const setSelectedFeeds = useCallback(
    (feeds: string[]) => setFeedsParam(serializeFeeds(feeds)),
    [setFeedsParam],
  );

  const toggleFeed = useCallback(
    (feedId: string) => {
      const next = selectedFeeds.includes(feedId)
        ? selectedFeeds.filter(f => f !== feedId)
        : [...selectedFeeds, feedId];
      setSelectedFeeds(next);
    },
    [selectedFeeds, setSelectedFeeds],
  );

  const clearFeeds = useCallback(() => setFeedsParam(''), [setFeedsParam]);

  return {
    dateParam,
    selectedDate,
    setSelectedDate,
    setDateParam,
    selectedFeeds,
    setSelectedFeeds,
    toggleFeed,
    clearFeeds,
  };
}
