/**
 * Embed Preview Decorations
 *
 * CM6 extension that expands the line height for single-line markdown embeds
 * (![label](url) or [label](url)).
 *
 * Instead of replacing the text with a widget, this extension adds a block
 * widget decoration *at the same line* which physically stretches the line
 * height in the editor. This ensures:
 * 1. The line number gutter cell stretches to match.
 * 2. The OverlayTrack (following section geometry) gets the correct larger height.
 * 3. The text remains visible and editable behind the overlay (or as-is).
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { EditorState, Range, StateField, Extension } from "@codemirror/state";
import { sectionField, forceSectionParse } from "./section-state";

// ── Spacer Widget ────────────────────────────────────────────────────

/**
 * A transparent block widget that just takes up space.
 * This is used to "push" the line height out so the overlay has room.
 */
class EmbedSpacerWidget extends WidgetType {
  constructor(readonly height: number) {
    super();
  }

  eq(other: EmbedSpacerWidget): boolean {
    return other.height === this.height;
  }

  toDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "cm-embed-spacer";
    div.style.height = `${this.height}px`;
    div.style.pointerEvents = "none";
    return div;
  }

  get estimatedHeight(): number {
    return this.height;
  }

  /** Ensure this widget is treated as a block. */
  get block(): boolean {
    return true;
  }
}

// ── Build decorations ────────────────────────────────────────────────

function buildEmbedDecorations(state: EditorState): DecorationSet {
  const { sections } = state.field(sectionField);
  const decos: Range<Decoration>[] = [];

  for (const section of sections) {
    if (section.type !== "embed" || !section.embed) continue;

    const doc = state.doc;
    if (section.startLine > doc.lines) continue;

    const line = doc.line(section.startLine);
    
    // Determine expansion height based on embed type
    let height = 180; // default for links
    if (section.embed.type === "youtube") {
      height = 240;
    } else if (section.embed.isImage) {
      height = 200;
    }

    // Add a block widget at the start of the line to expand its height.
    // side: -1 means it sits at the same line but as a block.
    decos.push(
      Decoration.widget({
        widget: new EmbedSpacerWidget(height),
        block: true,
        side: -1,
      }).range(line.from)
    );
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField ───────────────────────────────────────────────────────

const embedPreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildEmbedDecorations(state);
  },
  update(value, tr) {
    // Re-calculate if doc or sections changed
    if (tr.docChanged || tr.effects.some(e => e.is(forceSectionParse))) {
      return buildEmbedDecorations(tr.state);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Extension ────────────────────────────────────────────────────────

export const embedPreviewDecorations: Extension = [
  embedPreviewField,
];
