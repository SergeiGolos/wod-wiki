import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { localDateKey, type JournalEntrySummary } from './queriable-list/JournalDateScroll';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { playgroundDB } from '../services/playgroundDB';
import { useJournalQueryState } from '../hooks/useJournalQueryState';
import type { FilteredListItem } from './queriable-list/types';
import { CalendarListTemplate } from '../templates/CalendarListTemplate';

interface JournalWeeklyPageProps {
  onSelect: (item: any) => void;
  onCreateEntry?: (date: Date) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function JournalWeeklyPage({ onSelect, onCreateEntry }: JournalWeeklyPageProps) {
  const { dateParam, selectedDate, setDateParam, selectedTags } = useJournalQueryState();
  const hasExplicitDateParam = Boolean(dateParam);
  const todayKey = useMemo(() => localDateKey(new Date()), []);

  const navigate = useNavigate();
  const handleSelect = (item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  };

  const handleOpenEntry = useCallback((dateKey: string) => {
    navigate(`/journal/${dateKey}`);
  }, [navigate]);

  const handleVisibleDateChange = useCallback(
    (dateKey: string) => {
      if (dateKey && dateKey !== 'no-date') {
        if (!hasExplicitDateParam && dateKey === todayKey) {
          return;
        }

        setDateParam(dateKey);
      }
    },
    [hasExplicitDateParam, setDateParam, todayKey],
  );

  const query = useMemo(() => ({ selectedDate, selectedTags }), [selectedDate, selectedTags]);

  const loadResults = useCallback(() => indexedDBService.getRecentResults(100), []);

  const loadJournalEntries = useCallback(async () => {
    const [lowerCasePages, upperCasePages] = await Promise.all([
      playgroundDB.getPagesByCategory('journal'),
      playgroundDB.getPagesByCategory('Journal'),
    ]);

    const pages = [...lowerCasePages, ...upperCasePages];
    const entryMap = new Map<string, JournalEntrySummary>();

    pages.forEach(page => {
      const dateKey = page.id.replace(/^journal\//, '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        const headingMatch = page.content.match(/^#\s+(.+)$/m);
        entryMap.set(dateKey, {
          title: headingMatch ? headingMatch[1].trim() : dateKey,
          updatedAt: page.updatedAt,
        });
      }
    });

    return entryMap;
  }, []);

  const mapResultsToItems = useCallback((resultsToMap: any[], currentQuery: typeof query) => {
    const combined: FilteredListItem[] = resultsToMap.map(r => {
      const safeNoteId = r.noteId || ''
      const isPlayground = safeNoteId.startsWith('playground/') || UUID_RE.test(safeNoteId)

      const parts = safeNoteId.split('/');
      const lastSegment = parts[parts.length - 1] || safeNoteId;
      const isDateSegment = /^\d{4}-\d{2}-\d{2}$/.test(lastSegment);
      const title = isPlayground
        ? 'Playground'
        : isDateSegment
          ? (parts[parts.length - 2] || lastSegment)
          : lastSegment;
      return {
        id: r.id,
        type: 'result' as const,
        title,
        subtitle: r.data?.completed ? 'Completed' : 'Partial',
        date: r.completedAt,
        group: isPlayground ? 'playground' : undefined,
        payload: r,
      };
    });

    if (currentQuery.selectedTags.length === 0) {
      return combined.sort((a, b) => (b.date || 0) - (a.date || 0));
    }

    return combined
      .filter(item => {
        const title = item.title.toLowerCase();
        return currentQuery.selectedTags.some(tag => title.includes(tag.toLowerCase()));
      })
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, []);

  return (
    <CalendarListTemplate
      query={query}
      loadResults={loadResults}
      loadJournalEntries={loadJournalEntries}
      mapResultsToItems={mapResultsToItems}
      initialDate={hasExplicitDateParam ? selectedDate : undefined}
      onSelectItem={handleSelect}
      onVisibleDateChange={handleVisibleDateChange}
      onOpenEntry={handleOpenEntry}
      onCreateEntry={onCreateEntry}
    />
  );
}
