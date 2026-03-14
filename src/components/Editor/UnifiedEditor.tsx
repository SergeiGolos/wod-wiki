/**
 * UnifiedEditor
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
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap, lintGutter } from "@codemirror/lint";
import { markdown } from "@codemirror/lang-markdown";

import { wodscriptLanguage } from "../../parser/wodscript-language";
import { editorTheme } from "./extensions/theme";
import { smartIncrement } from "./extensions/smart-increment";

// Unified editor extensions
import { sectionField, SectionState, activeCursorSection, type EditorSection } from "./extensions/section-state";
import { previewDecorations } from "./extensions/preview-decorations";
import { frontmatterPreview } from "./extensions/frontmatter-preview";
import { markdownTablePreview } from "./extensions/markdown-tables";
import { wodLinter } from "./extensions/wod-linter";
import { wodAutocompletion, wodEditorKeymap } from "./extensions/wod-autocomplete";
import { wodOverlayPanel } from "./extensions/wod-overlay";
import { sectionGeometry } from "./extensions/section-geometry";
import { linkOpen } from "./extensions/link-open";
import { gutterRuntimeHighlights } from "./extensions/gutter-runtime";
import { foldWidgets } from "./extensions/fold-widgets";
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
import type { Segment } from "@/core/models/AnalyticsModels";

// Existing state fields
import { activeWorkoutIdField, wodBlockRuntimeField } from "./state-fields";
import { themeCompartment, languageCompartment, modeCompartment } from "./compartments";

import type { WodBlock } from "./types";
import { useCommandPalette } from "../command-palette/CommandContext";
import { Play, Plus } from "lucide-react";

export interface UnifiedEditorProps {
  /** Note ID for result lookup */
  noteId?: string;
  /** Document content */
  value: string;
  /** Called on every document change */
  onChange: (value: string) => void;
  /** Called when cursor position changes */
  onCursorPositionChange?: (line: number, column: number) => void;
  /** Editor theme ("vs" | "dark") */
  theme?: string;
  /** Read-only mode */
  readonly?: boolean;
  /** CSS class name */
  className?: string;
  /** Called when user triggers "Run" on a WodScript block */
  onStartWorkout?: (block: WodBlock) => void;
  /** Called when a workout is completed with the results */
  onCompleteWorkout?: (blockId: string, results: WodBlock["results"]) => void;
  /** Called when WodScript blocks change */
  onBlocksChange?: (blocks: WodBlock[]) => void;
  /** Called when user triggers "Add to Plan" on a WodScript block */
  onAddToPlan?: (block: WodBlock) => void;
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
  /** Enable WodScript linting (default: true) */
  enableLinting?: boolean;
  /** Enable overlay panel (default: true) */
  enableOverlay?: boolean;
  /**
   * Command buttons shown on WodScript block overlays.
   * When provided, replaces the individual onStartWorkout / onAddToPlan callbacks
   * (those are still accepted for backward compatibility when commands is omitted).
   */
  commands?: WodCommand[];
  /**
   * How many commands are shown as direct buttons in the overlay.
   * Any additional commands are hidden behind a "…" overflow menu.
   * Default: 1.
   */
  visibleCommands?: number;
  /**
   * When true (default), clicking "Run" opens an inline runtime panel below
   * the WOD block instead of calling onStartWorkout / navigating to the track
   * route.  Set to false to restore the previous route-based behaviour.
   */
  enableInlineRuntime?: boolean;
  /**
   * Registry of custom widget components rendered inside ```widget:<name> blocks.
   * Keys are widget names (e.g. "hero"), values are React components.
   */
  widgetComponents?: WidgetRegistry;
}

export const UnifiedEditor: React.FC<UnifiedEditorProps> = ({
  noteId,
  value,
  onChange,
  onCursorPositionChange,
  theme = "vs",
  readonly = false,
  className = "",
  onStartWorkout,
  onCompleteWorkout,
  onBlocksChange,
  onAddToPlan,
  onViewCreated,
  mode = "edit",
  lineWrapping: initialLineWrapping = true,
  showLineNumbers: showLineNums = true,
  enablePreview = true,
  enableLinting = true,
  enableOverlay = true,
  commands,
  visibleCommands = 1,
  enableInlineRuntime = true,
  widgetComponents,
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

  // Toggle the full-screen timer for the given WOD block (Run button).
  const handleRun = useCallback((block: WodBlock) => {
    setFullscreenTimerBlock(block);
  }, []);

  // Close the full-screen timer.
  const handleTimerClose = useCallback(() => {
    setFullscreenTimerBlock(null);
  }, []);

  // Open the full-screen review.
  const handleOpenReview = useCallback((segments: Segment[]) => {
    setFullscreenReviewSegments(segments);
  }, []);

  // Close the full-screen review.
  const handleReviewClose = useCallback(() => {
    setFullscreenReviewSegments(null);
  }, []);

  // Build effective command list: use explicit commands if provided, otherwise
  // synthesize from legacy onStartWorkout / onAddToPlan for backward compat.
  // When enableInlineRuntime is true the "Run" command uses handleRun
  // instead of routing via onStartWorkout.
  const effectiveCommands = useMemo<WodCommand[]>(() => {
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

  // Mixed language: Markdown + embedded WodScript in code fences
  const languages = useMemo(() => {
    return markdown({
      codeLanguages: (info) => {
        if (info === "wod" || info === "log" || info === "plan")
          return wodscriptLanguage;
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
      foldGutter(),

      // Keybindings
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
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
      ]),

      // Existing extensions
      smartIncrement,

      // ---- Unified Editor Extensions ----

      // Section tracking (required by all other unified extensions)
      sectionField,

      // Block-level preview decorations
      ...(enablePreview ? [previewDecorations, frontmatterPreview, markdownTablePreview] : []),

      // WodScript linting
      ...(enableLinting ? [wodLinter, lintGutter()] : []),

      // Autocomplete (dialect + embed completions)
      wodAutocompletion,
      wodEditorKeymap,

      // Overlay panel for WodScript blocks
      ...(enableOverlay ? [wodOverlayPanel] : []),

      // Section geometry measurement (for overlay track)
      sectionGeometry,

      // Ctrl+Click link opening + hover tooltip
      linkOpen,

      // Gutter line highlights for active runtime blocks
      ...gutterRuntimeHighlights,

      // Auto-fold widget fence bodies (keeps JSON off-screen)
      foldWidgets,

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

      // Existing state fields
      activeWorkoutIdField,
      wodBlockRuntimeField,
    ],
    [
      onChange,
      onCursorPositionChange,
      onBlocksChange,
      readonly,
      setIsOpen,
      showLineNums,
      initialLineWrapping,
      enablePreview,
      enableLinting,
      enableOverlay,
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
          visibleCount={visibleCommands}
          onOpenReview={handleOpenReview}
        />
      );
    }

    if (props.sectionType === "frontmatter") {
      return (
        <FrontmatterCompanion
          sectionId={props.sectionId}
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
      className={`cm-unified-editor relative h-full w-full min-w-0 overflow-hidden ${className}`}
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
      {fullscreenTimerBlock && viewRef.current && (
        <FullscreenTimer
          block={fullscreenTimerBlock}
          view={viewRef.current}
          onClose={handleTimerClose}
          onCompleteWorkout={onCompleteWorkout}
        />
      )}

      {fullscreenReviewSegments && (
        <FullscreenReview
          segments={fullscreenReviewSegments}
          onClose={handleReviewClose}
        />
      )}
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
