import { EditorState } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import {
  EditorView,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  keymap,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import { whiteboardScriptLanguage, whiteboardScript } from '@bitcobblers/wod-wiki-lang';
import { wql, wqlLanguage } from '@bitcobblers/wod-wiki-wql';
import { editorTheme } from "./theme";
import { sectionField } from "./section-state";
import { previewDecorations } from "./preview-decorations";
import { wodLinter } from "./whiteboard-linter";
import { wodAutocompletion, wodEditorKeymap, wodAutoWrap } from "./whiteboard-autocomplete";
import { lineIdsExtension } from "./line-ids";
import { linkOpen } from "./link-open";
import { smartIncrement } from "./smart-increment";
import { markdownSyntaxHiding } from "./markdown-syntax-hiding";
import { markdownTablePreview } from "./markdown-tables";
import { queryBlockPreview } from "./query-block-preview";
import type { QueryExecutor } from "../contracts/query";

export function resolveCodeLanguage(info: string | null | undefined) {
  const base = info?.split(':', 1)[0]?.toLowerCase();
  if (base === 'time' || base === 'log' || base === 'wod' || base === 'whiteboard') {
    return whiteboardScriptLanguage;
  }
  if (base === 'wql' || base === 'query') {
    return wqlLanguage;
  }
  return null;
}

export interface EditorPresetOptions {
  dialect?: 'wod' | 'whiteboard' | 'wql' | 'markdown' | string;
  isDark?: boolean;
  readOnly?: boolean;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  executor?: QueryExecutor;
  onResultSaved?: (callback: () => void) => (() => void) | void;
  extensions?: Extension[];
}

export function editorPreset(optionsOrDialect: string | EditorPresetOptions = 'markdown'): Extension[] {
  const options: EditorPresetOptions = typeof optionsOrDialect === 'string'
    ? { dialect: optionsOrDialect }
    : optionsOrDialect;

  const {
    dialect = 'markdown',
    isDark = true,
    readOnly = false,
    lineNumbers: showLineNums = true,
    lineWrapping = true,
    executor,
    onResultSaved,
    extensions: extraExtensions = [],
  } = options;

  const extensions: Extension[] = [
    ...(showLineNums ? [lineNumbers(), highlightActiveLineGutter()] : []),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    ...(lineWrapping ? [EditorView.lineWrapping] : []),
    EditorState.allowMultipleSelections.of(true),
    closeBrackets(),
    highlightActiveLine(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    editorTheme(isDark),
    lineIdsExtension,
    smartIncrement,
  ];

  if (readOnly) {
    extensions.push(EditorState.readOnly.of(true));
  }

  if (dialect === 'wql') {
    extensions.push(wql());
  } else if (dialect === 'wod' || dialect === 'whiteboard' || dialect === 'time') {
    extensions.push(
      whiteboardScript(),
      wodLinter,
    );
  } else {
    // Default: Markdown with live sectionField, previews, wod completions, and query blocks
    extensions.push(
      markdown({ codeLanguages: resolveCodeLanguage }),
      sectionField,
      previewDecorations,
      wodLinter,
      wodAutocompletion,
      wodEditorKeymap,
      wodAutoWrap,
      linkOpen,
      markdownSyntaxHiding(),
      markdownTablePreview,
      queryBlockPreview({ executor, onResultSaved }),
    );
  }

  if (extraExtensions.length > 0) {
    extensions.push(...extraExtensions);
  }

  return extensions;
}
