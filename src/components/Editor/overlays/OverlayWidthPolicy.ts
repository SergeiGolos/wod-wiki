/**
 * Overlay Width Policy
 *
 * Pure function that determines the companion overlay width for a given section.
 * No CM6 dependency — testable in isolation, configurable per section type.
 *
 * Width is expressed as a percentage (0-100) of the editor viewport width,
 * measured from the RIGHT edge. 0 = no overlay, 100 = full-width overlay.
 */

import type { EditorSectionType } from "../extensions/section-state";

// ── Types ────────────────────────────────────────────────────────────

export interface OverlayWidthInput {
  sectionType: EditorSectionType;
  isActive: boolean;
  userOverride?: number; // 0-100, if user has manually set width
}

export interface OverlayWidthDefaults {
  wod:         { active: number; inactive: number };
  frontmatter: { active: number; inactive: number };
  markdown:    { active: number; inactive: number };
  code:        { active: number; inactive: number };
}

// ── Default policy values ────────────────────────────────────────────

export const DEFAULT_OVERLAY_WIDTHS: OverlayWidthDefaults = {
  wod:         { active: 35, inactive: 15 },
  frontmatter: { active: 35, inactive: 100 },
  markdown:    { active: 0,  inactive: 0 },
  code:        { active: 30, inactive: 0 },
};

// ── Policy function ──────────────────────────────────────────────────

/**
 * Compute the overlay width percentage for a section.
 *
 * Priority: userOverride > policy default for active/inactive state.
 * Clamps result to [0, 100].
 */
export function computeOverlayWidth(
  input: OverlayWidthInput,
  defaults: OverlayWidthDefaults = DEFAULT_OVERLAY_WIDTHS,
): number {
  if (input.userOverride !== undefined) {
    return Math.max(0, Math.min(100, input.userOverride));
  }

  const typeDefaults = defaults[input.sectionType];
  if (!typeDefaults) return 0;

  return input.isActive ? typeDefaults.active : typeDefaults.inactive;
}
