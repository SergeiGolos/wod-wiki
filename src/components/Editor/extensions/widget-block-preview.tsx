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
import { Extension, StateField, Range, EditorState, Prec, StateEffect } from "@codemirror/state";
import type { Line } from "@codemirror/state";
// @ts-expect-error — react-dom/client subpath types don't resolve under moduleResolution:bundler (baseline issue)
import { createRoot } from "react-dom/client";
// @ts-expect-error — react-dom flushSync subpath types don't resolve under moduleResolution:bundler (baseline issue)
import { flushSync } from "react-dom";
type Root = { render: (c: React.ReactNode) => void; unmount: () => void };
import React from "react";

/** Effect to toggle edit mode for a specific widget block */
export const toggleWidgetEdit = StateEffect.define<{ sectionId: string; editing: boolean }>();

/** StateField to track which widgets are currently being edited as raw text */
export const editingWidgetsField = StateField.define<Set<string>>({
  create: () => new Set(),
  update(value, tr) {
    let next = value;
    for (const effect of tr.effects) {
      if (effect.is(toggleWidgetEdit)) {
        next = new Set(next);
        if (effect.value.editing) next.add(effect.value.sectionId);
        else next.delete(effect.value.sectionId);
      }
    }
    return next;
  },
});

import { cn } from "@/lib/utils";

import { sectionField } from "./section-state";
import type { EditorSection } from "./section-state";
import type { WidgetConfig, WidgetRegistry, WidgetProps } from "../widgets/types";
import { WidgetEditButton } from "./WidgetEditButton";
import { EditableMarkdown } from "./EditableMarkdown";

interface WidgetConfigParseFailure {
  ok: false;
  config: {};
  message: string;
}

interface WidgetConfigParseSuccess {
  ok: true;
  config: WidgetConfig;
}

type WidgetConfigParseResult = WidgetConfigParseSuccess | WidgetConfigParseFailure;

export interface WidgetEditState {
  isEditing: boolean;
  isDirty: boolean;
  error: string | null;
  originalMarkdown: string;
  currentMarkdown: string;
  hasFocus: boolean;
}

interface WidgetBlockPreviewWrapperProps {
  widgetName: string;
  rawContent: string;
  sectionId: string;
  registry: WidgetRegistry;
  view: EditorView;
}

function stripEditorTrailingNewline(rawContent: string): string {
  return rawContent.endsWith("\n") ? rawContent.slice(0, -1) : rawContent;
}

function normalizeWidgetMarkdown(markdown: string): string {
  const content = markdown.replace(/\n+$/, "");
  return `${content}\n`;
}

function parseWidgetConfig(rawContent: string): WidgetConfigParseResult {
  const source = rawContent.trim();

  if (source.length === 0) {
    return { ok: true, config: {} };
  }

  try {
    const parsed = JSON.parse(source);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return {
        ok: false,
        config: {},
        message: "Widget config must be a JSON object.",
      };
    }

    return { ok: true, config: parsed as WidgetConfig };
  } catch (error) {
    return {
      ok: false,
      config: {},
      message: error instanceof Error ? error.message : "Invalid JSON.",
    };
  }
}

function findWidgetSection(view: EditorView, sectionId: string): EditorSection | null {
  const { sections } = view.state.field(sectionField);
  return sections.find((section) => section.type === "widget" && section.id === sectionId) ?? null;
}

function saveWidgetSource(view: EditorView, sectionId: string, markdown: string): WidgetConfigParseResult | null {
  const parsed = parseWidgetConfig(markdown);
  if (!parsed.ok) {
    return parsed;
  }

  const section = findWidgetSection(view, sectionId);
  if (!section || section.contentFrom == null || section.contentTo == null) {
    return {
      ok: false,
      config: {},
      message: "Unable to locate widget source in the editor.",
    };
  }

  view.dispatch({
    changes: {
      from: section.contentFrom,
      to: section.contentTo,
      insert: normalizeWidgetMarkdown(markdown),
    },
  });

  return parsed;
}

function renderMissingWidget(widgetName: string): React.ReactNode {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
      <span className="font-mono">widget:{widgetName}</span>
      <span className="ml-2 opacity-70">is not registered</span>
    </div>
  );
}

function renderInvalidWidget(widgetName: string, message: string): React.ReactNode {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-5 text-sm text-destructive shadow-sm">
      <p className="font-medium">Widget config error</p>
      <p className="mt-1 font-mono text-xs leading-5 text-destructive/90">widget:{widgetName}</p>
      <p className="mt-2 font-mono text-xs leading-5 text-destructive/90">{message}</p>
    </div>
  );
}

function WidgetBlockPreviewWrapper({
  widgetName,
  rawContent,
  sectionId,
  registry,
  view,
}: WidgetBlockPreviewWrapperProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const previewSurfaceRef = React.useRef<HTMLDivElement | null>(null);
  const originalMarkdown = React.useMemo(() => stripEditorTrailingNewline(rawContent), [rawContent]);
  const [state, setState] = React.useState<WidgetEditState>(() => ({
    isEditing: false,
    isDirty: false,
    error: null,
    originalMarkdown,
    currentMarkdown: originalMarkdown,
    hasFocus: false,
  }));

  const isEditingInMain = view.state.field(editingWidgetsField).has(sectionId);

  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      isEditing: false,
      isDirty: false,
      error: null,
      originalMarkdown,
      currentMarkdown: originalMarkdown,
    }));
  }, [originalMarkdown]);

  React.useEffect(() => {
    if (!state.isEditing) return;
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const length = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(length, length);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [state.isEditing]);

  const previewComponent = registry.get(widgetName) as React.ComponentType<WidgetProps> | undefined;
  const previewParse = React.useMemo(() => parseWidgetConfig(state.originalMarkdown), [state.originalMarkdown]);

  const setFocus = React.useCallback((focused: boolean) => {
    setState((prev) => (prev.hasFocus === focused ? prev : { ...prev, hasFocus: focused }));
  }, []);

  const enterEditMode = React.useCallback(() => {
    view.dispatch({
      effects: toggleWidgetEdit.of({ sectionId, editing: true }),
    });
  }, [sectionId, view]);

  const exitEditMode = React.useCallback((save: boolean) => {
    if (save) {
      // In main editor mode, the changes are already in the document,
      // so we just need to exit edit mode.
      view.dispatch({
        effects: toggleWidgetEdit.of({ sectionId, editing: false }),
      });
      return;
    }

    // Cancel: we'd need to undo the changes. For now, just exit.
    view.dispatch({
      effects: toggleWidgetEdit.of({ sectionId, editing: false }),
    });
  }, [sectionId, view]);

  const onSave = React.useCallback(() => {
    exitEditMode(true);
  }, [exitEditMode]);

  const onBlur = React.useCallback(() => {
    const result = saveWidgetSource(view, sectionId, state.currentMarkdown);
    if (!result?.ok) {
      setState((prev) => ({
        ...prev,
        isEditing: true,
        isDirty: prev.currentMarkdown !== prev.originalMarkdown,
        error: result?.message ?? "Unable to save widget source.",
      }));
      return;
    }

    const savedMarkdown = stripEditorTrailingNewline(normalizeWidgetMarkdown(state.currentMarkdown));
    setState((prev) => ({
      ...prev,
      isEditing: false,
      isDirty: false,
      error: null,
      originalMarkdown: savedMarkdown,
      currentMarkdown: savedMarkdown,
    }));
  }, [sectionId, state.currentMarkdown, view]);

  const onUndo = React.useCallback(() => {
    exitEditMode(false);
  }, [exitEditMode]);

  const handleMarkdownChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextMarkdown = event.target.value;
    setState((prev) => {
      const nextValidation = prev.error ? parseWidgetConfig(nextMarkdown) : null;
      return {
        ...prev,
        currentMarkdown: nextMarkdown,
        isDirty: nextMarkdown !== prev.originalMarkdown,
        error: nextValidation?.ok === false ? nextValidation.message : nextValidation?.ok ? null : prev.error,
      };
    });
  }, []);

  const handleBlurCapture = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && containerRef.current?.contains(relatedTarget)) {
      return;
    }

    setFocus(false);

    if (state.isEditing) {
      onBlur();
    }
  }, [onBlur, setFocus, state.isEditing]);

  const handleTextareaBlur = React.useCallback(() => {
    // Direct blur handler for the textarea so auto-save works reliably
    // in test environments where capture-phase blur may not propagate.
    setFocus(false);
    if (state.isEditing) {
      onBlur();
    }
  }, [onBlur, setFocus, state.isEditing]);

  const handlePreviewKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (event.key === "Enter" && !state.isEditing) {
      event.preventDefault();
      enterEditMode();
    }
  }, [enterEditMode, state.isEditing]);

  React.useEffect(() => {
    const el = previewSurfaceRef.current;
    if (!el) return;
    el.addEventListener("keydown", handlePreviewKeyDown);
    return () => el.removeEventListener("keydown", handlePreviewKeyDown);
  }, [handlePreviewKeyDown]);

  const handleTextareaKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onUndo();
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSave();
    }
  }, [onSave, onUndo]);

  const buttonMode = state.error ? "error" : isEditingInMain ? "editing" : "view";
  const iconVisible = state.hasFocus || isEditingInMain || state.error !== null;

  let previewNode: React.ReactNode;
  if (!previewComponent) {
    previewNode = renderMissingWidget(widgetName);
  } else if (!previewParse.ok) {
    previewNode = renderInvalidWidget(widgetName, previewParse.message);
  } else {
    previewNode = React.createElement(previewComponent, {
      config: previewParse.config,
      rawContent: state.originalMarkdown,
      sectionId,
    });
  }

  return (
    <div
      ref={containerRef}
      data-widget-section-id={sectionId}
      data-widget-mode={buttonMode}
      className={cn(
        "group relative rounded-2xl border border-transparent bg-background/95 p-3 transition-colors duration-200 ease-out hover:border-border",
        state.isEditing && state.error === null && "border-emerald-500/40 ring-1 ring-emerald-500/15",
        state.error !== null && "border-destructive/40 ring-1 ring-destructive/15",
      )}
      onMouseDownCapture={(event) => {
        if (!state.isEditing) {
          event.preventDefault();
        }
      }}
      onFocusCapture={() => setFocus(true)}
      onBlurCapture={handleBlurCapture}
      onKeyDownCapture={handlePreviewKeyDown}
    >
      <WidgetEditButton
        mode={buttonMode}
        enterEditMode={enterEditMode}
        onSave={onSave}
        onUndo={onUndo}
        className={cn(
          "z-10 focus-visible:opacity-100 focus-visible:scale-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:scale-100",
          iconVisible
            ? "pointer-events-auto opacity-100 scale-100"
            : "pointer-events-none opacity-0 scale-95 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100",
        )}
      />

      <div ref={previewSurfaceRef} data-testid="widget-preview-surface" tabIndex={0} onKeyDown={handlePreviewKeyDown as any}>{previewNode}</div>
    </div>
  );
}

/** Small widget that only renders the Save/Undo buttons while a widget is in raw edit mode */
class FloatingEditControls extends WidgetType {
  constructor(
    readonly sectionId: string,
  ) {
    super();
  }

  eq(other: FloatingEditControls): boolean {
    return this.sectionId === other.sectionId;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "relative h-0 w-full"; // Zero height, button absolute right

    const root = createRoot(wrapper);
    root.render(
      <div className="absolute right-0 top-1 z-50">
        <WidgetEditButton
          mode="editing"
          enterEditMode={() => {}}
          onSave={() => {
            view.dispatch({
              effects: toggleWidgetEdit.of({ sectionId: this.sectionId, editing: false }),
            });
          }}
          onUndo={() => {
            view.dispatch({
              effects: toggleWidgetEdit.of({ sectionId: this.sectionId, editing: false }),
            });
          }}
        />
      </div>
    );

    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

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

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-widget-block-preview";
    wrapper.style.cssText =
      "display:block; width:100%; min-height:1.5em; outline:none;";

    this.root = createRoot(wrapper) as Root;
    this.root.render(
      React.createElement(WidgetBlockPreviewWrapper, {
        widgetName: this.widgetName,
        rawContent: this.rawContent,
        sectionId: this.sectionId,
        registry: this.registry,
        view,
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
  const editingIds = state.field(editingWidgetsField);
  const decos: Range<Decoration>[] = [];
  const cursorHead = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "widget" || !section.widgetName) continue;

    const doc = state.doc;
    if (section.startLine > doc.lines || section.endLine > doc.lines) continue;

    const isEditing = editingIds.has(section.id);

    // If editing, don't replace the block — just add a floating save button
    if (isEditing) {
      decos.push(
        Decoration.widget({
          widget: new FloatingEditControls(section.id),
          side: 1,
          block: false,
        }).range(section.from)
      );
      continue;
    }

    // Extract raw content between the fences
    const rawContent =
      section.contentFrom != null && section.contentTo != null
        ? doc.sliceString(section.contentFrom, section.contentTo)
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

function skipWidgetDown(view: EditorView): boolean {
  const { head } = view.state.selection.main;
  const currentLine = view.state.doc.lineAt(head);
  const nextLineNumber = currentLine.number + 1;
  if (nextLineNumber > view.state.doc.lines) return false;

  const { sections } = view.state.field(sectionField);
  const editingIds = view.state.field(editingWidgetsField);

  let targetLineNumber = nextLineNumber;
  let targetLine = view.state.doc.line(targetLineNumber);
  
  while (targetLineNumber <= view.state.doc.lines) {
    const widget = widgetSectionAtLine(sections, targetLine);
    // If it's a widget and NOT in edit mode, skip it
    if (widget && !editingIds.has(widget.id)) {
      targetLineNumber = widget.endLine + 1;
      if (targetLineNumber > view.state.doc.lines) break;
      targetLine = view.state.doc.line(targetLineNumber);
    } else {
      // Found a valid destination (non-widget or editing-widget)
      moveToLinePreservingColumn(view, targetLine);
      return true;
    }
  }

  return false;
}

function skipWidgetUp(view: EditorView): boolean {
  const { head } = view.state.selection.main;
  const currentLine = view.state.doc.lineAt(head);
  const previousLineNumber = currentLine.number - 1;
  if (previousLineNumber < 1) return false;

  const { sections } = view.state.field(sectionField);
  const editingIds = view.state.field(editingWidgetsField);

  let targetLineNumber = previousLineNumber;
  let targetLine = view.state.doc.line(targetLineNumber);

  while (targetLineNumber >= 1) {
    const widget = widgetSectionAtLine(sections, targetLine);
    // If it's a widget and NOT in edit mode, skip it
    if (widget && !editingIds.has(widget.id)) {
      targetLineNumber = widget.startLine - 1;
      if (targetLineNumber < 1) break;
      targetLine = view.state.doc.line(targetLineNumber);
    } else {
      // Found a valid destination
      moveToLinePreservingColumn(view, targetLine);
      return true;
    }
  }

  return false;
}

const widgetNavKeymap = Prec.high(keymap.of([
  { key: "ArrowDown", run: skipWidgetDown },
  { key: "ArrowUp", run: skipWidgetUp },
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
      // Only rebuild decorations if:
      // 1. The document changed (content/structure update)
      // 2. An edit-toggle effect was dispatched
      const hasToggle = tr.effects.some(e => e.is(toggleWidgetEdit));
      
      if (tr.docChanged || hasToggle) {
        return buildWidgetDecos(tr.state, registry);
      }
      return value;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [widgetPreviewField, editingWidgetsField, widgetNavKeymap];
}
