import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { editor, languages } from 'monaco-editor';

export class SuggestionEngine {
  suggest(word: editor.IWordAtPosition, model: editor.ITextModel, position: monaco.Position  ) : languages.ProviderResult<languages.CompletionList> {
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    return {
      suggestions: [{
        label: "EMOM",
        kind: languages.CompletionItemKind.Keyword,
        insertText: "(${1:rounds}) 1:00",
        insertTextRules: languages.CompletionItemInsertTextRule
          .InsertAsSnippet,
        range: range,
      }]      
    };
  }
}
