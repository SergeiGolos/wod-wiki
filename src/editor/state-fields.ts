import { StateField, StateEffect } from "@codemirror/state";
import { WodBlockState } from "../markdown-editor/types";

/**
 * Effect to update the active workout block ID.
 */
export const setActiveWorkoutId = StateEffect.define<string | null>();

/**
 * Field storing the currently active workout block ID.
 */
export const activeWorkoutIdField = StateField.define<string | null>({
  create() { return null; },
  update(value, tr) {
    for (let e of tr.effects) if (e.is(setActiveWorkoutId)) return e.value;
    return value;
  }
});

/**
 * Metadata for a WOD block's runtime state.
 */
export interface WodBlockRuntimeMeta {
  blockId: string;
  state: WodBlockState;
  progress?: number; // 0 to 1
  completedExercises?: Set<number>; // statement IDs
  collectibles?: Record<string, any>;
}

/**
 * Effect to update runtime metadata for a WOD block.
 */
export const setWodBlockRuntimeMeta = StateEffect.define<WodBlockRuntimeMeta>();

/**
 * Field storing runtime metadata for all WOD blocks in the document.
 */
export const wodBlockRuntimeField = StateField.define<Record<string, WodBlockRuntimeMeta>>({
  create() { return {}; },
  update(value, tr) {
    let newValue = { ...value };
    let changed = false;
    for (let e of tr.effects) {
      if (e.is(setWodBlockRuntimeMeta)) {
        newValue[e.value.blockId] = e.value;
        changed = true;
      }
    }
    return changed ? newValue : value;
  }
});
