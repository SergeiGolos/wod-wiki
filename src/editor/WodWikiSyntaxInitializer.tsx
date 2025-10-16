import type * as monaco from 'monaco-editor';
import { SuggestionEngine } from './SuggestionEngine';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { ExerciseSuggestionProvider } from './ExerciseSuggestionProvider';
import { ExerciseHoverProvider } from './ExerciseHoverProvider';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { IScript } from "../WodScript";
import { MdTimerRuntime } from '../parser/md-timer';

// Global registry to track registered languages and themes
const registeredLanguages = new Set<string>();
const registeredThemes = new Set<string>();

// Global map to store editor-specific data
const editorDataMap = new Map<string, {
  objectCode?: IScript;
  hints: monaco.languages.InlayHint[];
}>();

export class WodWikiSyntaxInitializer {
  syntax: string = "wod-wiki-syntax";
  theme: string = "wod-wiki-theme";
  objectCode: IScript | undefined;
  hints: monaco.languages.InlayHint[] = [];
  runtime = new MdTimerRuntime();
  monacoInstance: typeof monaco | undefined;
  contentChangeDisposable: monaco.IDisposable[] = [];
  exerciseProvider: ExerciseSuggestionProvider;
  exerciseHoverProvider: ExerciseHoverProvider;
  private editorId: string;
  private editorModel: editor.ITextModel | undefined;

  constructor(
    private tokenEngine: SemantcTokenEngine, 
    private suggestionEngine: SuggestionEngine,     
    private onChange?: (script: IScript)=>void,
    editorId?: string,
    private readonly: boolean = false) {
    // Initialize exercise suggestion provider
    this.exerciseProvider = new ExerciseSuggestionProvider();
    // Initialize exercise hover provider
    this.exerciseHoverProvider = new ExerciseHoverProvider();
    // Use provided editor ID or generate a unique one
    this.editorId = editorId || `editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize editor data in the global map
    editorDataMap.set(this.editorId, {
      objectCode: undefined,
      hints: []
    });
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
      readOnly: this.readonly,
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
    
    // Only register language if not already registered
    if (!registeredLanguages.has(this.syntax)) {
      monaco.languages.register({ id: this.syntax });
      registeredLanguages.add(this.syntax);
    }
    
    // Only define theme if not already defined
    if (!registeredThemes.has(this.theme)) {
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
      registeredThemes.add(this.theme);
    }

    // Add a CSS class for the current line decoration (only once)
    if (!document.getElementById('wod-wiki-line-decoration-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'wod-wiki-line-decoration-styles';
      styleElement.textContent = `
        .currentLineDecoration {
          background-color: #E6F7FF !important;
          border-left: 2px solid #1890FF !important;
        }
        .currentLineGlyphMargin {
          background-color: #1890FF;
          width: 4px !important;
        }
      `;
      document.head.appendChild(styleElement);
    }

    this.contentChangeDisposable.push(monaco.languages.registerCompletionItemProvider(this.syntax, {
      provideCompletionItems: (model, position, token) => {
        const word = model.getWordUntilPosition(position);
        return this.suggestionEngine.suggest(word, model, position);
      },
    }));

    // Register exercise suggestion provider for intelligent exercise name completions
    this.contentChangeDisposable.push(monaco.languages.registerCompletionItemProvider(this.syntax, {
      provideCompletionItems: (model, position, context, token) => {
        return this.exerciseProvider.provideCompletionItems(model, position, context, token);
      },
    }));

    // Register exercise hover provider for rich exercise documentation on hover
    this.contentChangeDisposable.push(monaco.languages.registerHoverProvider(this.syntax, {
      provideHover: (model, position, token) => {
        return this.exerciseHoverProvider.provideHover(model, position, token);
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
        // Only provide hints for this editor's model
        if (this.editorModel !== model) {
          return { hints: [], dispose: () => { } };
        }
        
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
    this.monacoInstance = monaco;
    this.editorModel = editor.getModel() || undefined;
    
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
    // Clean up exercise provider resources
    this.exerciseProvider.dispose();
    this.exerciseHoverProvider.dispose();
    
    // Clean up editor data from global map
    editorDataMap.delete(this.editorId);
  }
}
