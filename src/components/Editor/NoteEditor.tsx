/**
 * NoteEditor
 * 
 * Single-instance CodeMirror 6 editor for the entire document.
 * Replaces the fragmented SectionEditor approach with a cohesive
 * editing experience where blocks are rendered as previews when
 * unfocused and transition to raw source on focus.
 * 
 * Per ADR: "Standardize the editor on a single CodeMirror 6 instance
 * for the entire document content."
 * 
 * Per PRD: "Eliminate Disjointedness — Transition from a multi-component
 * SectionEditor to a single, highly-extensible CodeMirror 6 instance."
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { EditorState, Extension, StateEffect } from "@codemirror/state";
import {
  EditorView,
  keymap,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  highlightSpecialChars,
  lineNumbers,
  highlightActiveLineGutter,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { markdown } from "@codemirror/lang-markdown";

import { whiteboardScriptLanguage } from "@/hooks/useRuntimeParser";
import { editorTheme } from "./extensions/theme";
import { smartIncrement } from "./extensions/smart-increment";

// Note editor extensions
import { sectionField, SectionState, activeCursorSection, type EditorSection } from "./extensions/section-state";
import { previewDecorations } from "./extensions/preview-decorations";
import { embedPreviewDecorations } from "./extensions/embed-preview";
import { frontmatterPreview } from "./extensions/frontmatter-preview";
import { markdownTablePreview } from "./extensions/markdown-tables";
import { markdownSyntaxHiding } from "./extensions/markdown-syntax-hiding";
import { wodLinter } from "./extensions/wod-linter";
import { wodAutocompletion, wodEditorKeymap } from "./extensions/wod-autocomplete";
import { wodOverlayPanel } from "./extensions/wod-overlay";
import { widgetBlockPreview } from "./extensions/widget-block-preview";
import { inlineButtonDecoration, type ButtonAction } from "./extensions/inline-button-decoration";
import { sectionGeometry } from "./extensions/section-geometry";
import { linkOpen } from "./extensions/link-open";
import { gutterUnified } from "./extensions/gutter-unified";
import { cursorFocusExtension, getCursorFocusState } from "./extensions/cursor-focus-panel";
import { lineIdsExtension } from "./extensions/line-ids";

/** File drop handler extension */
const fileDropHandler = (noteId: string | undefined) => EditorView.domEventHandlers({
  drop: (event, view) => {
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return false;

    // Prevent default drop behavior
    event.preventDefault();

    // Get drop position
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return false;

    Array.from(files).forEach(async (file) => {
      const id = uuidv4();
      const reader = new FileReader();

      reader.onload = async () => {
        const data = reader.result as ArrayBuffer;
        
        // Save to storage
        await indexedDBService.saveAttachment({
          id,
          noteId: noteId || 'current',
          label: file.name,
          mimeType: file.type,
          data,
          createdAt: Date.now(),
          timeSpan: { start: Date.now(), end: Date.now() }
        });

        // Insert markdown link
        const isImage = file.type.startsWith('image/');
        const prefix = isImage ? '!' : '';
        const markdown = `\n${prefix}[${file.name}](${id})\n`;

        view.dispatch({
          changes: { from: pos, insert: markdown },
          selection: { anchor: pos + markdown.length }
        });
      };

      reader.readAsArrayBuffer(file);
    });

    return true;
  }
});

import {
  wodResultsWidget,
  wodResultsField,
  updateSectionResults,
  WOD_RESULT_CLICK_EVENT,
  type WodResultClickDetail,
} from "./extensions/wod-results-widget";
import { OverlayTrack } from "./overlays/OverlayTrack";
import { useOverlayWidthState } from "./overlays/useOverlayWidthState";
import type { OverlaySlotProps } from "./overlays/OverlayTrack";
import { FrontmatterCompanion } from "./overlays/FrontmatterCompanion";
import { WodCompanion } from "./overlays/WodCompanion";
import { WidgetCompanion } from "./overlays/WidgetCompanion";
import type { WidgetRegistry } from "./overlays/WidgetCompanion";
import type { WodCommand } from "./overlays/WodCommand";
import { FullscreenTimer } from "./overlays/FullscreenTimer";
import { FullscreenReview } from "./overlays/FullscreenReview";
import { InlineCommandBar } from "./overlays/InlineCommandBar";
import { EditorCastBridge } from "./overlays/EditorCastBridge";
import type { Segment } from "@/core/models/AnalyticsModels";
import { indexedDBService } from "@/hooks/useBrowserServices";
import { getAnalyticsFromLogs } from "@/hooks/useWorkbenchServices";
import { v4 as uuidv4 } from "uuid";
import type { WorkoutResult } from "@/types/storage";

import { themeCompartment, languageCompartment, modeCompartment } from "./compartments";

import type { WodBlock } from "./types";
import { useCommandPalette } from "../command-palette/CommandContext";
import { Play, Plus, ExternalLink, Copy, Check } from "lucide-react";
import { buildPlaygroundUrl } from "./md-components/WodPlaygroundButton";

export interface NoteEditorProps {
  /** Note ID for result lookup */
  noteId?: string;
  /** Document content */
  value: string;
  /** Called on every document change */
  onChange: (value: string) => void;
  /** Called when cursor position changes */
  onCursorPositionChange?: (line: number, column: number) => void;
  /** Called when the editor loses focus */
  onBlur?: () => void;
  /** Editor theme ("vs" | "dark") */
  theme?: string;
  /** Read-only mode */
  readonly?: boolean;
  /** CSS class name */
  className?: string;
  /** Called when user triggers "Run" on a Whiteboard Script block */
  onStartWorkout?: (block: WodBlock) => void;
  /** Called when a workout is completed with the results */
  onCompleteWorkout?: (blockId: string, results: WodBlock["results"]) => void;
  /** Called when Whiteboard Script blocks change */
  onBlocksChange?: (blocks: WodBlock[]) => void;
  /** Called when user triggers "Add to Plan" on a Whiteboard Script block */
  onAddToPlan?: (block: WodBlock) => void;
  /** Called when user wants to review a specific result (for custom routing/popups) */
  onOpenReview?: (result: WorkoutResult) => void;
  /** In-memory results fallback (for non-persistent sessions) */
  extendedResults?: WorkoutResult[];
  /** Exposed EditorView ref */
  onViewCreated?: (view: EditorView) => void;
  /** Editor mode */
  mode?: "edit" | "track" | "data";
  /** Enable line wrapping */
  lineWrapping?: boolean;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Enable block-level preview (default: true) */
  enablePreview?: boolean;
  /** Enable Whiteboard Script linting (default: true) */
  enableLinting?: boolean;
  /** Enable overlay panel (default: true) */
  enableOverlay?: boolean;
  /**
   * Command buttons shown on Whiteboard Script block overlays.
   * When provided, replaces the individual onStartWorkout / onAddToPlan callbacks
   * (those are still accepted for backward compatibility when commands is omitted).
   */
  hideDefaultCommands?: boolean;
  commands?: WodCommand[];
  /**
   * When true (default), clicking "Run" opens an inline runtime panel below
   * the WOD block instead of calling onStartWorkout / navigating to the track
   * route.  Set to false to restore the previous route-based behaviour.
   */
  enableInlineRuntime?: boolean;
  /**
   * Registry of custom widget components rendered inside ```widget:<name> blocks.
   * Keys are widget names (e.g. "hero"), values are React components.
   * Each registered widget replaces the fenced block with a full-width React component.
   */
  widgetComponents?: WidgetRegistry;
  /**
   * Called when an inline button `[Label]{.button ...}` is activated.
   * Receives the action name and a key-value param bag.
   * - route action:    onButtonAction("route", { route: "/tracker" })
   * - named action:    onButtonAction("start-workout", {})
   * - emit action:     onButtonAction("emit", { name: "my-event" })
   */
  onButtonAction?: ButtonAction;
  /** ID of section to scroll into view (matches IDs from lineIdsExtension) */
  scrollToSectionId?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  noteId,
  value,
  onChange,
  onCursorPositionChange,
  onBlur,
  theme = "vs",
  readonly = false,
  className = "",
  onStartWorkout,
  onCompleteWorkout,
  onBlocksChange,
  onAddToPlan,
  onOpenReview,
  extendedResults,
  onViewCreated,
  mode = "edit",
  lineWrapping: initialLineWrapping = true,
  showLineNumbers: showLineNums = true,
  enablePreview = true,
  enableLinting = true,
  enableOverlay = false,
  commands,
  hideDefaultCommands = false,
  enableInlineRuntime = true,
  widgetComponents,
  onButtonAction,
  scrollToSectionId,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { setIsOpen } = useCommandPalette();
  const isDark = theme === "dark" || theme === "vs-dark";

  // Overlay track state
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [cursorLine, setCursorLine] = useState(1);
  const overlayState = useOverlayWidthState(sections, activeSectionId);

  // Full-screen timer block: when set, the FullscreenTimer overlay is shown.
  const [fullscreenTimerBlock, setFullscreenTimerBlock] = useState<WodBlock | null>(null);

  // Full-screen review segments: when set, the FullscreenReview overlay is shown.
  const [fullscreenReviewSegments, setFullscreenReviewSegments] = useState<Segment[] | null>(null);

  // Whether the fullscreen timer should auto-start on mount
  const [autoStartFullscreen, setAutoStartFullscreen] = useState(false);

  // Toggle the full-screen timer for the given WOD block (Run button).
  const handleRun = useCallback((block: WodBlock, autoStart = false) => {
    setAutoStartFullscreen(autoStart);
    setFullscreenTimerBlock(block);
  }, []);

  // Close the full-screen timer.
  const handleTimerClose = useCallback(() => {
    setFullscreenTimerBlock(null);
    setAutoStartFullscreen(false);
  }, []);

  // Intercept selection from Chromecast to start the inline runtime with auto-start.
  const handleCastSelectBlock = useCallback((block: WodBlock) => {
    if (enableInlineRuntime) {
      handleRun(block, true);
    }
  }, [enableInlineRuntime, handleRun]);

  // Intercept workout completion: immediately push the new result into the CM6
  // wodResultsField so the inline results bar updates without waiting for a DB
  // round-trip, then forward to the parent's onCompleteWorkout callback.
  const handleCompleteWorkout = useCallback(
    (blockId: string, results: WodBlock["results"]) => {
      if (results && viewRef.current) {
        const view = viewRef.current;
        const now = results.endTime || Date.now();
        const newResult = {
          id: uuidv4(),
          noteId: noteId ?? "",
          sectionId: blockId,
          segmentId: blockId,
          data: results,
          completedAt: now,
        };

        // Read existing results for this section and prepend the new one
        // (most-recent first) before dispatching.
        const existingMap = view.state.field(wodResultsField);
        const prev = existingMap.get(blockId) ?? [];
        view.dispatch({
          effects: [
            updateSectionResults.of({
              sectionId: blockId,
              results: [newResult, ...prev],
            }),
          ],
        });
      }
      onCompleteWorkout?.(blockId, results);
    },
    [noteId, onCompleteWorkout],
  );

  // Open the full-screen review.
  const handleOpenReview = useCallback((segments: Segment[]) => {
    setFullscreenReviewSegments(segments);
  }, []);

  // Close the full-screen review.
  const handleReviewClose = useCallback(() => {
    setFullscreenReviewSegments(null);
  }, []);

  // Fetch workout results for all WOD sections and push them into the editor
  // via the wodResultsField StateEffect so the inline results bar is visible.
  useEffect(() => {
    if (!viewRef.current) return;
    const wodSections = sections.filter((s) => s.type === "wod");
    if (wodSections.length === 0) return;

    for (const section of wodSections) {
      // 1. Priority: In-memory results from props (Static/Lesson Mode)
      if (Array.isArray(extendedResults)) {
        const matches = extendedResults
          .filter(r => r.sectionId === section.id || r.segmentId === section.id)
          .sort((a, b) => b.completedAt - a.completedAt);
        
        viewRef.current.dispatch({
          effects: [updateSectionResults.of({ sectionId: section.id, results: matches })],
        });
        continue;
      }

      // 2. Fallback: Persistent storage (History/App Mode)
      indexedDBService
        .getResultsForSection(noteId ?? "", section.id)
        .then((results) => {
          const view = viewRef.current;
          if (!view || !view.dom.isConnected) return;
          const sorted = results.sort((a, b) => b.completedAt - a.completedAt);
          view.dispatch({
            effects: [
              updateSectionResults.of({ sectionId: section.id, results: sorted }),
            ],
          });
        })
        .catch(() => {
          // IndexedDB unavailable (e.g. Storybook) – silently ignore
        });
    }
  }, [noteId, sections, extendedResults]);

  // Listen for result pill clicks fired by the CM6 widget and open the
  // full-screen review overlay if the result has detailed logs.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const handleResultClick = (e: Event) => {
      const { result } = (e as CustomEvent<WodResultClickDetail>).detail;
      
      // If parent provided an onOpenReview handler, use it first
      if (onOpenReview) {
        onOpenReview(result);
        return;
      }

      // Default behavior: show inline FullscreenReview overlay if logs exist
      if (result?.data?.logs && result.data.logs.length > 0) {
        const { segments } = getAnalyticsFromLogs(
          result.data.logs as any,
          result.data.startTime,
        );
        handleOpenReview(segments);
      }
    };

    el.addEventListener(WOD_RESULT_CLICK_EVENT, handleResultClick);
    return () => el.removeEventListener(WOD_RESULT_CLICK_EVENT, handleResultClick);
  }, [handleOpenReview, onOpenReview]);

  // Build effective command list: use explicit commands if provided, otherwise
  // synthesize from legacy onStartWorkout / onAddToPlan for backward compat.
  // When enableInlineRuntime is true the "Run" command uses handleRun
  // instead of routing via onStartWorkout.
  const effectiveCommands = useMemo<WodCommand[]>(() => {
    if (hideDefaultCommands) return [];
    if (commands && commands.length > 0) return commands;
    const synthesized: WodCommand[] = [];
    if (enableInlineRuntime) {
      // Full-screen run: open FullscreenTimer panel
      synthesized.push({
        id: "run",
        label: "Run",
        icon: <Play className="h-3 w-3 fill-current" />,
        primary: true,
        onClick: handleRun,
      });
    } else if (onStartWorkout) {
      synthesized.push({
        id: "run",
        label: "Run",
        icon: <Play className="h-3 w-3 fill-current" />,
        primary: true,
        onClick: onStartWorkout,
      });
    }

    // Secondary group: Playground (first), Results, Plan
    synthesized.push({
      id: "playground",
      label: "Playground",
      icon: <ExternalLink className="h-3 w-3" />,
      splitIcon: <Copy className="h-3 w-3" />,
      splitSuccessIcon: <Check className="h-3 w-3" />,
      onClick: (block) => {
        buildPlaygroundUrl(block.content).then((url) => {
          window.open(url, "_blank", "noopener,noreferrer");
        });
      },
      onSplitClick: async (block) => {
        const url = await buildPlaygroundUrl(block.content);
        await navigator.clipboard.writeText(url);
      },
    });

    if (onAddToPlan) {
      synthesized.push({
        id: "plan",
        label: "Plan",
        icon: <Plus className="h-3 w-3" />,
        onClick: onAddToPlan,
      });
    }

    return synthesized;
  }, [commands, onStartWorkout, onAddToPlan, enableInlineRuntime, handleRun]);

  // Mixed language: Markdown + embedded Whiteboard Script in code fences
  const languages = useMemo(() => {
    return markdown({
      codeLanguages: (info) => {
        if (info === "wod" || info === "log" || info === "plan")
          return whiteboardScriptLanguage;
        return null;
      },
    });
  }, []);

  const baseExtensions = useMemo(
    () => [
      // Core editing
      ...(showLineNums ? [lineNumbers(), highlightActiveLineGutter()] : []),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      ...(initialLineWrapping ? [EditorView.lineWrapping] : []),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      highlightSelectionMatches(),

      // Keybindings
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
        {
          key: "Mod-p",
          run: () => {
            setIsOpen(true);
            return true;
          },
        },
        {
          // Ctrl+. — open command palette when cursor is on a text metric
          // (Effort / Action). Falls through for numeric metrics so the OS
          // or default binding can handle it.
          key: "Ctrl-.",
          run: (view) => {
            const focus = getCursorFocusState(view.state);
            if (!focus?.focusedMetric) return false;
            const type = focus.focusedMetric.type as string;
            // Only intercept for non-numeric (label) metrics
            const numeric = new Set(["duration", "rep", "rounds", "distance", "resistance"]);
            if (numeric.has(type)) return false;
            setIsOpen(true);
            return true;
          },
        },
      ]),

      // Existing extensions
      smartIncrement,

      // ---- Note Editor Extensions ----

      // Section tracking (required by all other unified extensions)
      sectionField,

      // Block-level preview decorations
      ...(enablePreview ? [
        previewDecorations,
        embedPreviewDecorations,
        frontmatterPreview,
        markdownTablePreview,
        markdownSyntaxHiding(),
      ] : []),

      // Whiteboard Script linting (no separate lintGutter — unified gutter handles it)
      ...(enableLinting ? [wodLinter] : []),

      // Autocomplete (dialect + embed completions)
      wodAutocompletion,
      wodEditorKeymap,

      // Overlay panel for Whiteboard Script blocks
      ...(enableOverlay ? [wodOverlayPanel] : []),

      // Section geometry measurement (for overlay track)
      sectionGeometry,

      // Ctrl+Click link opening
      linkOpen,

      // Inline metric hover tooltip

      // Cursor focus: mark decorations + focus state for MetricInlinePanel
      cursorFocusExtension,

      // Unified gutter: lint diagnostics + runtime highlights in one column
      ...gutterUnified,

      // Line IDs for external navigation (IntersectionObserver, scroll)
      lineIdsExtension,

      // Results bar widgets — shown after each WOD block's closing fence
      ...wodResultsWidget,

      // Full-row widget block replacements (```widget:<name>``` sections)
      ...(widgetComponents && widgetComponents.size > 0
        ? [widgetBlockPreview(widgetComponents)]
        : []),

      // Inline button decorations ([Label]{.button action=...})
      ...(onButtonAction ? [inlineButtonDecoration(onButtonAction)] : []),

      // File drop handler
      fileDropHandler(noteId),

      // Blur handler — fires when the editor loses focus
      EditorView.domEventHandlers({
        blur: () => { onBlur?.(); return false; },
      }),

      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
          notifyBlockChanges(update.state, onBlocksChange);
        }
        if (update.selectionSet || update.docChanged) {
          const { head } = update.state.selection.main;
          const line = update.state.doc.lineAt(head);
          onCursorPositionChange?.(line.number, head - line.from + 1);

          // Update overlay track state
          const cursorSec = activeCursorSection(update.state);
          setActiveSectionId(cursorSec?.id ?? null);
          setCursorLine(line.number);
          const { sections: secs } = update.state.field(sectionField);
          setSections(secs);
        }
      }),

      // Read-only state
      EditorState.readOnly.of(readonly),
    ],
    [
      onChange,
      onCursorPositionChange,
      onBlur,
      onBlocksChange,
      readonly,
      setIsOpen,
      showLineNums,
      initialLineWrapping,
      enablePreview,
      enableLinting,
      enableOverlay,
      noteId,
      widgetComponents,
      onButtonAction,
    ]
  );

  // Create editor on mount
  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...baseExtensions,
        themeCompartment.of(editorTheme(isDark)),
        languageCompartment.of(languages),
        modeCompartment.of([]),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    onViewCreated?.(view);

    // Seed overlay state from initial editor state so panels render
    // immediately without requiring a cursor move or click.
    const { sections: initialSections } = view.state.field(sectionField);
    setSections(initialSections);
    const initialLine = view.state.doc.lineAt(
      view.state.selection.main.head
    ).number;
    setCursorLine(initialLine);
    const initialSection = activeCursorSection(view.state);
    setActiveSectionId(initialSection?.id ?? null);

    // Seed block list so onBlocksChange fires on initial mount (not just on edits)
    notifyBlockChanges(view.state, onBlocksChange);

    return () => {
      view.destroy();
    };
  }, []); // Mount only

  // Sync external value changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // Sync theme
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.reconfigure(editorTheme(isDark)),
      });
    }
  }, [isDark]);

  // Sync mode and extensions
  useEffect(() => {
    if (viewRef.current) {
      const modeExtensions: Extension = mode === "track" ? [] : [];
      viewRef.current.dispatch({
        effects: [
          StateEffect.reconfigure.of([
            ...baseExtensions,
            themeCompartment.of(editorTheme(isDark)),
            languageCompartment.of(languages),
            modeCompartment.of(modeExtensions),
          ]),
        ],
      });
    }
  }, [baseExtensions, mode, isDark, languages]);

  // Handle external scroll requests
  useEffect(() => {
    if (scrollToSectionId && viewRef.current) {
      const view = viewRef.current;
      const content = view.state.doc.toString();
      const lines = content.split("\n");
      
      let lineIdx = -1;

      // Matches logic in line-ids.ts and extractPageIndex (App.tsx)
      if (scrollToSectionId.startsWith("wod-line-")) {
        const lineNum = parseInt(scrollToSectionId.replace("wod-line-", ""), 10);
        lineIdx = lineNum - 1;
      } else {
        lineIdx = lines.findIndex((line) => {
          const match = line.match(/^(#{1,6})\s+(.*)$/);
          if (match) {
            let label = match[2].trim();
            const timeMatch = label.match(/(\d{1,2}:\d{2})/);
            if (timeMatch) {
              const timestamp = timeMatch[1];
              label = label.replace(timestamp, "").replace(/\s+/g, " ").trim();
              if (!label) label = timestamp;
            }
            const headerId = label.toLowerCase().replace(/[^\w]+/g, "-");
            return headerId === scrollToSectionId;
          }
          return false;
        });
      }

      if (lineIdx >= 0 && lineIdx < lines.length) {
        const pos = view.state.doc.line(lineIdx + 1).from;
        view.dispatch({
          selection: { anchor: pos, head: pos },
          effects: [EditorView.scrollIntoView(pos, { y: "start", yMargin: 20 })],
        });
      }
    }
  }, [scrollToSectionId]);

  // Slot renderer — routes to companion components by section type
  const renderSlot = (props: OverlaySlotProps) => {
    if (props.sectionType === "wod") {
      return (
        <WodCompanion
          noteId={noteId}
          sectionId={props.sectionId}
          view={props.view}
          isActive={props.isActive}
          widthPercent={props.widthPercent}
          cursorLine={cursorLine}
          docVersion={props.docVersion}
          commands={effectiveCommands}
          extendedResults={extendedResults}
          onOpenReview={handleOpenReview}
          hoverLine={props.hoverLine}
          stickyTopOffset={props.stickyTopOffset}
          isPanelHovered={props.isPanelHovered}
          lineDocY={props.lineDocY}
          rect={props.rect}
        />
      );
    }

    if (props.sectionType === "frontmatter" || props.sectionType === "embed") {
      const { sections } = props.view.state.field(sectionField);
      const section = sections.find(s => s.id === props.sectionId);
      return (
        <FrontmatterCompanion
          sectionId={props.sectionId}
          section={section}
          view={props.view}
          isActive={props.isActive}
          widthPercent={props.widthPercent}
          docVersion={props.docVersion}
        />
      );
    }
    if (props.sectionType === "widget" && props.widgetName) {
      return (
        <WidgetCompanion
          sectionId={props.sectionId}
          widgetName={props.widgetName}
          view={props.view}
          registry={widgetComponents ?? new Map()}
        />
      );
    }
    // Default placeholder for other section types
    return (
      <div className="h-full w-full bg-popover/80 backdrop-blur-sm border-l border-border rounded-l-md p-2 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">{props.sectionType}</div>
      </div>
    );
  };

  return (
    <div
      ref={editorRef}
      className={`cm-note-editor relative w-full min-w-0 ${className}`}
    >
      {enableOverlay && (
        <OverlayTrack
          view={viewRef.current}
          widths={overlayState.widths}
          activeSectionId={activeSectionId}
          renderSlot={renderSlot}
          cursorLine={cursorLine}
        />
      )}
      {!enableOverlay && effectiveCommands.length > 0 && (
        <InlineCommandBar
          view={viewRef.current}
          commands={effectiveCommands}
        />
      )}
      {fullscreenTimerBlock && viewRef.current && (
        <FullscreenTimer
          block={fullscreenTimerBlock}
          view={viewRef.current}
          onClose={handleTimerClose}
          onCompleteWorkout={handleCompleteWorkout}
          autoStart={autoStartFullscreen}
        />
      )}

      {fullscreenReviewSegments && (
        <FullscreenReview
          segments={fullscreenReviewSegments}
          onClose={handleReviewClose}
        />
      )}

      <EditorCastBridge
        sections={sections}
        isRuntimeActive={fullscreenTimerBlock !== null}
        editorState={viewRef.current?.state ?? null}
        onSelectBlock={handleCastSelectBlock}
      />

    </div>
  );
};

// ---------- Helpers ----------

/** Convert an EditorSection to a WodBlock for callback compatibility */
function sectionToWodBlock(section: EditorSection, state: EditorState): WodBlock | null {
  if (section.type !== "wod") return null;

  const content =
    section.contentFrom !== undefined && section.contentTo !== undefined
      ? state.doc.sliceString(section.contentFrom, section.contentTo)
      : "";

  return {
    id: section.id,
    dialect: section.dialect || "wod",
    startLine: section.startLine - 1, // Convert to 0-indexed for WodBlock compat
    endLine: section.endLine - 1,
    content,
    state: "idle",
    version: 1,
    createdAt: Date.now(),
    widgetIds: {},
  };
}

/** Notify parent of block changes by extracting WodBlocks from section state */
let lastBlocksJson = "";
function notifyBlockChanges(
  state: EditorState,
  onBlocksChange?: (blocks: WodBlock[]) => void
) {
  if (!onBlocksChange) return;

  const sectionState: SectionState = state.field(sectionField);
  const blocks = sectionState.sections
    .filter((s) => s.type === "wod")
    .map((s) => sectionToWodBlock(s, state))
    .filter((b): b is WodBlock => b !== null);

  const blocksJson = JSON.stringify(
    blocks.map((b) => ({ id: b.id, startLine: b.startLine, endLine: b.endLine }))
  );

  if (blocksJson !== lastBlocksJson) {
    lastBlocksJson = blocksJson;
    onBlocksChange(blocks);
  }
}
