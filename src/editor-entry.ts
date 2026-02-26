/**
 * Editor Entry Point for WOD Wiki
 * 
 * Exports CodeMirror-based editor components and utilities for workout script editing.
 */

// Main editor components
export { WodWiki } from './editor/WodWiki';
export type { WodWikiProps } from './editor/WodWiki';

// Markdown editor
export { MarkdownEditor } from './markdown-editor/MarkdownEditor';
export type { MarkdownEditorProps } from './markdown-editor/MarkdownEditor';

// Exercise management
export { ExerciseIndexManager } from './editor/ExerciseIndexManager';
export { ExerciseSearchEngine } from './editor/ExerciseSearchEngine';
export type { SearchOptions } from './editor/ExerciseSearchEngine';

// LRU Cache utility
export { LRUCache } from './editor/LRUCache';

// Exercise types
export type { Exercise, Muscle, Force, Level, Mechanic, Equipment, Category } from './exercise';

// UI Components
export { CommandPalette } from './components/command-palette/CommandPalette';
export { CommandProvider, useCommandPalette, useRegisterCommand } from './components/command-palette/CommandContext';
export type { Command, CommandContextType } from './components/command-palette/types';
export { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/headless/Dialog';
export type { DialogProps } from './components/headless/Dialog';
