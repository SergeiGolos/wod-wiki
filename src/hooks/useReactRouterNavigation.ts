import { useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { INavigationProvider, NavigationState, WorkbenchView } from '@/types/navigation';
import { 
  planPath, 
  trackPath, 
  reviewPath, 
  playgroundPlanPath, 
  playgroundTrackPath, 
  playgroundReviewPath 
} from '@/lib/routes';

/**
 * useReactRouterNavigation - Production implementation of INavigationProvider.
 * 
 * Maps workbench navigation intents to physical browser URLs using react-router.
 */
export function useReactRouterNavigation(): INavigationProvider {
  const navigate = useNavigate();
  const location = useLocation();
  const { noteId, sectionId, resultId, view: routeView } = useParams<{
    noteId?: string;
    sectionId?: string;
    resultId?: string;
    view?: string;
  }>();

  const isPlayground = location.pathname.startsWith('/playground');

  // Derive current state from the URL
  const state = useMemo((): NavigationState => {
    // Resolve view from path if not explicit in params
    let view: WorkbenchView = 'history';
    if (location.pathname.match(/\/plan(\/|$)/) || (isPlayground && location.pathname.endsWith('/plan'))) view = 'plan';
    else if (location.pathname.match(/\/track(\/|$)/)) view = 'track';
    else if (location.pathname.match(/\/review(\/|$)/)) view = 'review';
    else if (location.pathname.match(/\/analyze(\/|$)/)) view = 'analyze';
    else if (routeView === 'plan' || routeView === 'track' || routeView === 'review' || routeView === 'analyze' || routeView === 'history') {
      view = routeView as WorkbenchView;
    }

    return {
      noteId,
      sectionId,
      resultId,
      view
    };
  }, [noteId, sectionId, resultId, routeView, location.pathname, isPlayground]);

  const goToPlan = useCallback((id: string) => {
    navigate(isPlayground ? playgroundPlanPath() : planPath(id));
  }, [navigate, isPlayground]);

  const goToTrack = useCallback((id: string, sId?: string) => {
    navigate(isPlayground ? playgroundTrackPath(sId || '') : trackPath(id, sId));
  }, [navigate, isPlayground]);

  const goToReview = useCallback((id: string, sId?: string, rId?: string) => {
    navigate(isPlayground ? playgroundReviewPath() : reviewPath(id, sId, rId));
  }, [navigate, isPlayground]);

  const goTo = useCallback((view: WorkbenchView, params?: Partial<Omit<NavigationState, 'view'>>) => {
    const id = params?.noteId || noteId || '';
    const sId = params?.sectionId || sectionId;
    const rId = params?.resultId || resultId;

    if (view === 'history') {
      navigate('/');
      return;
    }

    switch (view) {
      case 'plan': goToPlan(id); break;
      case 'track': goToTrack(id, sId); break;
      case 'review': goToReview(id, sId, rId); break;
      default:
        navigate(isPlayground ? `/playground/${view}` : `/note/${id}/${view}`);
    }
  }, [navigate, noteId, sectionId, resultId, isPlayground, goToPlan, goToTrack, goToReview]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return useMemo(() => ({
    state,
    goToPlan,
    goToTrack,
    goToReview,
    goTo,
    goBack
  }), [state, goToPlan, goToTrack, goToReview, goTo, goBack]);
}
