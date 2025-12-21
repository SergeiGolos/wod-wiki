import { describe, it, expect, vi } from 'bun:test';
import { WodWikiSyntaxInitializer } from './WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from './SemantcTokenEngine';
import { SuggestionEngine } from './SuggestionEngine';

// Mock dependencies
vi.mock('./SemantcTokenEngine', () => ({
  SemantcTokenEngine: vi.fn().mockImplementation(() => ({
    tokens: []
  }))
}));

vi.mock('./SuggestionEngine', () => ({
  SuggestionEngine: vi.fn().mockImplementation(() => ({
    suggest: vi.fn()
  }))
}));

// Mock ExerciseSuggestionProvider
vi.mock('./ExerciseSuggestionProvider', () => ({
  ExerciseSuggestionProvider: vi.fn().mockImplementation(() => ({
    dispose: vi.fn()
  }))
}));

// Mock ExerciseHoverProvider
vi.mock('./ExerciseHoverProvider', () => ({
  ExerciseHoverProvider: vi.fn().mockImplementation(() => ({
    dispose: vi.fn()
  }))
}));

// NOTE: We intentionally do NOT mock MdTimerRuntime as it causes test isolation issues
// with other parser tests. The real parser is lightweight enough for this test.

describe('WodWikiSyntaxInitializer', () => {
  it('should have correct default editor options', () => {
    // Instantiate dependencies (mocks)
    const tokenEngine = new SemantcTokenEngine([]);
    const suggestionEngine = new SuggestionEngine({} as any);

    const initializer = new WodWikiSyntaxInitializer(tokenEngine, suggestionEngine);

    // Check options
    // Current behavior: lineNumbers is 'on', folding is undefined (defaulting to true/on in Monaco)
    expect(initializer.options.lineNumbers).toBe('off');
    expect(initializer.options.folding).toBe(false);
  });
});
