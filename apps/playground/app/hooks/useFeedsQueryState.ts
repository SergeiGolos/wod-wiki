/**
 * useFeedsQueryState — nuqs-backed URL state for the Feeds page.
 *
 * Manages two URL parameters:
 *   `s`    — selected date (YYYY-MM-DD)
 *   `feed` — active feed ID (single, empty = show all)
 */

import { useQueryState } from 'nuqs';
import { useMemo, useCallback } from 'react';

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

  // ── Feed filter (single select) ───────────────────────────────────────
  const [feedParam, setFeedParam] = useQueryState('feed', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  /**
   * Select a feed — or deselect it if it's already active (toggle → show all).
   */
  const selectFeed = useCallback(
    (feedId: string) => {
      setFeedParam(prev => (prev === feedId ? '' : feedId));
    },
    [setFeedParam],
  );

  const clearFeed = useCallback(() => setFeedParam(''), [setFeedParam]);

  return {
    dateParam,
    selectedDate,
    setSelectedDate,
    setDateParam,
    selectedFeed: feedParam || null,
    selectFeed,
    clearFeed,
  };
}
