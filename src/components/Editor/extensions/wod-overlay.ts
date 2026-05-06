/**
 * Wod Overlay — shared action registry for WhiteboardScript block panels.
 *
 * The visual overlay companion (WodCompanion) lives in
 * src/components/Editor/overlays/WodCompanion.tsx and is rendered
 * by the OverlayTrack system.  This module owns the shared action
 * registry so companion components and the editor host can stay
 * decoupled.
 */

import { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { EditorSection } from "./section-state";

// ── Public types & configuration ────────────────────────────────────

export interface OverlayAction {
  label: string;
  icon: string;
  action: (view: EditorView, section: EditorSection) => void;
}

let overlayActions: OverlayAction[] = [];

/**
 * Register the action buttons that companion panels should show.
 * Call this from the editor host before mounting.
 */
export function configureOverlayActions(actions: OverlayAction[]) {
  overlayActions = actions;
}

/** Read the currently registered overlay actions. */
export function getOverlayActions(): OverlayAction[] {
  return overlayActions;
}

/**
 * Extension slot kept for API compatibility.  The actual overlay UI
 * is rendered by WodCompanion via the OverlayTrack system.
 */
export const wodOverlayPanel: Extension = [];
