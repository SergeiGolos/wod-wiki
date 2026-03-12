/**
 * Editor Entry Point for WOD Wiki
 * 
 * Exports CodeMirror-based editor components and utilities for workout script editing.
 */

// Main editor components
export { WodWiki } from './components/Editor/WodWiki';
export type { WodWikiProps } from './components/Editor/WodWiki';

// Markdown editor
export { MarkdownEditor } from './components/Editor/MarkdownEditor';
export type { MarkdownEditorProps } from './components/Editor/MarkdownEditor';

// Exercise management
export { ExerciseIndexManager } from './components/Editor/ExerciseIndexManager';
export { ExerciseSearchEngine } from './components/Editor/ExerciseSearchEngine';
export type { SearchOptions } from './components/Editor/ExerciseSearchEngine';

// LRU Cache utility
export { LRUCache } from './components/Editor/LRUCache';

// Exercise types
export type { Exercise, Muscle, Force, Level, Mechanic, Equipment, Category } from './exercise';

// UI Components
export { CommandPalette } from './components/command-palette/CommandPalette';
export { CommandProvider, useCommandPalette, useRegisterCommand } from './components/command-palette/CommandContext';
export type { Command, CommandContextType } from './components/command-palette/types';
export { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/headless/Dialog';
export type { DialogProps } from './components/headless/Dialog';
