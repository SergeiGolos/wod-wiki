/**
 * Editor Entry Point for WOD Wiki
 * 
 * Exports CodeMirror-based editor components and utilities for workout script editing.
 */

// Main editor components

// Note editor (single CM6 instance for full document editing)
export { NoteEditor } from './components/Editor/NoteEditor';
export type { NoteEditorProps } from './components/Editor/NoteEditor';

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
