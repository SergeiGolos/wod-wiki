/**
 * WodCommand — public command interface for WhiteboardScript block overlays.
 *
 * Pass an array to NoteEditor via the `commands` prop.
 * The first `visibleCommands` items (default 1) render as direct buttons.
 * Any remaining commands are grouped behind a "…" overflow menu.
 */

import type React from "react";
import type { WodBlock } from "../types";

export interface WodCommand {
  /** Unique key used for React rendering and deduplication */
  id: string;
  /** Button label text */
  label: string;
  /**
   * Icon to display on the button.  Pass any React node — e.g. a Lucide icon
   * component (`<Play className="h-3 w-3 fill-current" />`) or an emoji string.
   */
  icon: React.ReactNode;
  /** Use filled primary styling instead of secondary outline.  Default: false */
  primary?: boolean;
  /** Called with the resolved WodBlock when the user clicks the button */
  onClick: (block: WodBlock) => void;
  /**
   * Optional split-button secondary action (e.g. copy to clipboard).
   * When provided, the button renders as a split pill with a divider separating
   * the main action from this secondary icon button.
   */
  splitIcon?: React.ReactNode;
  /** Icon to show in the split button after the secondary action completes (e.g. a checkmark) */
  splitSuccessIcon?: React.ReactNode;
  /** Called with the resolved WodBlock when the user clicks the split (secondary) button */
  onSplitClick?: (block: WodBlock) => Promise<void> | void;
}
