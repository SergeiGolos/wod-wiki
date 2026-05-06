/**
 * WOD Block Decorations
 *
 * Line-level decorations that visually distinguish WhiteboardScript code-fence blocks
 * from surrounding markdown. Instead of replacing blocks with preview widgets,
 * this approach:
 *
 * 1. Decorates the opening/closing ``` fence lines with a collapsed "shelf"
 *    style (muted background, smaller text, rounded corners).
 * 2. Decorates inner WhiteboardScript lines with a raised "card" appearance —
 *    slightly larger font, background tint, and left accent border — so
 *    the block pops visually above the surrounding page.
 * 3. Provides a keymap where ArrowUp / ArrowDown skip over entire WOD
 *    blocks when the cursor is outside them, landing on the line just
 *    before or after the block.
 *
 * Line numbers remain visible at all times.
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  keymap,
} from "@codemirror/view";
import { EditorState, Range, StateField, Extension } from "@codemirror/state";
import {
  sectionField,
  EditorSection,
} from "./section-state";

// ── Line decoration specs (allocated once) ──────────────────────────

/** Opening fence line: ```wod / ```log / ```plan — faded, rounded top */
const fenceOpenDeco = Decoration.line({
  attributes: {
    class: "cm-wod-fence-open",
  },
});

/** Closing fence line: ``` — faded, rounded bottom */
const fenceCloseDeco = Decoration.line({
  attributes: {
    class: "cm-wod-fence-close",
  },
});

/** Inner WhiteboardScript content lines — indented, larger, card background */
const wodInnerDeco = Decoration.line({
  attributes: {
    class: "cm-wod-inner",
  },
});

// ── Build decorations from section state ────────────────────────────

function buildWodDecorations(state: EditorState): DecorationSet {
  const { sections } = state.field(sectionField);
  const decos: Range<Decoration>[] = [];

  for (const section of sections) {
    if (section.type !== "wod") continue;

    const doc = state.doc;
    const openLine = doc.line(section.startLine);
    const closeLine = doc.line(section.endLine);

    // Opening fence decoration
    decos.push(fenceOpenDeco.range(openLine.from));

    // Inner content lines
    for (let ln = section.startLine + 1; ln < section.endLine; ln++) {
      const line = doc.line(ln);
      decos.push(wodInnerDeco.range(line.from));
    }

    // Closing fence decoration
    if (section.endLine !== section.startLine) {
      decos.push(fenceCloseDeco.range(closeLine.from));
    }
  }

  // CM6 requires decorations sorted by `from`
  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField (line decos are safe from either field or plugin) ────

const wodBlockDecoField = StateField.define<DecorationSet>({
  create(state) {
    return buildWodDecorations(state);
  },
  update(value, tr) {
    if (tr.docChanged) {
      return buildWodDecorations(tr.state);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── ArrowUp / ArrowDown skip WOD blocks ─────────────────────────────

/**
 * Given a cursor line, find the WOD section that completely contains
 * that line (i.e. cursor is NOT inside the block content).
 * Returns null when the cursor is inside or not adjacent to a block.
 */
function wodBlockAt(
  sections: EditorSection[],
  lineNumber: number
): EditorSection | null {
  return (
    sections.find(
      (s) =>
        s.type === "wod" &&
        lineNumber >= s.startLine &&
        lineNumber <= s.endLine
    ) ?? null
  );
}

function skipWodDown(view: EditorView): boolean {
  const state = view.state;
  const { head } = state.selection.main;
  const curLine = state.doc.lineAt(head).number;
  const nextLine = curLine + 1;
  if (nextLine > state.doc.lines) return false;

  const { sections } = state.field(sectionField);
  const block = wodBlockAt(sections, nextLine);

  if (block) {
    // Jump past the entire block
    const targetLine = Math.min(block.endLine + 1, state.doc.lines);
    const pos = state.doc.line(targetLine).from;
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    return true;
  }
  return false; // let default handler run
}

function skipWodUp(view: EditorView): boolean {
  const state = view.state;
  const { head } = state.selection.main;
  const curLine = state.doc.lineAt(head).number;
  const prevLine = curLine - 1;
  if (prevLine < 1) return false;

  const { sections } = state.field(sectionField);
  const block = wodBlockAt(sections, prevLine);

  if (block) {
    // Jump before the entire block
    const targetLine = Math.max(block.startLine - 1, 1);
    const pos = state.doc.line(targetLine).from;
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    return true;
  }
  return false;
}

const wodSkipKeymap = keymap.of([
  { key: "ArrowDown", run: skipWodDown },
  { key: "ArrowUp", run: skipWodUp },
]);

// ── Base theme (fallback styles that work without Tailwind runtime) ──

// ── Base theme — the card/depth styling for WOD blocks ──────────────
//
// Fence lines are faded and shrunk so the ``` chrome recedes.
// Inner lines get a card-like background, left indent, rounded corners
// (via first/last child pseudo), and a box-shadow for depth.
//
// Because CM6 renders each line as a separate .cm-line element, we use
// the theme to target .cm-wod-fence-open / .cm-wod-fence-close for the
// top/bottom edges and .cm-wod-inner for the body. The shadow gets
// applied on the open/close lines and the continuous background on the
// inner lines creates one cohesive "card" feel.

const wodBlockBaseTheme = EditorView.baseTheme({
  // ── Fence lines (faded chrome) ──────────────────────────────────
  ".cm-wod-fence-open, .cm-wod-fence-close": {
    fontSize: "10px",
    lineHeight: "22px",
    opacity: "0.35",
    fontFamily: "var(--font-mono, monospace)",
    color: "inherit",
    // Indent to align with inner content
    paddingLeft: "24px",
  },

  // Top fence: rounded top corners + top part of the shadow
  ".cm-wod-fence-open": {
    borderRadius: "8px 8px 0 0",
    backgroundColor: "rgba(59, 130, 246, 0.04)",
    boxShadow: "0 -3px 8px -2px rgba(0,0,0,0.08), -3px 0 8px -4px rgba(0,0,0,0.06), 3px 0 8px -4px rgba(0,0,0,0.06)",
    paddingTop: "4px",
  },

  // Bottom fence: rounded bottom corners + bottom part of the shadow
  ".cm-wod-fence-close": {
    borderRadius: "0 0 8px 8px",
    backgroundColor: "rgba(59, 130, 246, 0.04)",
    boxShadow: "0 3px 8px -2px rgba(0,0,0,0.08), -3px 0 8px -4px rgba(0,0,0,0.06), 3px 0 8px -4px rgba(0,0,0,0.06)",
    paddingBottom: "4px",
  },

  // ── Inner WOD lines (the card body) ─────────────────────────────
  ".cm-wod-inner": {
    fontFamily: "var(--font-mono, monospace)",
    // Left indent so content is visually inset from surrounding markdown
    paddingLeft: "24px",
    // Continuous card background — no side shadows (they were distracting)
    backgroundColor: "rgba(59, 130, 246, 0.04)",
  },

  // ── Dark mode adjustments ───────────────────────────────────────
  "&dark .cm-wod-fence-open, &dark .cm-wod-fence-close": {
    backgroundColor: "rgba(96, 165, 250, 0.06)",
    opacity: "0.3",
  },
  "&dark .cm-wod-fence-open": {
    boxShadow: "0 -3px 10px -2px rgba(0,0,0,0.25), -3px 0 10px -4px rgba(0,0,0,0.2), 3px 0 10px -4px rgba(0,0,0,0.2)",
  },
  "&dark .cm-wod-fence-close": {
    boxShadow: "0 3px 10px -2px rgba(0,0,0,0.25), -3px 0 10px -4px rgba(0,0,0,0.2), 3px 0 10px -4px rgba(0,0,0,0.2)",
  },
  "&dark .cm-wod-inner": {
    backgroundColor: "rgba(96, 165, 250, 0.06)",
  },
});

// ── Public export ────────────────────────────────────────────────────

/**
 * Combined extension: line decorations for WOD block styling +
 * up/down keymap that skips WOD blocks.
 */
export const previewDecorations: Extension = [
  wodBlockDecoField,
  wodSkipKeymap,
  wodBlockBaseTheme,
];
