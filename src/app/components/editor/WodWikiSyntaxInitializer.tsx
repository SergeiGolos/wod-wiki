import { WodWikiInitializer, WodRuntimeScript, MdTimerRuntime } from '@/lib/md-timer';
import type * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import React from 'react';
import { SuggestionEngine } from './SuggestionEngine';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { initMonaco } from '@/monaco-setup';


export class WodWikiSyntaxInitializer implements WodWikiInitializer {
  syntax: string = "wod-wiki-syntax";
  theme: string = "wod-wiki-theme";
  objectCode: WodRuntimeScript | undefined;
  hints: monaco.languages.InlayHint[] = [];
  runtime = new MdTimerRuntime();
  

  constructor(private tokenEngine: SemantcTokenEngine, private suggestionEngine: SuggestionEngine,private monacoInstance: typeof monaco, public code?: string) {
    if (typeof window !== 'undefined') {
      this.initializeMonaco();
    }
  }

  private async initializeMonaco() {    
    
    this.monacoInstance = await initMonaco();
    this.monacoInstance.languages.register({ id: this.syntax });
    this.monacoInstance.editor.defineTheme(this.theme, {
      base: "vs",
      inherit: false,
      rules: this.tokenEngine.tokens,
      colors: {
        "editor.foreground": "#000000",
        "editor.background": "#FFFFFF",
        "editor.lineHighlightBackground": "#F0F0F0",
        "editorCursor.foreground": "#000000",
        "editor.selectionBackground": "#D6FF80",
      }
    });

    this.monacoInstance.languages.registerCompletionItemProvider(this.syntax, {
      provideCompletionItems: (model, position, token) => {
        var word = model.getWordUntilPosition(position);
        return this.suggestionEngine.suggest(word, model, position);
      },
    });

    this.monacoInstance.languages.registerDocumentSemanticTokensProvider(this.syntax, {
      getLegend: () => this.tokenEngine,
      provideDocumentSemanticTokens: (model) => {
        const code = model.getValue().trim();
        if (!this.objectCode) return ;
        return this.tokenEngine.write(code, this.objectCode);
      },
      releaseDocumentSemanticTokens: function (resultId) { },
    });

    this.monacoInstance.languages.registerInlayHintsProvider(this.syntax, {
      provideInlayHints: (model, range, token): monaco.languages.ProviderResult<monaco.languages.InlayHintList> => {        
        this.hints = this.objectCode?.outcome 
        ? [] :
        this.hints;

        const outcome = (this.objectCode?.outcome || []).flatMap((row: any) => row.fragments);
        for (let fragment of outcome) {
          const hint = this.tokenEngine.tokens.find(token => token.token == fragment.type);
          for (let apply of hint?.hints || []) {
            this.hints.push({
              kind: this.monacoInstance!.languages.InlayHintKind.Parameter,
              position: {
                lineNumber: fragment.meta.line,
                column: fragment.meta.columnStart,
              },
              label: apply.hint,
            });
          }
        }
        return { hints: this.hints, dispose: () => { } };
      }
    });
  }

  createEditor(
    containerRef: React.RefObject<HTMLElement | null>,
    onValueChange?: (event: editor.IModelContentChangedEvent, classObject?: WodRuntimeScript) => void,
    onCursorMoved?: (event: editor.ICursorPositionChangedEvent, classObject?: WodRuntimeScript) => void
  ): [editor.IStandaloneCodeEditor | null, monaco.IDisposable, monaco.IDisposable] {
    if (!this.monacoInstance || !containerRef.current) {
      return [null, { dispose: () => {} }, { dispose: () => {} }];
    }

    const result = this.monacoInstance.editor.create(containerRef.current, {
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
      inlayHints: { enabled: "on" },
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

    const cursorChangeDisposable = result.onDidChangeCursorPosition((event) => {
      onCursorMoved?.(event, this.objectCode);
    });

    return [result, contentChangeDisposable, cursorChangeDisposable];
  }
}
