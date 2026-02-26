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
  highlightActiveLineGutter
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { 
  bracketMatching, 
  foldGutter, 
  foldKeymap, 
  indentOnInput, 
  syntaxHighlighting, 
  defaultHighlightStyle 
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { markdown } from "@codemirror/lang-markdown";

import { wodscriptLanguage } from "../../parser/wodscript-language";
import { editorTheme, smartIncrement, wodDecorations } from "./extensions";
import { WodBlock } from "../../markdown-editor/types";
import { useCommandPalette } from "../command-palette/CommandContext";

// Phase 3: Compartments and State Fields
import { themeCompartment, languageCompartment, modeCompartment } from "../../editor/compartments";
import { activeWorkoutIdField, wodBlockRuntimeField } from "../../editor/state-fields";

export interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorPositionChange?: (line: number, column: number) => void;
  theme?: string;
  readonly?: boolean;
  className?: string;
  onStartWorkout?: (block: WodBlock) => void;
  onBlocksChange?: (blocks: WodBlock[]) => void;
  onViewCreated?: (view: EditorView) => void;
  mode?: "edit" | "track" | "data";
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  onCursorPositionChange,
  theme = "vs",
  readonly = false,
  className = "",
  onStartWorkout,
  onBlocksChange,
  onViewCreated,
  mode = "edit"
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { setIsOpen } = useCommandPalette();
  const isDark = theme === "dark" || theme === "vs-dark";

  // Mixed language support: Markdown + WodScript
  const languages = useMemo(() => {
    return markdown({
      codeLanguages: (info) => {
        if (info === "wod" || info === "log" || info === "plan") return wodscriptLanguage;
        return null;
      }
    });
  }, []);

  const baseExtensions = useMemo(() => [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    foldGutter(),
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
        }
      }
    ]),
    smartIncrement,
    wodDecorations({ onStartWorkout, onBlocksChange }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
      if (update.selectionSet || update.docChanged) {
        const { head } = update.state.selection.main;
        const line = update.state.doc.lineAt(head);
        onCursorPositionChange?.(line.number, head - line.from + 1);
      }
    }),
    EditorState.readOnly.of(readonly),
    activeWorkoutIdField,
    wodBlockRuntimeField
  ], [onStartWorkout, onBlocksChange, onChange, onCursorPositionChange, readonly, setIsOpen]);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...baseExtensions,
        themeCompartment.of(editorTheme(isDark)),
        languageCompartment.of(languages),
        modeCompartment.of([])
      ]
    });

    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    viewRef.current = view;
    if (onViewCreated) onViewCreated(view);

    return () => {
      view.destroy();
    };
  }, []); // Only on mount

  // Sync value when it changes externally
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: value }
      });
    }
  }, [value]);

  // Sync theme
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.reconfigure(editorTheme(isDark))
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
                    modeCompartment.of(modeExtensions)
                ])
            ]
        });
    }
  }, [baseExtensions, mode, isDark, languages]);

  return <div ref={editorRef} className={`cm-editor-container h-full ${className}`} />;
};
