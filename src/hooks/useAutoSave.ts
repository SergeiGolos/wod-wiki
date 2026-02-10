/**
 * useAutoSave — Auto-save workout results on completion.
 *
 * When the provider supports writing (canWrite), this hook saves
 * the current content + blocks + results as a new history entry
 * whenever `completeWorkout` is called.
 *
 * When the provider is static (canWrite = false), no save occurs.
 */

import { useCallback } from 'react';
import type { IContentProvider } from '../types/content-provider';
import type { WorkoutResults } from '../markdown-editor/types';

interface UseAutoSaveOptions {
  provider: IContentProvider;
  content: string;
}

export function useAutoSave({ provider, content }: UseAutoSaveOptions) {
  const saveOnComplete = useCallback(async (results: WorkoutResults) => {
    if (!provider.capabilities.canWrite) return;

    try {
      // Extract a title from the first heading in content, or use a default
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Workout';

      await provider.saveEntry({
        title,
        rawContent: content,
        tags: [],
        results: {
          completedAt: results.endTime,
          duration: results.duration,
          logs: [],
        },
      });
    } catch (error) {
      console.error('Failed to auto-save workout:', error);
    }
  }, [provider, content]);

  return { saveOnComplete };
}
