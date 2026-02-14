/**
 * useWodRouting — Typed navigation hook for WOD Wiki views.
 *
 * Wraps react-router's useParams / useNavigate with project-specific
 * route types so every navigation call is type-safe and consistent.
 *
 * Usage:
 *   const { route, goToPlan, goToTrack, goToReview } = useWodRouting();
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  planPath,
  trackPath,
  reviewPath,
  playgroundPlanPath,
  playgroundTrackPath,
  playgroundReviewPath,
  parseRouteParams,
  type RawRouteParams,
  type WodRouteParams,
} from '@/lib/routes';
import type { ViewMode } from '@/components/layout/panel-system/ResponsiveViewport';

export type { WodRouteParams } from '@/lib/routes';

export interface UseWodRoutingReturn {
  /** Parsed + typed current route, or null if URL is unrecognised */
  route: WodRouteParams | null;

  /** The note ID from the URL (short-id or UUID), undefined if none */
  noteId: string | undefined;

  /** Current view mode derived from URL */
  viewMode: ViewMode;

  /** Current section ID from the URL, if any */
  sectionId: string | undefined;

  /** Current result ID from the URL, if any */
  resultId: string | undefined;

  /** Whether we're in playground (static) mode */
  isPlayground: boolean;

  // Navigation helpers ------------------------------------------------

  /** Navigate to the plan view for the current (or given) note */
  goToPlan: (noteId?: string) => void;

  /** Navigate to the track view for a specific wod section */
  goToTrack: (sectionId: string, noteId?: string) => void;

  /** Navigate to the review view with optional section/result filters */
  goToReview: (opts?: { sectionId?: string; resultId?: string; noteId?: string }) => void;

  /** Navigate to home / history */
  goToHistory: () => void;
}

export function useWodRouting(): UseWodRoutingReturn {
  const navigate = useNavigate();
  const raw = useParams<RawRouteParams>();
  const { pathname } = useLocation();

  const isPlayground = pathname.startsWith('/playground');
  const noteId = raw.noteId;
  const sectionId = raw.sectionId;
  const resultId = raw.resultId;

  const route = useMemo(() => parseRouteParams(raw), [raw]);

  const viewMode: ViewMode = useMemo(() => {
    if (route) return route.view;
    if (pathname === '/' || pathname.startsWith('/history')) return 'history';
    if (isPlayground) return 'plan';
    return 'plan';
  }, [route, pathname, isPlayground]);

  // ------------------------------------------------------------------
  // Navigation helpers
  // ------------------------------------------------------------------

  const goToPlan = useCallback(
    (overrideNoteId?: string) => {
      const id = overrideNoteId ?? noteId;
      if (isPlayground) {
        navigate(playgroundPlanPath());
      } else if (id) {
        navigate(planPath(id));
      }
    },
    [navigate, noteId, isPlayground],
  );

  const goToTrack = useCallback(
    (targetSectionId: string, overrideNoteId?: string) => {
      const id = overrideNoteId ?? noteId;
      if (isPlayground) {
        navigate(playgroundTrackPath(targetSectionId));
      } else if (id) {
        navigate(trackPath(id, targetSectionId));
      }
    },
    [navigate, noteId, isPlayground],
  );

  const goToReview = useCallback(
    (opts?: { sectionId?: string; resultId?: string; noteId?: string }) => {
      const id = opts?.noteId ?? noteId;
      if (isPlayground) {
        navigate(playgroundReviewPath());
      } else if (id) {
        navigate(reviewPath(id, opts?.sectionId, opts?.resultId));
      }
    },
    [navigate, noteId, isPlayground],
  );

  const goToHistory = useCallback(() => navigate('/'), [navigate]);

  return {
    route,
    noteId,
    viewMode,
    sectionId,
    resultId,
    isPlayground,
    goToPlan,
    goToTrack,
    goToReview,
    goToHistory,
  };
}
