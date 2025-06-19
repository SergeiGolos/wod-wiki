
export interface SyntaxSuggestion {
  trigger: string;
  snippet: string;
  icon?: string;
  documentation?: string;
}

export const SYNTAX_SUGGESTIONS: SyntaxSuggestion[] = [
  {
    trigger: 'AMRAP',
    snippet: '(AMRAP) ${1:duration}\n  $0',
    icon: '⏱️',
    documentation: 'As Many Rounds As Possible within time cap'
  },
  {
    trigger: 'EMOM',
    snippet: '(EMOM) ${1:rounds} ${2:duration}\n  $0',
    icon: '🔥',
    documentation: 'Every Minute on the Minute'
  }
];


export abstract class SuggestionService {
  abstract getSuggestions(): typeof SYNTAX_SUGGESTIONS;
  abstract addCustomSuggestion(suggestion: typeof SYNTAX_SUGGESTIONS[number]): void;
}

export class DefaultSuggestionService implements SuggestionService {
  private suggestions = [...SYNTAX_SUGGESTIONS];

  getSuggestions() {
    return this.suggestions;
  }

  addCustomSuggestion(suggestion: typeof SYNTAX_SUGGESTIONS[number]) {
    this.suggestions.push(suggestion);
  }
}
