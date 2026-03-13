/**
 * useOverlayWidthState
 *
 * React hook that manages the effective overlay width for each section.
 * Combines section metadata + active section + user overrides + policy
 * to produce a Map<sectionId, effectiveWidth>.
 *
 * Intended to be called from UnifiedEditor and passed to OverlayTrack.
 */

import { useCallback, useReducer, useMemo } from "react";
import type { EditorSection, EditorSectionType } from "../extensions/section-state";
import {
  computeOverlayWidth,
  DEFAULT_OVERLAY_WIDTHS,
} from "./OverlayWidthPolicy";
import type { OverlayWidthDefaults } from "./OverlayWidthPolicy";

// ── Types ────────────────────────────────────────────────────────────

export interface SectionOverlayState {
  effectiveWidth: number; // 0-100
  isUserOverridden: boolean;
}

interface OverlayWidthReducerState {
  /** Per-type user overrides (persisted across sections with same type) */
  typeOverrides: Partial<Record<EditorSectionType, number>>;
  /** Per-section user overrides (takes precedence over type overrides) */
  sectionOverrides: Record<string, number>;
}

type OverlayWidthAction =
  | { type: "SET_SECTION_WIDTH"; sectionId: string; width: number }
  | { type: "SET_TYPE_WIDTH"; sectionType: EditorSectionType; width: number }
  | { type: "CLEAR_SECTION_OVERRIDE"; sectionId: string }
  | { type: "CLEAR_TYPE_OVERRIDE"; sectionType: EditorSectionType };

// ── Reducer ──────────────────────────────────────────────────────────

function reducer(
  state: OverlayWidthReducerState,
  action: OverlayWidthAction,
): OverlayWidthReducerState {
  switch (action.type) {
    case "SET_SECTION_WIDTH":
      return {
        ...state,
        sectionOverrides: {
          ...state.sectionOverrides,
          [action.sectionId]: action.width,
        },
      };
    case "SET_TYPE_WIDTH":
      return {
        ...state,
        typeOverrides: {
          ...state.typeOverrides,
          [action.sectionType]: action.width,
        },
      };
    case "CLEAR_SECTION_OVERRIDE": {
      const { [action.sectionId]: _, ...rest } = state.sectionOverrides;
      return { ...state, sectionOverrides: rest };
    }
    case "CLEAR_TYPE_OVERRIDE": {
      const { [action.sectionType]: _, ...rest } = state.typeOverrides;
      return { ...state, typeOverrides: rest as typeof state.typeOverrides };
    }
    default:
      return state;
  }
}

const INITIAL_STATE: OverlayWidthReducerState = {
  typeOverrides: {},
  sectionOverrides: {},
};

// ── Hook ─────────────────────────────────────────────────────────────

export interface UseOverlayWidthStateResult {
  /** Map of sectionId → overlay state */
  widths: Map<string, SectionOverlayState>;
  /** Set overlay width for a specific section */
  setSectionWidth: (sectionId: string, width: number) => void;
  /** Set overlay width default for a section type */
  setTypeWidth: (sectionType: EditorSectionType, width: number) => void;
  /** Clear per-section override (fall back to type/policy default) */
  clearSectionOverride: (sectionId: string) => void;
}

export function useOverlayWidthState(
  sections: EditorSection[],
  activeSectionId: string | null,
  defaults: OverlayWidthDefaults = DEFAULT_OVERLAY_WIDTHS,
): UseOverlayWidthStateResult {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const widths = useMemo(() => {
    const map = new Map<string, SectionOverlayState>();

    for (const sec of sections) {
      const isActive = sec.id === activeSectionId;

      // Priority: section override > type override > policy default
      const sectionOverride = state.sectionOverrides[sec.id];
      const typeOverride = state.typeOverrides[sec.type];
      const userOverride = sectionOverride ?? typeOverride;

      const effectiveWidth = computeOverlayWidth(
        {
          sectionType: sec.type,
          isActive,
          userOverride,
        },
        defaults,
      );

      map.set(sec.id, {
        effectiveWidth,
        isUserOverridden: userOverride !== undefined,
      });
    }

    return map;
  }, [sections, activeSectionId, state, defaults]);

  const setSectionWidth = useCallback(
    (sectionId: string, width: number) =>
      dispatch({ type: "SET_SECTION_WIDTH", sectionId, width }),
    [],
  );

  const setTypeWidth = useCallback(
    (sectionType: EditorSectionType, width: number) =>
      dispatch({ type: "SET_TYPE_WIDTH", sectionType, width }),
    [],
  );

  const clearSectionOverride = useCallback(
    (sectionId: string) =>
      dispatch({ type: "CLEAR_SECTION_OVERRIDE", sectionId }),
    [],
  );

  return { widths, setSectionWidth, setTypeWidth, clearSectionOverride };
}
