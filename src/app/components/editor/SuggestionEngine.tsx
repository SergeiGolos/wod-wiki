import * as monaco from 'monaco-editor';
import { editor, languages } from 'monaco-editor';

export class SuggestionEngine {
  suggest(word: editor.IWordAtPosition, model: editor.ITextModel, position: monaco.Position) : languages.ProviderResult<languages.CompletionList> {
    var range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    return {
      suggestions: [{
        label: "EMOM",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "(${1:rounds}) 1:00",
        insertTextRules: monaco.languages.CompletionItemInsertTextRule
          .InsertAsSnippet,
        range: range,
      }]      
    };
  }
}
