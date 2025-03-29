import { SuggestionService } from './SuggestionService';
import { editor, languages, IPosition } from 'monaco-editor';

/**
 * Engine that provides code suggestions/completions in the editor
 */
export class SuggestionEngine {
  constructor(private suggestionService: SuggestionService) {}

  /**
   * Provides code completion suggestions based on the current word and position
   * @param word The current word at the cursor position
   * @param model The text model of the editor
   * @param position The cursor position
   * @returns Completion suggestions for the current context
   */
  suggest(
    word: editor.IWordAtPosition, 
    model: editor.ITextModel, 
    position: IPosition
  ): languages.ProviderResult<languages.CompletionList> {
    return {
      suggestions: this.suggestionService.getSuggestions().map(s => ({
        label: `${s.icon || '⚡'} ${s.trigger}`,
        insertText: s.snippet,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: s.documentation,
        kind: languages.CompletionItemKind.Snippet,
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }
      }))
    };
  }
}
