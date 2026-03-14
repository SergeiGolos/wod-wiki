/**
 * RuntimePortalManager — DEPRECATED
 *
 * Replaced by the fixed-position RuntimePanel portals rendered directly in
 * UnifiedEditor.  This file is kept for reference only and exports a no-op.
 */

import React from "react";
import type { EditorView } from "@codemirror/view";

export interface RuntimePortalManagerProps {
  view: EditorView | null;
  version: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const RuntimePortalManager: React.FC<RuntimePortalManagerProps> = (_props) => null;
