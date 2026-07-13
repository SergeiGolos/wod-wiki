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
import { indentOnInput } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { markdown } from "@codemirror/lang-markdown";

import { editorTheme } from "@/components/Editor/extensions/theme";
import { smartIncrement } from "@/components/Editor/extensions/smart-increment";

// Note editor extensions
import { sectionField, SectionState, activeCursorSection, type EditorSection } from "@/components/Editor/extensions/section-state";
import { previewDecorations } from "@/components/Editor/extensions/preview-decorations";
import { embedPreviewDecorations } from "@/components/Editor/extensions/embed-preview";
import { frontmatterPreview } from "@/components/Editor/extensions/frontmatter-preview";
import { markdownTablePreview } from "@/components/Editor/extensions/markdown-tables";
import { markdownSyntaxHiding } from "@/components/Editor/extensions/markdown-syntax-hiding";
import { wodLinter } from "@/components/Editor/extensions/whiteboard-linter";
import { wodAutocompletion, wodEditorKeymap } from "@/components/Editor/extensions/whiteboard-autocomplete";
import { wodOverlayPanel } from "@/components/Editor/extensions/whiteboard-overlay";
import { widgetBlockPreview } from "@/components/Editor/extensions/widget-block-preview";
import { inlineButtonDecoration, type ButtonAction } from "@/components/Editor/extensions/inline-button-decoration";
import { sectionGeometry } from "@/components/Editor/extensions/section-geometry";
import { linkOpen } from "@/components/Editor/extensions/link-open";
import { gutterUnified } from "@/components/Editor/extensions/gutter-unified";
import { cursorFocusExtension, getCursorFocusState } from "@/components/Editor/extensions/cursor-focus-panel";
import { lineIdsExtension } from "@/components/Editor/extensions/line-ids";

import { createParser } from "@/parser/parserInstance";
import type { INotePersistence } from "@/services/persistence";
import { createFileDropHandler, deriveReviewSegments, resolveNotePersistence, resolveWhiteboardCodeLanguage } from "@/app/editor/noteEditorServices";

import {
  wodResultsWidget,
  wodResultsField,
  updateSectionResults,
  WOD_RESULT_CLICK_EVENT,
  compactResultsMode,
  type WodResultClickDetail,
} from "@/components/Editor/extensions/whiteboard-results-widget";
import { OverlayTrack } from "@/components/organisms/editor/OverlayTrack";
import { useOverlayWidthState } from "@/components/Editor/overlays/useOverlayWidthState";
import type { OverlaySlotProps } from "@/components/organisms/editor/OverlayTrack";
import { FrontmatterCompanion } from "@/components/organisms/editor/FrontmatterCompanion";
import { WhiteboardCompanion } from "@/components/organisms/editor/WhiteboardCompanion";
import { WidgetCompanion } from "@/components/organisms/editor/WidgetCompanion";
import type { WidgetRegistry } from "@/components/Editor/widgets/types";
import type { ScriptCommand } from "@/components/Editor/overlays/ScriptCommand";
import { FullscreenTimer } from "@/components/organisms/review/FullscreenTimer";
import { FullscreenReview } from "@/components/organisms/review/FullscreenReview";
import { InlineCommandBar } from "@/components/organisms/editor/InlineCommandBar";
import { EditorCastBridge } from "@/components/organisms/editor/EditorCastBridge";
import type { Segment } from "@/core/models/AnalyticsModels";
import { v4 as uuidv4 } from "uuid";
import type { WorkoutResult } from "@/types/storage";

import { themeCompartment, languageCompartment, modeCompartment } from "@/components/Editor/compartments";

import type { ScriptBlock } from "@/components/Editor/types";
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store';
import { Play, Plus, ExternalLink, Copy, Check } from "lucide-react";
import { buildPlaygroundUrl } from "@/components/atoms/WhiteboardPlaygroundButton";

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
  onStartWorkout?: (block: ScriptBlock) => void;
  /** Called when a workout is completed with the results */
  onCompleteWorkout?: (blockId: string, results: ScriptBlock["results"]) => void;
  /** Called when Whiteboard Script blocks change */
  onBlocksChange?: (blocks: ScriptBlock[]) => void;
  /** Called when user triggers "Add to Plan" on a Whiteboard Script block */
  onAddToPlan?: (block: ScriptBlock) => void;
  /** Called when user wants to review a specific result (for custom routing/popups) */
  onOpenReview?: (result: WorkoutResult) => void;
  /** In-memory results fallback (for non-persistent sessions) */
  extendedResults?: WorkoutResult[];
  /** Note persistence seam used for result and attachment projections */
  notePersistence?: INotePersistence;
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
  commands?: ScriptCommand[];
  /**
   * When true (default), clicking "Run" opens an inline runtime panel below
   * the WOD block instead of calling onStartWorkout / navigating to the track
   * route.  Set to false to restore the previous route-based behaviour.
   */
  enableInlineRuntime?: boolean;
  /**
   * When true, clicking a result row opens the fullscreen review overlay
   * directly instead of expanding the inline AnalyticsScorecard + ReviewGrid.
   * Used by canvas pages where the editor panel is too narrow for inline
   * results. Default: false (inline expand, as on /playground and /journal).
   */
  forceFullscreenReview?: boolean;
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
  /** External active section ID supplied by a parent scroll observer */
  activeSectionId?: string | null;
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
  notePersistence: providedNotePersistence,
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
  forceFullscreenReview = false,
  widgetComponents,
  onButtonAction,
  scrollToSectionId,
  activeSectionId: externalActiveSectionId,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const defaultNotePersistenceRef = useRef<INotePersistence | null>(null);
  // Mod-P opens the palette. Sources are empty here — the parent (Workbench)
  // should call palette.open() via its own onSearch prop for context-aware sources.
  const openNavigationPalette = useCallback(() => {
    usePaletteStore.getState().open({
      placeholder: 'Search…',
      sources: [],
    });
  }, []);
  const isDark = theme === "dark" || theme === "vs-dark";
  const notePersistence = resolveNotePersistence(defaultNotePersistenceRef, providedNotePersistence);

  // Overlay track state
  const [cursorSectionId, setCursorSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [cursorLine, setCursorLine] = useState(1);
  const effectiveActiveSectionId = externalActiveSectionId ?? cursorSectionId;
  const overlayState = useOverlayWidthState(sections, effectiveActiveSectionId);

  // Full-screen timer block: when set, the FullscreenTimer overlay is shown.
  const [fullscreenTimerBlock, setFullscreenTimerBlock] = useState<ScriptBlock | null>(null);

  // Full-screen review segments: when set, the FullscreenReview overlay is shown.
  const [fullscreenReviewSegments, setFullscreenReviewSegments] = useState<Segment[] | null>(null);

  // Whether the fullscreen timer should auto-start on mount
  const [autoStartFullscreen, setAutoStartFullscreen] = useState(false);

  // Toggle the full-screen timer for the given WOD block (Run button).
  const handleRun = useCallback((block: ScriptBlock, autoStart = false) => {
    setAutoStartFullscreen(autoStart);
    setFullscreenTimerBlock(block);
  }, []);

  // Close the full-screen timer.
  const handleTimerClose = useCallback(() => {
    setFullscreenTimerBlock(null);
    setAutoStartFullscreen(false);
  }, []);

  // Intercept selection from Chromecast to start the inline runtime with auto-start.
  const handleCastSelectBlock = useCallback((block: ScriptBlock) => {
    if (enableInlineRuntime) {
      handleRun(block, true);
    }
  }, [enableInlineRuntime, handleRun]);

  // Intercept workout completion: immediately push the new result into the CM6
  // wodResultsField so the inline results bar updates without waiting for a DB
  // round-trip, then forward to the parent's onCompleteWorkout callback.
  const handleCompleteWorkout = useCallback(
    (blockId: string, results: ScriptBlock["results"]) => {
      if (results && viewRef.current) {
        const view = viewRef.current;
        const now = results.endTime || Date.now();
        // Read the section live from the editor state instead of the React
        // `sections` closure — the callback is memoised on [noteId,
        // onCompleteWorkout] so the closure value is stale (typically the
        // initial empty array), which made every optimistic result land with
        // `blockContentId: undefined` and render as hidden history instead of
        // a visible result row.
        const section = view.state.field(sectionField).sections.find(s => s.id === blockId);
        const newResult = {
          id: uuidv4(),
          noteId: noteId ?? "",
          blockContentId: section?.contentId,
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
      if (Array.isArray(extendedResults) && extendedResults.length > 0) {
        const blockResults = extendedResults.filter(r => r.blockId === section.id)
        if (blockResults.length > 0) {
          viewRef.current.dispatch({
            effects: [updateSectionResults.of({ sectionId: section.id, results: blockResults })],
          });
          continue;
        }
      }

      // 2. Fallback: Persistent storage (History/App Mode)
      notePersistence
        .getNote(noteId ?? "", {
          projection: "history-detail",
          resultSelection: {
            mode: "all-for-section",
            blockContentId: section.contentId!,
          },
        })
        .then((entry) => {
          const view = viewRef.current;
          if (!view || !view.dom.isConnected) return;
          const sorted = (entry.extendedResults ?? []).sort((a, b) => b.completedAt - a.completedAt);
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
  }, [noteId, sections, extendedResults, notePersistence]);

  // Listen for "Full Review" clicks fired by the inline results panel and
  // open the full-screen review overlay if the result has detailed logs.
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
        handleOpenReview(deriveReviewSegments(result));
      }
    };

    el.addEventListener(WOD_RESULT_CLICK_EVENT, handleResultClick);
    return () => el.removeEventListener(WOD_RESULT_CLICK_EVENT, handleResultClick);
  }, [handleOpenReview, onOpenReview]);

  // Build effective command list: use explicit commands if provided, otherwise
  // synthesize from legacy onStartWorkout / onAddToPlan for backward compat.
  // When enableInlineRuntime is true the "Run" command uses handleRun
  // instead of routing via onStartWorkout.
  const effectiveCommands = useMemo<ScriptCommand[]>(() => {
    if (hideDefaultCommands) return [];
    if (commands && commands.length > 0) return commands;
    const synthesized: ScriptCommand[] = [];
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
      codeLanguages: resolveWhiteboardCodeLanguage,
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
      // bracketMatching(),
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
            openNavigationPalette();
            return true;
          },
        },
        {
          key: "Ctrl-.",
          run: (view) => {
            const focus = getCursorFocusState(view.state);
            if (!focus?.focusedMetric) return false;
            const type = focus.focusedMetric.type as string;
            const numeric = new Set(["duration", "rep", "rounds", "distance", "resistance"]);
            if (numeric.has(type)) return false;

            // Editor owns the segment loop — palette knows nothing about segments.
            import('@/components/organisms/command-palette/palette-store').then(() => {
              import('@/components/Editor/services/statementBuilderFlow').then(({ runStatementBuilderFlow }) => {
                runStatementBuilderFlow(focus, view);
              }).catch(() => {
                usePaletteStore.getState().open({ placeholder: 'Modify metric…', sources: [] });
              });
            });
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

      // Compact results mode: result rows open fullscreen review on click
      // instead of expanding inline (canvas pages with small editor panels)
      ...(forceFullscreenReview ? [compactResultsMode.of(true)] : []),

      // Full-row widget block replacements (```widget:<name>``` sections)
      ...(widgetComponents && widgetComponents.size > 0
        ? [widgetBlockPreview(widgetComponents)]
        : []),

      // Inline button decorations ([Label]{.button action=...})
      ...(onButtonAction ? [inlineButtonDecoration(onButtonAction)] : []),

      // File drop handler
      createFileDropHandler(noteId, notePersistence),

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
          setCursorSectionId(cursorSec?.id ?? null);
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
      openNavigationPalette,
      showLineNums,
      initialLineWrapping,
      enablePreview,
      enableLinting,
      enableOverlay,
      noteId,
      notePersistence,
      widgetComponents,
      onButtonAction,
      forceFullscreenReview,
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
    const shouldExposeCodemirrorView = import.meta.env.MODE === 'test'
      || (import.meta.env.DEV && window.navigator.webdriver);
    if (shouldExposeCodemirrorView) {
      // Expose view for test automation to directly manipulate content
      (editorRef.current as any).__codemirrorView = view;
    }
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
    setCursorSectionId(initialSection?.id ?? null);

    // Seed block list so onBlocksChange fires on initial mount (not just on edits)
    notifyBlockChanges(view.state, onBlocksChange);

    return () => {
      if (editorRef.current) {
        delete (editorRef.current as any).__codemirrorView;
      }
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
        <WhiteboardCompanion
          noteId={noteId}
          sectionId={props.sectionId}
          view={props.view}
          isActive={props.isActive}
          widthPercent={props.widthPercent}
          cursorLine={cursorLine}
          docVersion={props.docVersion}
          commands={effectiveCommands}
          extendedResults={extendedResults}
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
          activeSectionId={effectiveActiveSectionId}
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

/** Convert an EditorSection to a ScriptBlock for callback compatibility */
function sectionToScriptBlock(section: EditorSection, state: EditorState): ScriptBlock | null {
  if (section.type !== "wod") return null;

  const content =
    section.contentFrom !== undefined && section.contentTo !== undefined
      ? state.doc.sliceString(section.contentFrom, section.contentTo)
      : "";

  let statements: any[] = [];
  try {
    if (content.trim()) {
      statements = createParser().read(content).statements ?? [];
    }
  } catch (e) {
    // Silently ignore parse errors
  }

  return {
    id: section.id,
    contentId: section.contentId,
    dialect: section.dialect || "wod",
    startLine: section.startLine - 1, // Convert to 0-indexed for ScriptBlock compat
    endLine: section.endLine - 1,
    content,
    statements,
    state: "idle",
    version: 1,
    createdAt: Date.now(),
    widgetIds: {},
  };
}

/** Notify parent of block changes by extracting ScriptBlocks from section state */
let lastBlocksJson = "";
function notifyBlockChanges(
  state: EditorState,
  onBlocksChange?: (blocks: ScriptBlock[]) => void
) {
  if (!onBlocksChange) return;

  const sectionState: SectionState = state.field(sectionField);
  const blocks = sectionState.sections
    .filter((s) => s.type === "wod")
    .map((s) => sectionToScriptBlock(s, state))
    .filter((b): b is ScriptBlock => b !== null);

  const blocksJson = JSON.stringify(
    blocks.map((b) => ({ id: b.id, startLine: b.startLine, endLine: b.endLine, content: b.content }))
  );

  if (blocksJson !== lastBlocksJson) {
    lastBlocksJson = blocksJson;
    onBlocksChange(blocks);
  }
}
