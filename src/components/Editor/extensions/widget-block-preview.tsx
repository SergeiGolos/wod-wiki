/**
 * Widget Block Preview
 *
 * CM6 extension that replaces ```widget:<name> ... ``` fenced blocks with a
 * full-width React component mounted via a React portal/root. The entire fenced
 * block (including fence lines) is replaced by a non-editable block decoration.
 *
 * Usage in markdown:
 *   ```widget:my-widget
 *   {"key":"value"}
 *   ```
 *
 * The widget component receives:
 *   - config: parsed JSON from the block body (or {} on parse error)
 *   - rawContent: raw string between the fences
 *   - sectionId: stable section identifier
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { Extension, StateField, Range, EditorState, Prec } from "@codemirror/state";
import type { Line } from "@codemirror/state";
// @ts-expect-error — react-dom/client subpath types don't resolve under moduleResolution:bundler (baseline issue)
import { createRoot } from "react-dom/client";
type Root = { render: (c: React.ReactNode) => void; unmount: () => void };
import React from "react";

import { sectionField } from "./section-state";
import type { EditorSection } from "./section-state";
import type { WidgetRegistry, WidgetProps } from "../widgets/types";

// ── React widget DOM bridge ──────────────────────────────────────────

class ReactWidgetBlock extends WidgetType {
  private root: Root | null = null;

  constructor(
    readonly widgetName: string,
    readonly rawContent: string,
    readonly sectionId: string,
    readonly registry: WidgetRegistry,
  ) {
    super();
  }

  eq(other: ReactWidgetBlock): boolean {
    return (
      this.widgetName === other.widgetName &&
      this.rawContent === other.rawContent &&
      this.sectionId === other.sectionId
    );
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-widget-block-preview";
    wrapper.style.cssText =
      "display:block; width:100%; min-height:1.5em; outline:none;";

    const Component = this.registry.get(this.widgetName) as
      | React.ComponentType<WidgetProps>
      | undefined;

    if (!Component) {
      wrapper.style.cssText +=
        "padding:8px 12px; color: var(--cm-muted, #888); font-size:12px; " +
        "border-left:2px solid var(--cm-border, #555); opacity:0.6;";
      wrapper.textContent = `[widget:${this.widgetName} not registered]`;
      return wrapper;
    }

    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(this.rawContent || "{}");
    } catch {
      // Use empty config on parse error
    }

    this.root = createRoot(wrapper) as Root;
    this.root.render(
      React.createElement(Component, {
        config,
        rawContent: this.rawContent,
        sectionId: this.sectionId,
      }),
    );

    return wrapper;
  }

  destroy(): void {
    if (this.root) {
      const r = this.root;
      this.root = null;
      // Defer unmount to avoid "Cannot update an unmounting root" warnings
      setTimeout(() => r.unmount(), 0);
    }
  }

  /** Allow pointer events inside the widget. */
  ignoreEvent(): boolean {
    return false;
  }

  get estimatedHeight(): number {
    return 200;
  }
}

// ── Decoration builder ───────────────────────────────────────────────

function buildWidgetDecos(state: EditorState, registry: WidgetRegistry): DecorationSet {
  let sectionState;
  try {
    sectionState = state.field(sectionField);
  } catch (e) {
    console.warn("[widget-block-preview] sectionField not found in state", e);
    return Decoration.none;
  }
  const { sections } = sectionState;
  const decos: Range<Decoration>[] = [];
  const cursorHead = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "widget" || !section.widgetName) continue;

    const doc = state.doc;
    if (section.startLine > doc.lines || section.endLine > doc.lines) continue;

    // Don't replace when cursor is inside the widget range (allows editing)
    if (cursorHead >= section.from && cursorHead <= section.to) continue;

    // Extract raw content between the fences
    const rawContent =
      section.contentFrom != null && section.contentTo != null
        ? doc.sliceString(section.contentFrom, section.contentTo).trim()
        : "";

    decos.push(
      Decoration.replace({
        widget: new ReactWidgetBlock(
          section.widgetName,
          rawContent,
          section.id,
          registry,
        ),
        block: true,
      }).range(section.from, section.to),
    );
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── Arrow-key navigation into widget blocks ─────────────────────────

function widgetSectionAtLine(
  sections: EditorSection[],
  line: Line,
): EditorSection | null {
  return sections.find(
    (section) =>
      section.type === "widget" &&
      line.from >= section.from &&
      line.from <= section.to,
  ) ?? null;
}

function isCursorInsideSection(state: EditorState, section: EditorSection): boolean {
  const { head } = state.selection.main;
  return head >= section.from && head <= section.to;
}

function moveToLinePreservingColumn(view: EditorView, targetLine: Line): void {
  const { head } = view.state.selection.main;
  const currentLine = view.state.doc.lineAt(head);
  const currentColumn = Math.max(0, head - currentLine.from);
  const targetColumn = Math.min(currentColumn, targetLine.length);
  const targetPosition = targetLine.from + targetColumn;

  view.dispatch({
    selection: { anchor: targetPosition, head: targetPosition },
    scrollIntoView: true,
  });
}

function enterWidgetDown(view: EditorView): boolean {
  const { head } = view.state.selection.main;
  const currentLineNumber = view.state.doc.lineAt(head).number;
  const nextLineNumber = currentLineNumber + 1;
  if (nextLineNumber > view.state.doc.lines) return false;

  const nextLine = view.state.doc.line(nextLineNumber);
  const { sections } = view.state.field(sectionField);
  const widgetSection = widgetSectionAtLine(sections, nextLine);

  if (!widgetSection) return false;
  if (isCursorInsideSection(view.state, widgetSection)) return false;

  moveToLinePreservingColumn(view, nextLine);
  return true;
}

function enterWidgetUp(view: EditorView): boolean {
  const { head } = view.state.selection.main;
  const currentLineNumber = view.state.doc.lineAt(head).number;
  const previousLineNumber = currentLineNumber - 1;
  if (previousLineNumber < 1) return false;

  const previousLine = view.state.doc.line(previousLineNumber);
  const { sections } = view.state.field(sectionField);
  const widgetSection = widgetSectionAtLine(sections, previousLine);

  if (!widgetSection) return false;
  if (isCursorInsideSection(view.state, widgetSection)) return false;

  moveToLinePreservingColumn(view, previousLine);
  return true;
}

const widgetNavKeymap = Prec.high(keymap.of([
  { key: "ArrowDown", run: enterWidgetDown },
  { key: "ArrowUp", run: enterWidgetUp },
]));

// ── Factory ──────────────────────────────────────────────────────────

/**
 * Create a CM6 Extension that replaces widget fenced blocks with React components.
 * Block decorations MUST come from a StateField (not a ViewPlugin) per CM6 constraints.
 */
export function widgetBlockPreview(registry: WidgetRegistry): Extension {
  const widgetPreviewField = StateField.define<DecorationSet>({
    create(state) {
      return buildWidgetDecos(state, registry);
    },
    update(value, tr) {
      if (tr.docChanged || tr.selection) {
        return buildWidgetDecos(tr.state, registry);
      }
      return value;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [widgetPreviewField, widgetNavKeymap];
}
