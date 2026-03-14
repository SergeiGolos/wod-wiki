/**
 * runtime-panel-state.ts
 *
 * CM6 StateField that tracks inline runtime panels injected below WOD sections.
 * When a panel is added for a section, a block-widget spacer (plain DOM div) is
 * inserted at the character position just after the section's closing fence line.
 *
 * React portals (RuntimePortalManager) layer the actual TimerScreen UI into
 * those spacers — this file deliberately contains no React.
 */

import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import type { Range } from "@codemirror/state";
import type { WodBlock } from "../types";

// ── Entry type ────────────────────────────────────────────────────────

export interface RuntimePanelEntry {
  /** The WOD block to execute */
  block: WodBlock;
  /** Character position at the END of the WOD section (where the spacer goes) */
  afterPos: number;
  /** Whether the panel is expanded to fill the editor container */
  expanded: boolean;
}

// ── Panel heights ─────────────────────────────────────────────────────

export const RUNTIME_PANEL_HEIGHT_PX = 500;
export const RUNTIME_PANEL_HEIGHT_EXPANDED_PX = 600;

// ── Effects ───────────────────────────────────────────────────────────

export const addRuntimePanel = StateEffect.define<{
  sectionId: string;
  entry: RuntimePanelEntry;
}>();

export const removeRuntimePanel = StateEffect.define<{ sectionId: string }>();

export const expandRuntimePanel = StateEffect.define<{
  sectionId: string;
  expanded: boolean;
}>();

// ── Block spacer widget ────────────────────────────────────────────────

/**
 * Pure DOM spacer created by CM6 WidgetType.
 * React portals will later inject content into this element.
 * The `data-runtime-section-id` attribute is the bridge between
 * CM6 widget DOM and the React portal manager.
 */
class RuntimeSpacerWidget extends WidgetType {
  constructor(
    readonly sectionId: string,
    readonly height: number,
  ) {
    super();
  }

  eq(other: RuntimeSpacerWidget): boolean {
    return this.sectionId === other.sectionId && this.height === other.height;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-runtime-panel-spacer";
    el.setAttribute("data-runtime-section-id", this.sectionId);
    el.style.height = `${this.height}px`;
    el.style.position = "relative";
    el.style.overflow = "hidden";
    // Ensure pointer events work inside the panel
    el.style.pointerEvents = "auto";
    return el;
  }

  /** Allow pointer events to pass through to the React UI inside */
  ignoreEvent(): boolean {
    return false;
  }
}

// ── Decoration builder ────────────────────────────────────────────────

function buildRuntimePanelDecos(
  panels: Map<string, RuntimePanelEntry>,
): DecorationSet {
  if (panels.size === 0) return Decoration.none;

  const decos: Range<Decoration>[] = [];

  for (const [sectionId, entry] of panels) {
    const height = entry.expanded
      ? RUNTIME_PANEL_HEIGHT_EXPANDED_PX
      : RUNTIME_PANEL_HEIGHT_PX;

    // Clamp to valid range
    const pos = Math.max(0, entry.afterPos);

    decos.push(
      Decoration.widget({
        widget: new RuntimeSpacerWidget(sectionId, height),
        block: true,
        side: 1, // After the character at `pos`
      }).range(pos),
    );
  }

  // Must be sorted ascending by position
  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField ────────────────────────────────────────────────────────

export const runtimePanelField = StateField.define<Map<string, RuntimePanelEntry>>({
  create() {
    return new Map();
  },

  update(panels, tr) {
    let next = panels;

    for (const e of tr.effects) {
      if (e.is(addRuntimePanel)) {
        next = new Map(next);
        next.set(e.value.sectionId, e.value.entry);
      } else if (e.is(removeRuntimePanel)) {
        if (!next.has(e.value.sectionId)) continue;
        next = new Map(next);
        next.delete(e.value.sectionId);
      } else if (e.is(expandRuntimePanel)) {
        const existing = next.get(e.value.sectionId);
        if (!existing) continue;
        next = new Map(next);
        next.set(e.value.sectionId, { ...existing, expanded: e.value.expanded });
      }
    }

    return next;
  },

  provide: (field) =>
    EditorView.decorations.from(field, buildRuntimePanelDecos),
});

// ── Dispatch helpers ──────────────────────────────────────────────────

/**
 * Open an inline runtime panel below the WOD section.
 * If a panel is already open for this section, it is replaced.
 */
export function dispatchAddRuntimePanel(
  view: EditorView,
  sectionId: string,
  block: WodBlock,
  afterPos: number,
): void {
  view.dispatch({
    effects: addRuntimePanel.of({
      sectionId,
      entry: { block, afterPos, expanded: false },
    }),
  });
}

/** Close (remove) the inline runtime panel for a section. */
export function dispatchRemoveRuntimePanel(
  view: EditorView,
  sectionId: string,
): void {
  view.dispatch({ effects: removeRuntimePanel.of({ sectionId }) });
}

/** Expand or collapse the inline runtime panel for a section. */
export function dispatchExpandRuntimePanel(
  view: EditorView,
  sectionId: string,
  expanded: boolean,
): void {
  view.dispatch({ effects: expandRuntimePanel.of({ sectionId, expanded }) });
}
