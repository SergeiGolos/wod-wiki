/**
 * wod-results-widget
 *
 * CM6 extension that manages workout result visualization within WOD blocks.
 *
 * Features:
 *   1. An expandable results panel inserted after the closing fence of each WOD block.
 *   2. Collapsed state shows compact result rows (time, status, duration).
 *   3. Expanded state shows AnalyticsScorecard + full ReviewGrid (sort, filter, search, graph).
 *   4. A "Full Review" button opens the FullscreenReview dialog for the full experience.
 *
 * Architecture:
 *   - `wodResultsField`: Stores the actual result data per section.
 *   - `ReactResultsWidget`: CM6 WidgetType that mounts a React root
 *     rendering <InlineResultPanel>.
 *   - `WOD_RESULT_CLICK_EVENT`: Fired when user clicks "Full Review" in the inline panel.
 *
 * This path intentionally stays separate from `ReviewGrid`: CM6 widget
 * decorations are inline-document primitives, so the editor uses a React-bridged
 * widget instead of the grid's standalone component contract.
 */

import React from 'react';
import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import { StateEffect, StateField, EditorState, Range } from '@codemirror/state';
import { sectionField } from './section-state';
import type { WorkoutResult } from '@/types/storage';
import { createRoot, type Root } from 'react-dom/client';
import { InlineResultPanel } from '@/components/molecules/InlineResultPanel';

// ── Custom DOM event ─────────────────────────────────────────────────

/** Fired on the editor DOM when the user clicks "Full Review" in the inline panel. */
export const WOD_RESULT_CLICK_EVENT = 'wod-result-click';

export interface WodResultClickDetail {
  sectionId: string;
  result: WorkoutResult;
}

// ── StateEffects ─────────────────────────────────────────────────────

/** Update (replace) results for a single section. */
export const updateSectionResults = StateEffect.define<{
  sectionId: string;
  results: WorkoutResult[];
}>();

// ── StateFields ──────────────────────────────────────────────────────

/** Field storing the results Map. */
export const wodResultsField = StateField.define<Map<string, WorkoutResult[]>>({
  create: () => new Map(),
  update(map, tr) {
    let newMap: Map<string, WorkoutResult[]> | null = null;
    for (const e of tr.effects) {
      if (e.is(updateSectionResults)) {
        if (!newMap) newMap = new Map(map);
        newMap.set(e.value.sectionId, e.value.results);
      }
    }
    return newMap ?? map;
  },
});

// ── React-backed Widget ───────────────────────────────────────────────

class ReactResultsWidget extends WidgetType {
  private root: Root | null = null;

  constructor(
    readonly sectionId: string,
    readonly allResults: WorkoutResult[],
    readonly currentContentId: string | undefined,
  ) {
    super();
  }
  eq(other: ReactResultsWidget): boolean {
    if (other.sectionId !== this.sectionId) return false;
    if (other.currentContentId !== this.currentContentId) return false;
    if (other.allResults.length !== this.allResults.length) return false;
    for (let i = 0; i < Math.min(2, this.allResults.length); i++) {
      if (this.allResults[i].completedAt !== other.allResults[i].completedAt) return false;
    }
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-wod-results-inlay';
    wrapper.style.cssText = 'display:block; width:100%; outline:none;';

    this.root = createRoot(wrapper);
    this.root.render(
      React.createElement(InlineResultPanel, {
        sectionId: this.sectionId,
        allResults: this.allResults,
        currentContentId: this.currentContentId,
        onOpenReview: (result: WorkoutResult) => {
          const detail: WodResultClickDetail = { sectionId: this.sectionId, result };
          view.dom.dispatchEvent(
            new CustomEvent(WOD_RESULT_CLICK_EVENT, { detail, bubbles: true }),
          );
        },
      }),
    );

    return wrapper;
  }

  destroy(): void {
    if (this.root) {
      const r = this.root;
      this.root = null;
      
      const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
      if (isTestEnv) {
        r.unmount();
      } else {
        queueMicrotask(() => {
          try {
            r.unmount();
          } catch (e) {
            // Ignore errors if already unmounted or cleaned up
          }
        });
      }
    }
  }

  get estimatedHeight(): number {
    return 5 + (this.allResults.length * 60);
  }

  ignoreEvent(): boolean {
    return false;
  }
}

// ── Build decorations ─────────────────────────────────────────────────

function _buildResultsDecorations(state: EditorState): DecorationSet {
  const { sections } = state.field(sectionField);
  const resultsMap: Map<string, WorkoutResult[]> = state.field(wodResultsField);
  const decos: Range<Decoration>[] = [];

  for (const section of sections) {
    if (section.type !== 'wod') continue;
    const allResults = resultsMap.get(section.id);
    if (!allResults || allResults.length === 0) continue;

    const doc = state.doc;
    if (section.endLine > doc.lines) continue;
    const anchorPos = section.to;
    if (anchorPos < 0 || anchorPos > doc.length) continue;

    decos.push(
      Decoration.widget({
        widget: new ReactResultsWidget(section.id, allResults, section.contentId),
        block: true,
        side: 1,
      }).range(anchorPos),
    );
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField: decorations ──────────────────────────────────────────

export const wodResultsDecorations = StateField.define<DecorationSet>({
  create(state) {
    return _buildResultsDecorations(state);
  },
  update(prev, tr) {
    if (tr.docChanged ||
        tr.effects.some((e) => e.is(updateSectionResults))) {
      return _buildResultsDecorations(tr.state);
    }
    return prev.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Theme ─────────────────────────────────────────────────────────────

export const wodResultsTheme = EditorView.baseTheme({
  '.cm-wod-results-inlay': {
    padding: '0',
  },
  '.cm-wod-results-separator': {
    height: '1px',
    margin: '4px 8px 2px',
    background: 'hsl(var(--border) / 0.15)',
  },
});

// ── Bundle ────────────────────────────────────────────────────────────

export const wodResultsWidget = [
  wodResultsField,
  wodResultsDecorations,
  wodResultsTheme,
];
