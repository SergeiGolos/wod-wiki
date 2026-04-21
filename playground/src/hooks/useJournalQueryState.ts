/**
 * useJournalQueryState — Centralized nuqs-backed URL state for the Journal page.
 *
 * Manages three URL parameters:
 *   `d`    — selected date (YYYY-MM-DD), defaults to today
 *   `month`— visible month in the calendar widget (YYYY-MM)
 *   `tags` — active tag filters (comma-separated)
 *
 * All controls (WeekCalendarStrip, CalendarCard, tag chips, FilteredList)
 * read and write through these hooks so the URL is always the source of truth.
 */

import { useQueryState } from 'nuqs';
import { useMemo, useCallback } from 'react';

const TAGS_SEPARATOR = ',';

function parseTags(raw: string): string[] {
  if (!raw) return [];
  return raw.split(TAGS_SEPARATOR).filter(Boolean);
}

function serializeTags(tags: string[]): string {
  return tags.filter(Boolean).join(TAGS_SEPARATOR);
}

export function useJournalQueryState() {
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
    return new Date();
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

  // ── Month parameter ───────────────────────────────────────────────────
  const [monthParam, setMonthParam] = useQueryState('month', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  const currentMonth = useMemo(() => {
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  }, [monthParam, selectedDate]);

  const setCurrentMonth = useCallback(
    (date: Date) => {
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      setMonthParam(iso);
    },
    [setMonthParam],
  );

  // ── Tags parameter ────────────────────────────────────────────────────
  const [tagsParam, setTagsParam] = useQueryState('tags', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  const selectedTags = useMemo(() => parseTags(tagsParam), [tagsParam]);

  const setSelectedTags = useCallback(
    (tags: string[]) => {
      setTagsParam(serializeTags(tags));
    },
    [setTagsParam],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      const next = selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag];
      setSelectedTags(next);
    },
    [selectedTags, setSelectedTags],
  );

  return {
    // Date
    dateParam,
    selectedDate,
    setSelectedDate,
    setDateParam,

    // Month
    monthParam,
    currentMonth,
    setCurrentMonth,

    // Tags
    selectedTags,
    setSelectedTags,
    toggleTag,
  };
}
