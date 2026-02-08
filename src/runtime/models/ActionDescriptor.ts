/**
 * ActionDescriptor - Describes a user-facing action/button in the workout UI.
 * 
 * Used by both the runtime hooks layer (useActiveControls) and UI components
 * (RefinedTimerDisplay) to represent interactive buttons.
 */
export interface ActionDescriptor {
  id: string;
  name: string;
  eventName: string;
  ownerId: string;
  sourceId?: string;
  raw?: string;
  displayLabel?: string;
  payload?: Record<string, unknown>;
  isPinned?: boolean;
}
