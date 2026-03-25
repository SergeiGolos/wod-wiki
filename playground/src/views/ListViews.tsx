import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryState, parseAsArrayOf, parseAsStringEnum, parseAsTimestamp } from 'nuqs';
import { QueriableListView } from './queriable-list/QueriableListView';
import { CalendarQuery } from './queriable-list/CalendarQuery';
import { WeekPlannerQuery } from './queriable-list/WeekPlannerQuery';
import { FuzzySearchQuery } from './queriable-list/FuzzySearchQuery';
import { indexedDBService } from '@/services/db/IndexedDBService';
import type { FilteredListItem, QueryObject } from './queriable-list/types';

interface BaseProps {
  workoutItems: { id: string; name: string; category: string; content?: string }[];
  onSelect: (item: any) => void;
}

export function CalendarPage({ workoutItems, onSelect }: BaseProps) {
  const [month, setMonth] = useQueryState('month');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    indexedDBService.getRecentResults(100).then(setResults);
  }, []);

  const initialQuery = useMemo(() => {
    if (!month) return undefined;
    const [y, m] = month.split('-').map(Number);
    return { startDate: new Date(y, m - 1, 1) };
  }, [month]);

  const navigate = useNavigate();
  const handleSelect = (item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  };

  return (
    <QueriableListView
      QueryOrganism={CalendarQuery}
      items={workoutItems}
      results={results}
      onSelect={handleSelect}
      initialQuery={initialQuery}
      disableDateFiltering={true}
    />
  );
}

export function JournalWeeklyPage({ workoutItems, onSelect }: BaseProps) {
  const [dateParam] = useQueryState('d');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    indexedDBService.getRecentResults(100).then(setResults);
  }, []);

  const initialQuery = useMemo(() => {
    const d = dateParam ? new Date(dateParam) : new Date();
    return { startDate: d };
  }, [dateParam]);

  const navigate = useNavigate();
  const handleSelect = (item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  };

  return (
    <QueriableListView
      QueryOrganism={WeekPlannerQuery}
      items={workoutItems}
      results={results}
      onSelect={handleSelect}
      initialQuery={initialQuery}
      disableDateFiltering={true}
    />
  );
}

export function SearchPage({ workoutItems, onSelect }: BaseProps) {
  const [query] = useQueryState('q');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    indexedDBService.getRecentResults(100).then(setResults);
  }, []);

  const initialQuery = useMemo(() => ({ text: query || '' }), [query]);

  const navigate = useNavigate();
  const handleSelect = (item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  };

  return (
    <QueriableListView
      QueryOrganism={FuzzySearchQuery}
      items={workoutItems}
      results={results}
      onSelect={handleSelect}
      initialQuery={initialQuery}
    />
  );
}
