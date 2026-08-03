/**
 * ScriptCommand — public command interface for WhiteboardScript block overlays.
 *
 * Pass an array to NoteEditor via the `commands` prop.
 * The first `visibleCommands` items (default 1) render as direct buttons.
 * Any remaining commands are grouped behind a "…" overflow menu.
 */

import type React from "react";
import type { ScriptBlock } from "../types";

/** Commands that only make sense for a runnable (`time`) block (#891/#894) */
const RUN_ONLY_COMMAND_IDS: Record<string, true> = {
  play: true,
  "add-to-today": true,
  schedule: true,
};

/** The log-mode command — renders in place of `play` for `log` blocks */
const LOG_COMMAND_ID = "log";

/**
 * Filter a page's command list down to what a block's run affordance allows
 * (decided in #894, implemented in #891):
 * - `run`  → everything except the `log` command.
 * - `log`  → `log` replaces `play`; planning commands (`add-to-today`,
 *   `schedule`) are withheld; `share` / `open-in-playground` pass through.
 * - `null` → no run/log affordance at all; only neutral commands remain.
 */
export function commandsForAffordance(
  commands: ScriptCommand[],
  affordance: "run" | "log" | null,
): ScriptCommand[] {
  return commands.filter((cmd) => {
    if (cmd.id === LOG_COMMAND_ID) return affordance === "log";
    if (RUN_ONLY_COMMAND_IDS[cmd.id]) return affordance === "run";
    return true;
  });
}

export interface ScriptCommand {
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
  /** Called with the resolved ScriptBlock when the user clicks the button */
  onClick: (block: ScriptBlock) => void;
  /**
   * Optional split-button secondary action (e.g. copy to clipboard).
   * When provided, the button renders as a split pill with a divider separating
   * the main action from this secondary icon button.
   */
  splitIcon?: React.ReactNode;
  /** Icon to show in the split button after the secondary action completes (e.g. a checkmark) */
  splitSuccessIcon?: React.ReactNode;
  /** Called with the resolved ScriptBlock when the user clicks the split (secondary) button */
  onSplitClick?: (block: ScriptBlock) => Promise<void> | void;
}
