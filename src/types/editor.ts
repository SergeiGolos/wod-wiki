/**
 * Editor types for WOD Wiki
 * 
 * Type definitions for Monaco editor components including WodWiki
 * and MarkdownEditor with their respective props and configurations.
 */

import { IScript, CodeMetadata } from './core';
import { ExerciseDataProvider, ExercisePathIndex, ExercisePathEntry } from './providers';
import { editor as monacoEditor } from 'monaco-editor';

/**
 * Props for the WodWiki Monaco editor component
 */
export interface WodWikiProps {
  /** Unique identifier for the editor instance */
  id: string;
  
  /** Initial code content */
  code?: string;
  
  /** Cursor position metadata */
  cursor?: CodeMetadata | undefined;
  
  /** Optional value change handler */
  onValueChange?: (classObject?: IScript) => void;
  
  /** Optional callback when editor is mounted */
  onMount?: (editor: any) => void;
  
  /** Whether the editor is read-only */
  readonly?: boolean;
  
  /** Line number to highlight */
  highlightedLine?: number;
  
  /** Optional exercise data provider for suggestions and hover */
  exerciseProvider?: ExerciseDataProvider;
}

/**
 * Props for the MarkdownEditor component
 */
export interface MarkdownEditorProps {
  /** Initial markdown content */
  initialContent?: string;
  
  /** Callback when content changes */
  onContentChange?: (content: string) => void;
  
  /** Callback when title changes (first line) */
  onTitleChange?: (title: string) => void;
  
  /** Whether to show markdown toolbar */
  showToolbar?: boolean;
  
  /** Whether to show context overlay */
  showContextOverlay?: boolean;
  
  /** Whether editor is read-only */
  readonly?: boolean;
  
  /** Custom theme name */
  theme?: string;
  
  /** Custom CSS class */
  className?: string;
  
  /** Height of editor (default: 100vh) */
  height?: string | number;
  
  /** Width of editor (default: 100%) */
  width?: string | number;
  
  /** Optional Monaco options override */
  editorOptions?: monacoEditor.IStandaloneEditorConstructionOptions;
}

/**
 * WOD block representation for markdown editor
 */
export interface WodBlock {
  /** Block ID */
  id: string;
  
  /** Line number where block starts */
  startLine: number;
  
  /** Line number where block ends */
  endLine: number;
  
  /** Block content */
  content: string;
  
  /** Whether block is currently focused */
  focused?: boolean;
  
  /** Parsed script if available */
  script?: IScript;
}

/**
 * Token hint for syntax highlighting
 */
export interface WodWikiTokenHint {
  hint: string;
  position: "after" | "before";
  offSet?: number | undefined;
}

/**
 * Token definition for syntax highlighting
 */
export interface WodWikiToken {
  token: string;
  foreground: string;
  fontStyle?: string;
  hints?: WodWikiTokenHint[];
}

/**
 * Re-export exercise index types from providers
 */
export type { ExercisePathIndex, ExercisePathEntry } from './providers';
