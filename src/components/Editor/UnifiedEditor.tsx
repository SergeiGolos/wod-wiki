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

import React, { useEffect, useRef, useMemo } from "react";
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
import { sectionField, SectionState } from "./extensions/section-state";
import { previewDecorations } from "./extensions/preview-decorations";
import { frontmatterPreview } from "./extensions/frontmatter-preview";
import { markdownTablePreview } from "./extensions/markdown-tables";
import { wodLinter } from "./extensions/wod-linter";
import { wodAutocompletion, wodEditorKeymap } from "./extensions/wod-autocomplete";
import { wodOverlayPanel, configureOverlayActions } from "./extensions/wod-overlay";

// Existing state fields
import { activeWorkoutIdField, wodBlockRuntimeField } from "./state-fields";
import { themeCompartment, languageCompartment, modeCompartment } from "./compartments";

import type { WodBlock } from "./types";
import type { EditorSection } from "./extensions/section-state";
import { useCommandPalette } from "../command-palette/CommandContext";

export interface UnifiedEditorProps {
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
}

export const UnifiedEditor: React.FC<UnifiedEditorProps> = ({
  value,
  onChange,
  onCursorPositionChange,
  theme = "vs",
  readonly = false,
  className = "",
  onStartWorkout,
  onBlocksChange,
  onAddToPlan,
  onViewCreated,
  mode = "edit",
  lineWrapping: initialLineWrapping = true,
  showLineNumbers: showLineNums = true,
  enablePreview = true,
  enableLinting = true,
  enableOverlay = true,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { setIsOpen } = useCommandPalette();
  const isDark = theme === "dark" || theme === "vs-dark";

  // Configure overlay actions with callbacks
  useEffect(() => {
    const actions = [];
    if (onStartWorkout) {
      actions.push({
        label: "Run",
        icon: "▶",
        action: (_view: EditorView, section: EditorSection) => {
          const wodBlock = sectionToWodBlock(section, _view.state);
          if (wodBlock) onStartWorkout(wodBlock);
        },
      });
    }
    if (onAddToPlan) {
      actions.push({
        label: "Plan",
        icon: "📋",
        action: (_view: EditorView, section: EditorSection) => {
          const wodBlock = sectionToWodBlock(section, _view.state);
          if (wodBlock) onAddToPlan(wodBlock);
        },
      });
    }
    configureOverlayActions(actions);
  }, [onStartWorkout, onAddToPlan]);

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

  return (
    <div
      ref={editorRef}
      className={`cm-unified-editor h-full w-full min-w-0 overflow-hidden ${className}`}
    />
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
