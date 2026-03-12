import type { ViewMode } from '@/panels/panel-system/ResponsiveViewport';

/**
 * Supported view modes in the workbench.
 */
export type WorkbenchView = ViewMode | 'history' | 'analyze';

/**
 * Represents the current navigation state of the workbench.
 */
export interface NavigationState {
  noteId?: string;
  sectionId?: string;
  resultId?: string;
  view: WorkbenchView;
}

/**
 * INavigationProvider - Abstraction for workbench navigation.
 * 
 * Allows the Workbench to trigger navigation "intents" without 
 * being coupled to a specific routing library (like react-router)
 * or a physical URL structure.
 */
export interface INavigationProvider {
  /** Current state of navigation (reactive) */
  readonly state: NavigationState;

  /** Navigate to a specific view for a note */
  goToPlan(noteId: string): void;
  goToTrack(noteId: string, sectionId?: string): void;
  goToReview(noteId: string, sectionId?: string, resultId?: string): void;
  
  /** General purpose navigation */
  goTo(view: WorkbenchView, params?: Partial<Omit<NavigationState, 'view'>>): void;
  
  /** Go back (if supported by implementation) */
  goBack(): void;
}
