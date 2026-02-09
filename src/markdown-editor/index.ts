/**
 * Markdown Editor - Main exports
 */

// Main component
export { MarkdownEditor } from './MarkdownEditor';
export type { MarkdownEditorProps } from './MarkdownEditor';

// Types
export type {
  WodBlock,
  WodBlockState,
  ParseError,
  WorkoutMetricFragment,
  WorkoutResults
} from './types';

// Utilities
export {
  detectWodBlocks,
  findBlockAtLine,
  extractBlockContent
} from './utils/blockDetection';

// Hooks
export { useWodBlocks } from './hooks/useWodBlocks';
export type {
  UseWodBlocksOptions,
  UseWodBlocksResult
} from './hooks/useWodBlocks';

export { useBlockParser } from './hooks/useBlockParser';
export type {
  UseBlockParserOptions,
  UseBlockParserResult
} from './hooks/useBlockParser';

// Components
export { WodBlockManager } from './components/WodBlockManager';
export type { WodBlockManagerProps } from './components/WodBlockManager';

// ContextPanel has been removed - use WorkoutContextPanel from '@/components/workout/WorkoutContextPanel' instead

export { FragmentEditor } from './components/FragmentEditor';
export type { FragmentEditorProps } from './components/FragmentEditor';

// Widgets
export { ReactMonacoWidget } from './widgets/ReactMonacoWidget';
export { ContextOverlay } from './widgets/ContextOverlay';

// Hooks
export { useContextOverlay } from './hooks/useContextOverlay';
export { useBlockEditor } from './hooks/useBlockEditor';
export type { UseBlockEditorOptions, UseBlockEditorReturn } from './hooks/useBlockEditor';
