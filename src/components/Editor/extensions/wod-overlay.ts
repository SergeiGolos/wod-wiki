/**
 * Interactive Overlay Panel Extension
 *
 * Floating UI that appears on a WodScript block when the cursor is
 * inside it OR the mouse hovers over it. Panel floats to the right
 * of the editor content.
 *
 * Implementation:
 * - Cursor-in-block: StateField → showTooltip (proven CM6 pattern)
 * - Mouse hover: hoverTooltip (built-in CM6 mechanism)
 * - Right positioning: CSS class on tooltip wrapper
 */

import {
  showTooltip,
  hoverTooltip,
  Tooltip,
  TooltipView,
  EditorView,
} from "@codemirror/view";
import { StateField, Extension } from "@codemirror/state";
import {
  sectionField,
  activeCursorSection,
  EditorSection,
} from "./section-state";

// ── Public types & configuration ────────────────────────────────────

export interface OverlayAction {
  label: string;
  icon: string;
  action: (view: EditorView, section: EditorSection) => void;
}

let overlayActions: OverlayAction[] = [];

/**
 * Configure overlay panel actions.
 * Call before creating the editor to set up callbacks.
 */
export function configureOverlayActions(actions: OverlayAction[]) {
  overlayActions = actions;
}

// ── Build panel DOM ─────────────────────────────────────────────────

function buildPanelDom(
  view: EditorView,
  section: EditorSection
): HTMLElement {
  const dom = document.createElement("div");
  dom.className =
    "cm-wod-overlay flex items-center gap-1 px-2 py-1 bg-popover border border-border rounded-md shadow-md";

  // Dialect badge
  const badge = document.createElement("span");
  badge.className =
    "text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase";
  badge.textContent = section.dialect || "wod";
  dom.appendChild(badge);

  // Separator
  const sep = document.createElement("div");
  sep.className = "w-px h-4 bg-border mx-1";
  dom.appendChild(sep);

  // Run button
  const runBtn = document.createElement("button");
  runBtn.className =
    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors";
  runBtn.innerHTML = "▶ Run";
  runBtn.title = "Run this workout block";
  runBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const runAction = overlayActions.find((a) => a.label === "Run");
    runAction?.action(view, section);
  };
  dom.appendChild(runBtn);

  // Add to Plan button
  const planBtn = document.createElement("button");
  planBtn.className =
    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors";
  planBtn.innerHTML = "📋 Plan";
  planBtn.title = "Add to workout plan";
  planBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const planAction = overlayActions.find((a) => a.label === "Plan");
    planAction?.action(view, section);
  };
  dom.appendChild(planBtn);

  // Custom actions
  for (const action of overlayActions) {
    if (action.label === "Run" || action.label === "Plan") continue;
    const btn = document.createElement("button");
    btn.className =
      "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors";
    btn.innerHTML = `${action.icon} ${action.label}`;
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      action.action(view, section);
    };
    dom.appendChild(btn);
  }

  return dom;
}

// ── Create tooltip spec for a section ───────────────────────────────

function makeTooltipSpec(section: EditorSection): Tooltip {
  return {
    pos: section.from,
    above: true,
    strictSide: true,
    arrow: false,
    create(view: EditorView): TooltipView {
      console.log("[wod-overlay] Creating tooltip for section:", section.id, section.type, "pos:", section.from);
      const dom = buildPanelDom(view, section);
      return {
        dom,
        offset: { x: 0, y: -4 },
        positioned() {
          // After CM6 positions the tooltip, nudge it to the right edge
          const wrapper = dom.parentElement;
          if (!wrapper || !wrapper.classList.contains("cm-tooltip")) return;
          const scrollRect = view.scrollDOM.getBoundingClientRect();
          const w = wrapper.offsetWidth;
          if (w > 0) {
            wrapper.style.left = `${scrollRect.right - w - 8}px`;
          }
        },
      };
    },
  };
}

// ── Cursor-based tooltip ────────────────────────────────────────────

function getCursorTooltip(
  state: import("@codemirror/state").EditorState
): readonly Tooltip[] {
  const section = activeCursorSection(state);
  console.log("[wod-overlay] getCursorTooltip:", section?.id, section?.type);
  if (!section || section.type !== "wod") return [];
  return [makeTooltipSpec(section)];
}

const cursorTooltipField = StateField.define<readonly Tooltip[]>({
  create(state) {
    return getCursorTooltip(state);
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return getCursorTooltip(tr.state);
    }
    return value;
  },
  provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});

// ── Hover-based tooltip ─────────────────────────────────────────────

const hoverOverlay = hoverTooltip(
  (view, pos, _side) => {
    const line = view.state.doc.lineAt(pos);
    const { sections } = view.state.field(sectionField);
    const section = sections.find(
      (s) =>
        s.type === "wod" &&
        line.number >= s.startLine &&
        line.number <= s.endLine
    );
    if (!section) return null;

    // Don't double-show if cursor is already in this block
    const cursorSection = activeCursorSection(view.state);
    if (cursorSection && cursorSection.id === section.id) return null;

    return makeTooltipSpec(section);
  },
  {
    hideOnChange: true,
    hoverTime: 200,
  }
);

// ── Base theme ──────────────────────────────────────────────────────

const overlayBaseTheme = EditorView.baseTheme({
  ".cm-wod-overlay": {
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
});

// ── Public export ───────────────────────────────────────────────────

/**
 * Extension: floating action panel for WodScript blocks.
 * Shows on cursor-in-block or mouse hover. Positioned at right edge.
 */
export const wodOverlayPanel: Extension = [
  cursorTooltipField,
  hoverOverlay,
  overlayBaseTheme,
];
