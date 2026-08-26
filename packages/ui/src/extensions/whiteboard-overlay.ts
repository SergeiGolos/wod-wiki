import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { EditorSection } from "./section-state";

export interface OverlayAction {
  label: string;
  icon: string;
  action: (view: EditorView, section: EditorSection) => void;
}

let overlayActions: OverlayAction[] = [];

export function configureOverlayActions(actions: OverlayAction[]) {
  overlayActions = actions;
}

export function getOverlayActions(): OverlayAction[] {
  return overlayActions;
}

export const wodOverlayPanel: Extension = [];
