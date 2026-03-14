/**
 * fold-widgets
 *
 * A CM6 ViewPlugin that automatically folds the JSON body inside every
 * ```widget:<name> ... ``` block so the raw config doesn't clutter the view.
 *
 * Fold is applied once per section (tracked by section id) and survives
 * re-renders.  When the section disappears the fold entry is dropped so it
 * can be re-applied if the user adds a new widget block.
 */

import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { foldEffect, foldedRanges } from "@codemirror/language";
import { StateEffect } from "@codemirror/state";
import { sectionField } from "./section-state";

export const foldWidgets = ViewPlugin.fromClass(
  class {
    /** Tracks section ids that have already been folded this session */
    private folded = new Set<string>();

    constructor() {
      // folds are applied on first update() call
    }

    update(update: ViewUpdate) {
      const { sections } = update.view.state.field(sectionField);
      const widgetSections = sections.filter((s) => s.type === "widget");

      if (widgetSections.length === 0) return;

      // Drop ids that no longer exist so re-added blocks get re-folded
      const activeIds = new Set(widgetSections.map((s) => s.id));
      for (const id of this.folded) {
        if (!activeIds.has(id)) this.folded.delete(id);
      }

      const effects: StateEffect<unknown>[] = [];
      const existingFolds = foldedRanges(update.view.state);

      for (const sec of widgetSections) {
        if (this.folded.has(sec.id)) continue;
        // contentFrom / contentTo mark the raw text between the fences.
        if (sec.contentFrom === undefined || sec.contentTo === undefined) continue;
        if (sec.contentTo <= sec.contentFrom) continue;

        // Check if already folded (e.g. user manually folded or prior render)
        let alreadyFolded = false;
        existingFolds.between(sec.contentFrom, sec.contentTo, () => {
          alreadyFolded = true;
          return false;
        });
        if (alreadyFolded) {
          this.folded.add(sec.id);
          continue;
        }

        effects.push(foldEffect.of({ from: sec.contentFrom, to: sec.contentTo }));
        this.folded.add(sec.id);
      }

      if (effects.length > 0) {
        // Schedule dispatch outside the current update cycle
        const view = update.view;
        Promise.resolve().then(() => {
          if (view.dom.isConnected) {
            view.dispatch({ effects });
          }
        });
      }
    }
  },
);
