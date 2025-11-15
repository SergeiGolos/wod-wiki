/**
 * Editor Entry Point for WOD Wiki
 * 
 * Exports Monaco editor components and utilities for workout script editing.
 * Includes WodWiki editor, MarkdownEditor, and exercise suggestion/hover providers.
 * 
 * @example
 * ```typescript
 * import { WodWiki, ExerciseIndexManager } from 'wod-wiki/editor';
 * ```
 */

// Main editor components
export { WodWiki } from './editor/WodWiki';
export type { WodWikiProps, WodWikiToken, WodWikiTokenHint } from './editor/WodWiki';

// Markdown editor
export { MarkdownEditor } from './markdown-editor/MarkdownEditor';
export type { MarkdownEditorProps } from './markdown-editor/MarkdownEditor';

// Exercise management
export { ExerciseIndexManager } from './editor/ExerciseIndexManager';
export { ExerciseSuggestionProvider } from './editor/ExerciseSuggestionProvider';
export { ExerciseHoverProvider } from './editor/ExerciseHoverProvider';
export { ExerciseSearchEngine } from './editor/ExerciseSearchEngine';
export type { SearchOptions } from './editor/ExerciseSearchEngine';

// Monaco integration
export { WodWikiSyntaxInitializer } from './editor/WodWikiSyntaxInitializer';
export { SemantcTokenEngine } from './editor/SemantcTokenEngine';
export { SuggestionEngine } from './editor/SuggestionEngine';
export { DefaultSuggestionService } from './editor/SuggestionService';

// LRU Cache utility
export { LRUCache } from './editor/LRUCache';

// Exercise types
export type { Exercise, Muscle, Force, Level, Mechanic, Equipment, Category } from './exercise';
