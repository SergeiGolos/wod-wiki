/**
 * useCreateWorkoutEntry - Hook for creating new workout entries
 *
 * Provides an action to create a new entry via the content provider,
 * update the history entries list, select the new entry, and navigate
 * to the plan view.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IContentProvider } from '../types/content-provider';
import type { HistoryEntry } from '../types/history';
import type { UseHistorySelectionReturn } from './useHistorySelection';

interface UseCreateWorkoutEntryOptions {
  provider: IContentProvider;
  historySelection: UseHistorySelectionReturn | null;
  setHistoryEntries: (entries: HistoryEntry[]) => void;
  setContent: (content: string) => void;
}

const DEFAULT_WORKOUT_CONTENT = `# New Workout

10:00 Run
`;

export function useCreateWorkoutEntry({
  provider,
  historySelection,
  setHistoryEntries,
  setContent,
}: UseCreateWorkoutEntryOptions) {
  const navigate = useNavigate();

  const createNewEntry = useCallback(async () => {
    // Only available when provider supports writing
    if (!provider.capabilities.canWrite) {
      console.warn('Content provider does not support writing');
      return;
    }

    try {
      // Create new entry with default content
      const newEntry = await provider.saveEntry({
        title: 'New Workout',
        rawContent: DEFAULT_WORKOUT_CONTENT,
        tags: [],
      });

      // Fetch all entries to refresh the list
      const allEntries = await provider.getEntries();
      setHistoryEntries(allEntries);

      // Select the new entry (triggers single-select mode)
      if (historySelection) {
        historySelection.clearSelection();
        historySelection.toggleEntry(newEntry.id);
      }

      // Load content into editor
      setContent(newEntry.rawContent);

      // Navigate to plan view using unique URL
      navigate(`/note/${newEntry.id}/plan`);
    } catch (error) {
      console.error('Failed to create new workout entry:', error);
    }
  }, [provider, historySelection, setHistoryEntries, setContent, navigate]);

  return {
    createNewEntry,
    canCreate: provider.capabilities.canWrite,
  };
}
