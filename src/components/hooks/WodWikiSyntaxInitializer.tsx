
import type * as monaco from 'monaco-editor';
import { SuggestionEngine } from './SuggestionEngine';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { MdTimerRuntime, WodRuntimeScript, WodWikiInitializer } from '@/core/parser/md-timer';

export class WodWikiSyntaxInitializer implements WodWikiInitializer {
  syntax: string = "wod-wiki-syntax";
  theme: string = "wod-wiki-theme";
  objectCode: WodRuntimeScript | undefined;
  hints: monaco.languages.InlayHint[] = [];
  runtime = new MdTimerRuntime();
  monacoInstance: typeof monaco | undefined;
  contentChangeDisposable: monaco.IDisposable[] = [];

  constructor(
    private tokenEngine: SemantcTokenEngine, 
    private suggestionEngine: SuggestionEngine,     
    private onChange?: (script: WodRuntimeScript)=>void) {    
  }

  options: editor.IStandaloneEditorConstructionOptions = {
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
      // Add these options to enable semantic tokens
      "semanticHighlighting.enabled": true,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        verticalScrollbarSize: 0,
        horizontalScrollbarSize: 0,
        alwaysConsumeMouseWheel: false
      }
  }

  public handleBeforeMount(monaco: Monaco) {        
    const tokens = this.tokenEngine?.tokens ?? [];        
    monaco.languages.register({ id: this.syntax });    
    monaco.editor.defineTheme(this.theme, {
      base: "vs",
      inherit: false,
      rules: tokens,
      colors: {
        "editor.foreground": "#000000",
        "editor.background": "#FFFFFF",
        "editor.lineHighlightBackground": "#F0F0F0",
        "editorCursor.foreground": "#000000",
        "editor.selectionBackground": "#D6FF80",
      }
    });

    this.contentChangeDisposable.push(monaco.languages.registerCompletionItemProvider(this.syntax, {
      provideCompletionItems: (model, position, token) => {
        const word = model.getWordUntilPosition(position);
        return this.suggestionEngine.suggest(word, model, position);
      },
    }));
        
    this.contentChangeDisposable.push(monaco.languages.registerDocumentSemanticTokensProvider(this.syntax, {
      getLegend: () => this.tokenEngine,
      provideDocumentSemanticTokens: (model, lastResultId, token) => {
        const code = model.getValue().trim();
        if (!this.objectCode) return undefined;
        
        const result = this.tokenEngine.write(code, this.objectCode);
        return {
          data: result.data!,
          resultId: result.resultId
        };
      },
      releaseDocumentSemanticTokens: function () { },
    }))
    
    this.contentChangeDisposable.push(monaco.languages.registerInlayHintsProvider(this.syntax, {
      provideInlayHints: (model, range, token): monaco.languages.ProviderResult<monaco.languages.InlayHintList> => {        
        this.hints = this.objectCode?.statements 
        ? [] :
        this.hints;

        const outcome = (this.objectCode?.statements || []).flatMap((row: any) => row.fragments);
        for (let fragment of outcome) {
          const hint = this.tokenEngine.tokens.find(token => token.token == fragment.type);
          for (let apply of hint?.hints || []) {
            this.hints.push({
              kind: monaco!.languages.InlayHintKind.Parameter,
              position: {
                lineNumber: fragment.meta.line,
                column: (apply.offSet || 0) + (apply.position == "before" 
                  ? fragment.meta.columnStart
                  : fragment.meta.columnStart +  fragment.meta.length + 1)
              },
              label: apply.hint,
            });
          }
        }
        return { hints: this.hints, dispose: () => { } };
      }
    }));
  }

  handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {         
    const parse = () => {          
      this.objectCode = this.runtime.read(editor.getValue().trimEnd());      
      this.onChange?.(this.objectCode);
    }        
    
    this.contentChangeDisposable.push(editor.onDidChangeModelContent((event) => {
      parse();
    }));        
    parse();    
  }

  handleUnmount() {
    for(var handler of this.contentChangeDisposable) {
      handler.dispose();
    };
  }
}
