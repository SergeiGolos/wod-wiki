import { useState, useCallback, useMemo } from 'react';
import type { INavigationProvider, NavigationState, WorkbenchView } from '@/types/navigation';

/**
 * useInMemoryNavigation - Storybook implementation of INavigationProvider.
 * 
 * Manages navigation state in-memory without affecting the browser URL.
 * Ideal for isolated testing or environments where routing is not available.
 */
export function useInMemoryNavigation(initialState?: Partial<NavigationState>): INavigationProvider {
  const [state, setState] = useState<NavigationState>({
    view: 'plan',
    ...initialState,
  });

  const goToPlan = useCallback((noteId: string) => {
    setState(prev => ({ ...prev, noteId, view: 'plan' }));
  }, []);

  const goToTrack = useCallback((noteId: string, sectionId?: string) => {
    setState(prev => ({ ...prev, noteId, sectionId, view: 'track' }));
  }, []);

  const goToReview = useCallback((noteId: string, sectionId?: string, resultId?: string) => {
    setState(prev => ({ ...prev, noteId, sectionId, resultId, view: 'review' }));
  }, []);

  const goTo = useCallback((view: WorkbenchView, params?: Partial<Omit<NavigationState, 'view'>>) => {
    setState(prev => ({
      ...prev,
      ...params,
      view,
    }));
  }, []);

  const goBack = useCallback(() => {
    // In-memory back could be implemented with a stack, 
    // but for now we'll just log it.
    console.log('[InMemoryNavigation] Go back requested');
  }, []);

  return useMemo(() => ({
    state,
    goToPlan,
    goToTrack,
    goToReview,
    goTo,
    goBack,
  }), [state, goToPlan, goToTrack, goToReview, goTo, goBack]);
}
