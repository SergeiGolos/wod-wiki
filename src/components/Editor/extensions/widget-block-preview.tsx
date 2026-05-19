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
// @ts-expect-error — react-dom flushSync subpath types don't resolve under moduleResolution:bundler (baseline issue)
import { flushSync } from "react-dom";
type Root = { render: (c: React.ReactNode) => void; unmount: () => void };
import React from "react";

import { cn } from "@/lib/utils";

import { sectionField } from "./section-state";
import type { EditorSection } from "./section-state";
import type { WidgetConfig, WidgetRegistry, WidgetProps } from "../widgets/types";
import { WidgetEditButton } from "./WidgetEditButton";
import { EditableMarkdown } from "./EditableMarkdown";
import { ErrorInlay } from "./ErrorInlay";

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
    flushSync(() => {
      setState((prev) => ({
        ...prev,
        isEditing: true,
        error: null,
        hasFocus: true,
        currentMarkdown: prev.originalMarkdown,
        isDirty: false,
      }));
    });
  }, []);

  const exitEditMode = React.useCallback((save: boolean) => {
    if (save) {
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
      return;
    }

    setState((prev) => ({
      ...prev,
      isEditing: false,
      isDirty: false,
      error: null,
      currentMarkdown: prev.originalMarkdown,
    }));
  }, [sectionId, state.currentMarkdown, view]);

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

  const buttonMode = state.error ? "error" : state.isEditing ? "editing" : "view";
  const iconVisible = state.hasFocus || state.isEditing || state.error !== null;

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

      {state.isEditing ? (
        <div>
          <EditableMarkdown
            ref={textareaRef}
            value={state.currentMarkdown}
            hasError={state.error !== null}
            aria-label={`Edit widget ${widgetName} markdown`}
            data-testid="widget-markdown-editor"
            onChange={handleMarkdownChange}
            onBlur={handleTextareaBlur}
            onKeyDown={handleTextareaKeyDown}
          />
          {state.error ? <ErrorInlay message={state.error} /> : null}
        </div>
      ) : (
        <div ref={previewSurfaceRef} data-testid="widget-preview-surface" tabIndex={0} onKeyDown={handlePreviewKeyDown as any}>{previewNode}</div>
      )}
    </div>
  );
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
  const decos: Range<Decoration>[] = [];
  const cursorHead = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "widget" || !section.widgetName) continue;

    const doc = state.doc;
    if (section.startLine > doc.lines || section.endLine > doc.lines) continue;

    // Don't replace when cursor is inside the widget range (allows source editing)
    if (cursorHead >= section.from && cursorHead <= section.to) continue;

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
