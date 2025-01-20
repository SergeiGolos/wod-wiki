import { WodWikiInitializer, WodRuntimeScript, MdTimerRuntime } from '@/lib/md-timer';
import * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import React from 'react';
import { SuggestionEngine } from './SuggestionEngine';
import { SemantcTokenEngine } from './SemantcTokenEngine';

export class WodWikiSyntaxInitializer implements WodWikiInitializer {
  syntax: string = "wod-wiki-syntax";
  theme: string = "wod-wiki-theme";
  objectCode: WodRuntimeScript | undefined;
  runtime = new MdTimerRuntime();
  constructor(private tokenEngine: SemantcTokenEngine, private suggestionEngine: SuggestionEngine, public code?: string) {
    monaco.languages.register({ id: this.syntax });
    monaco.editor.defineTheme(this.theme, {
      base: "vs",
      inherit: false,
      rules: tokenEngine.tokens,
      colors: {
        "editor.foreground": "#000000",
        "editor.background": "#FFFFFF",
        "editor.lineHighlightBackground": "#F0F0F0",
        "editorCursor.foreground": "#000000",
        "editor.selectionBackground": "#D6FF80",
      }
    });

    monaco.languages.registerCompletionItemProvider(this.syntax, {
      provideCompletionItems: (model, position) => {
        var word = model.getWordUntilPosition(position);
        return suggestionEngine.suggest(word, model, position);
      },
    });

    monaco.languages.registerDocumentSemanticTokensProvider(this.syntax, {
      getLegend: () => tokenEngine,
      provideDocumentSemanticTokens: (model) => {
        const code = model.getValue().trim();
        if (!this.objectCode) return;
        return tokenEngine.write(code, this.objectCode);
      },
      releaseDocumentSemanticTokens: function (resultId) { },
    });

    monaco.languages.registerInlayHintsProvider(this.syntax, {
      provideInlayHints: (model, range, token): monaco.languages.ProviderResult<monaco.languages.InlayHint[]> => {
        const hints: monaco.languages.InlayHint[] = [];
        const outcome = (this.objectCode?.outcome || []).flatMap((row: any) => row.fragments);
        // Get all lines in range
        for (let fragment of outcome) {
          console.log(fragment);

          const hint = tokenEngine.tokens.find(token => token.token == fragment.type);
          for (let apply of hint?.hints || []) {
            hints.push({
              kind: monaco.languages.InlayHintKind.Other,
              position: {
                lineNumber: fragment.meta.line,
                column: fragment.meta.columnStart,
              },
              text: apply.hint,
            });
          }
        }
        return hints;
      }
    });

  }

  createEditor(
    containerRef: React.RefObject<HTMLElement | null>,
    onValueChange?: (event: editor.IModelContentChangedEvent, classObject?: WodRuntimeScript) => void,
    /** Optional cursor position handler */
    onCursorMoved?: (event: editor.ICursorPositionChangedEvent, classObject?: WodRuntimeScript) => void

  ): [editor.IStandaloneCodeEditor | null, monaco.IDisposable, monaco.IDisposable] {
    const result = monaco.editor.create(containerRef.current!, {
      value: "",
      language: this.syntax,
      theme: this.theme,
      automaticLayout: true,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 20,
      padding: {
        top: 12,
        bottom: 12
      },
      inlayHints: { enabled: true },
      // Add these options to enable semantic tokens
      "semanticHighlighting.enabled": true,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        verticalScrollbarSize: 0,
        horizontalScrollbarSize: 0,
        alwaysConsumeMouseWheel: false
      }
    });

    const contentChangeDisposable = result.onDidChangeModelContent((event) => {
      this.objectCode = this.runtime.read(result.getValue().trimEnd());
      onValueChange?.(event, this.objectCode);
    });

    // Subscribe to cursor position change events
    const cursorChangeDisposable = result.onDidChangeCursorPosition((event) => {
      onCursorMoved?.(event, this.objectCode);
    });

    return [result, contentChangeDisposable, cursorChangeDisposable];
  }
}
